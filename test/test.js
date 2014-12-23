/**
 * @file The main entry point for the TIGER importer's unit-tests.
 */

'use strict';

var tape = require( 'tape' );
var createRecordStream = require( '../lib/create_record_stream' );

tape( 'createRecordStream.create(): ', function ( test ){
  test.end(  );
});

tape( 'createRecordStream.createAdminValues(): ', function ( test ){
  var testCases = {
    '01001': {
      country: 'United States',
      state: 'Alabama',
      county: 'Autauga'
    },
    '36061': {
      country: 'United States',
      state: 'New York',
      county: 'New York'
    },
    '23001': {
      country: 'United States',
      state: 'Maine',
      county: 'Androscoggin'
    }
  };

  test.plan( Object.keys( testCases ).length );
  for( var arg in testCases ){
    var actual = createRecordStream.createAdminValues( arg );
    test.deepEqual( actual, testCases[ arg ] );
  }
});
