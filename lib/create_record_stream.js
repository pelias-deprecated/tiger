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

var uid = 0;
function createRecordStream( filePath ){
  var baseName = path.basename(filePath, ".csv");
  var fipsCode = baseName.split( '_' )[ 2 ];
  var adminValues = createAdminValues( fipsCode );

  var addressInterpolator = through.obj( function write( obj, enc, next ){
    var stream = this;

    /**
     * Interpolates addresses along one address range of the current TIGER
     * line. The address coordinates are offset a small distance (direction
     * depending on `streetSide`), and the line's attributes are normalized
     * into an Address object. Each one is pushed downstream.
     *
     * @param {number} start The starting address number.
     * @param {number} start The ending address number.
     * @param {string} streetSide Either 'left' or 'right'; the actual
     *      geographic location that the points lie on with respect to the
     *      street is dependent on the orientation of the line string
     *      (left/right are evaluated as if one were walking along the line,
     *      from start to end).
     */
    function interpolateAddressRange( start, end, streetSide ){
      if( start === null || end === null ){
        return;
      }

      var numAddresses = Math.ceil( Math.abs( end - start + 1 ) / 2 );
      var offset = 0.00015; // a few meters
      var interpolatedPoints = lineInterpolatePoints(
        obj.geometry.coordinates, numAddresses,
        ( ( streetSide === 'left' ) ? 1 : -1 ) * offset
      );
      for( var addr = 0; addr < numAddresses; addr++ ){
        var model_id = ( uid++ ).toString();
        var houseNumber = start + addr * 2 * ( start < end ? 1 : -1 );
        var addrDoc = new peliasModel.Document( 'tiger', model_id )
          .setName( 'default', houseNumber + ' ' +  obj.properties.FULLNAME)
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

    interpolateAddressRange(
      parseInt( obj.properties.LFROMADD ), parseInt( obj.properties.LTOADD ),
      'left'
    );
    interpolateAddressRange(
      parseInt( obj.properties.RFROMADD ), parseInt( obj.properties.RTOADD ),
      'right'
    );
    next();
  });

  return shapefileStream.createReadStream( filePath )
    .pipe( addressInterpolator );
}

function createAdminValues( fipsCode ){
  var adminValues = fipsCodes[ fipsCode ];
  adminValues.country = 'United States';
  return adminValues;
}

module.exports = {
  create: createRecordStream,
  createAdminValues: createAdminValues
};
