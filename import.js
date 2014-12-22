/**
 * @file Entry-point script for the TIGER import pipeline.
 */

function importTigerDir( path ){
	console.log( 'Importing: ', path );
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
