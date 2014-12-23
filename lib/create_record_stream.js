/**
 * @file Contains functions for extracting addresses from raw TIGER shapefiles.
 */

'use strict';

var path = require( 'path' );
var through = require( 'through2' );

var shapefileStream = require( 'shapefile-stream' );
var lineInterpolatePoints = require( 'line-interpolate-points' );
var peliasModel = require( 'pelias-model' );
var fipsCodes = require( '../fips_codes.json' );

function createRecordStream( filePath ){
  var baseName = path.basename(filePath, ".csv");
  var fipsCode = baseName.split( '_' )[ 2 ];
  var adminValues = createAdminValues( fipsCode );

  var addressInterpolator = through.obj( function write( obj, enc, next ){
    var stream = this;
    interpolateAddressRange( this, obj, adminValues, 'left' );
    interpolateAddressRange( this, obj, adminValues, 'right' );
    next();
  });

  return shapefileStream.createReadStream( filePath )
    .pipe( addressInterpolator );
}

var uid = 0;
function interpolateAddressRange( stream, record, adminValues, streetSide ){
  var addrRangeKeyLetter = (streetSide == 'left') ? 'L' : 'R';
  var start = parseInt( record.properties[ addrRangeKeyLetter + 'FROMADD' ] );
  var end = parseInt( record.properties[ addrRangeKeyLetter + 'TOADD' ] );

  if( start === null || end === null ){
    return;
  }

  var numAddresses = Math.ceil( Math.abs( end - start + 1 ) / 2 );
  var offset = 0.00015; // a few meters
  var interpolatedPoints = lineInterpolatePoints(
    record.geometry.coordinates, numAddresses,
    ( ( streetSide === 'left' ) ? 1 : -1 ) * offset
  );
  for( var addr = 0; addr < numAddresses; addr++ ){
    var model_id = ( uid++ ).toString();
    var houseNumber = start + addr * 2 * ( start < end ? 1 : -1 );
    var addrDoc = new peliasModel.Document( 'tiger', model_id )
      .setName( 'default', houseNumber + ' ' +  record.properties.FULLNAME)
      .setAdmin( 'admin0', adminValues.country )
      .setAdmin( 'admin1', adminValues.state )
      .setAdmin( 'admin2', adminValues.county )
      .setCentroid({
        lat: interpolatedPoints[ addr ][ 1 ],
        lon: interpolatedPoints[ addr ][ 0 ]
      });
    stream.push( addrDoc );
  }
}

function createAdminValues( fipsCode ){
  var adminValues = fipsCodes[ fipsCode ];
  if( adminValues === undefined ){
    adminValues = {};
  }
  adminValues.country = 'United States';
  return adminValues;
}

module.exports = {
  create: createRecordStream,
  createAdminValues: createAdminValues
};
