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

/**
 * Create a stream of address objects from a TIGER shapefile.
 *
 * @param {string} filePath The path to a TIGER shapefile.
 */
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
/**
 * Explode a TIGER LineString record into its constituent addresses.
 *
 * Interpolates all of the address objects encoded in a TIGER LineString, which
 * are LineStrings with attributes indicating the number of addresses on its
 * left and right sides.
 *
 * @param {Writable stream} stream The stream to write address Documents to.
 * @param {object} record A TIGER record, as read from a shapefile.
 * @param {object} adminValues The names of the administrative regions to which
 *    this file's data belongs, as created by `createAdminValues()`. Used to
 *    assign admin data to address Documents.
 * @param {string} streetSide Either `left` or `right`, indicating along which
 *    side of `record` address locations should be interpolated.
 */
function interpolateAddressRange( stream, record, adminValues, streetSide ){
  var addrRangeKeyLetter = (streetSide == 'left') ? 'L' : 'R';
  var start = parseInt( record.properties[ addrRangeKeyLetter + 'FROMADD' ] );
  var end = parseInt( record.properties[ addrRangeKeyLetter + 'TOADD' ] );

  if( start === null || end === null ){
    return;
  }

  var numAddresses = Math.ceil( Math.abs( end - start + 1 ) / 2 );
  var minAddressesGap = 0.00025; // ~20 meters
  var offset = 0.00010; // ~8 meters
  var interpolatedPoints = lineInterpolatePoints(
    record.geometry.coordinates, numAddresses,
    ( ( streetSide === 'left' ) ? 1 : -1 ) * offset,
    minAddressesGap
  );

  /**
   * Account for a smaller number of interpolated addresses than the projected
   * `numAddresses` amount, which might have been caused by a forced
   * `minGap`.
   */
  var houseNumDelta = numAddresses / interpolatedPoints;

  for( var addr = 0; addr < interpolatedPoints.length; addr++ ){
    var model_id = ( uid++ ).toString();
    var houseNumber = start + (addr * houseNumDelta) * 2 *
      ( start < end ? 1 : -1 );
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

/**
 * Return administrative region names for the given FIPS code.
 *
 * @param {string} fipsCode The 5 character FIPs code as taken from TIGER
 *    filenames. The first two characters and last three characters are state
 *    and county codes respectively.
 *
 * @return {object} An object with a `country` key, and, if `fipsCode` had
 *    a match inside `fipsCodes`, `state` and `county` keys as well. The
 *    corresponding values are the string names of the admin regions at each
 *    level of granularity. eg
 *
 *      {
 *          country: 'United States',
 *          state: 'Alabama',
 *          county: 'Autauga'
 *      }
 */
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
