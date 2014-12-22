/**
 * @file Entry-point script for the TIGER import pipeline.
 */

var through = require( 'through2' );
var peliasDbclient = require( 'pelias-dbclient' );
var peliasSuggesterPipeline = require( 'pelias-suggester-pipeline' );
var shapefileStream = require( 'shapefile-stream' );

function createRecordStream( filePath ){
  return shapefileStream.createReadStream( filePath );
}

function importTigerDir( dirPath ){
  var recordStream = combinedStream.create();
  fs.readdirSync( dirPath ).forEach( function forEach( filePath ){
    if( filePath.match( /.shp/ ) ){
      console.error( 'Creating read stream for: ' + filePath );
      var fullPath = dirPath.join( dirPath, filePath );
      recordStream.append( function ( next ){
        next( createRecordStream( fullPath ) );
      });
    }
  });
  recordStream.pipe( createPeliasElasticsearchPipeline() );
}

/**
 * Create the Pelias elasticsearch import pipeline.
 *
 * @return {Writable stream} The pipeline entrypoint; Document records should
 *    be written to it.
 */
function createPeliasElasticsearchPipeline(){
  var dbclientMapper = through.obj( function( model, enc, next ){
    this.push({
      _index: 'pelias',
      _type: model.getType(),
      _id: model.getId(),
      data: model
    });
    next();
  });

  var entryPoint = peliasSuggesterPipeline.pipeline;
  entryPoint
    .pipe( dbclientMapper )
    .pipe( peliasDbclient() );
  return entryPoint;
}

/**
 * Handle the command-line arguments passed to the script.
 */
function handleUserArgs( argv ){
  var usageMessage = 'TODO: usage message.';
  if( argv.length !== 1 ){
    console.error( usageMessage );
    process.exit( 1 );
  }
  else {
    importTigerDir( argv[ 0 ] );
  }
}

handleUserArgs( process.argv.slice( 2 ) );
