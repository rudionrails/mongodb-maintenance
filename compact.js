/**
 *
 * MongoDB maintenance script to compact all collections in all databases.
 *
 * Copyright (c) 2012, Rudolf Schmidt
 * Released under the MIT license.
 *
 */

function say( m ) {
  var date = new Date(),
      timestamp = date.toLocaleDateString() +" "+ date.toLocaleTimeString();

  print( timestamp +": "+ m );
}

try {

  /**
   * check if we are the master and step down if necessary
   */
  if ( rs.isMaster().ismaster ) {
    say( "[INFO] Connected to PRIMARY, going to step down..." );

    try {
      rs.stepDown();
    } catch( e ) {
      // do nothing
    }

    // After stepdown, connections are droped. Reconnect.
    rs.isMaster();

    // Let's wait for someone else to become the new PRIMARY
    var count = 1;
    while( rs.isMaster().ismaster || !rs.isMaster().primary ) {
      if ( count < 20 ) {
        say( "* No one is promoted to PRIMARY yet, going to sleep and try again..." );

        sleep( 1000 );
        count++;

      } else {
        throw "No-one was promoted to master within "+ count +" tries"

      }
    }

    say( "[INFO] Done." );
  }

  /**
   * Enable to do stuff on the slave
   */
  rs.slaveOk();


  /**
   * Compact from here onwards
   */
  say( "[INFO] Performing compact" );
  var dbNames = db.getMongo().getDBNames(),
      dbRegex = /^(admin|local|test)/,
      colRegex = /^(system)/;

  for( var i=0; i<dbNames.length; i++ ) {
    var dbName = dbNames[i],
        dbInst = db.getSisterDB(dbName);

    if( dbRegex.test(dbName) ) {
      // say( dbName +" (skipped)" );
      continue; // skip
    }

    // } else {
    //   say( dbName );

    // }

    // Iterate all collections on the current db and compact
    try {
      var colNames = dbInst.getCollectionNames();

      for( var j=0; j<colNames.length; j++ ) {
        var colName = colNames[j],
            colInst = dbInst.getCollection(colName);

        if( colRegex.test(colName) ) {
          // say( dbName +"."+ colName +" (skipped)" );
          continue; // skip

        } else {
          say( dbName +"."+ colName );
          say( "\tbefore:\t"+ colInst.stats(1024).size + "MB" );

        }

        try {
          dbInst.runCommand({ compact : colName });
          say( "\tafter:\t"+ colInst.stats(1024).size + "MB" );

        } catch( e ) {
          // print( "[ERROR] "+ e );

        }
      }
    } catch( e ) {
      say( "[ERROR] "+ e )

    }

  }

} catch( e ) {
  say( "[ERROR] " + e );

}
