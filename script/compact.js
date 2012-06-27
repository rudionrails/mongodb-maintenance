/*!
 * MongoDB Backup Script
 *
 * Copyright 2012, Rudolf Schmidt
 * Released under the MIT license.
 *
 * More information: http://github.com/rudionrails/mongodb-maintenance
 */


/**
 * Misc function to pretty print messages to stdout
 */
function say( m ) {
  var date = new Date(),
      timestamp = date.toLocaleDateString() +" "+ date.toLocaleTimeString();

  print( timestamp +": "+ m );
}

/**
 * The following variables are used to exclude databases/collections from being compacted.
 */
var dbRegex = /^(admin|local|test)/,
    colRegex = /^(system)/;

/**
 * The actual execution begins here.
 */
try {

  /**
   * perform some pre-checks
   */
  if ( rs.status().ok == 0 ) {
    say( "[WARN] There seems to be no replica set configured. Continuing anyways." );

  } else {
    /*
     * Check if current node is the replica set primary and step down if necessary
     */
    if ( rs.isMaster().ismaster ) {
      say( "[INFO] Connected to PRIMARY, going to step down..." );

      /**
       * perform primary step-down
       */
      try {
        rs.stepDown();
      } catch( e ) {
        // do nothing
      }

      /**
       * After stepdown, connections are droped. Issue a command to reconnect.
       */
      rs.isMaster();

      /**
       * It can take several seconds to promote a new primary. In some cases it
       * may never happen, then we exit.
       */
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
     * Enable to do stuff on the secondary
     */
    rs.slaveOk();

  }


  /**
   * Compact from here onwards
   */
  say( "[INFO] Performing compact" );


  /**
   * Iterate all databases
   */
  var dbNames = db.getMongo().getDBNames();

  for( var i=0; i<dbNames.length; i++ ) {
    var dbName    = dbNames[i],
        dbInst    = db.getSisterDB(dbName),
        colNames  = dbInst.getCollectionNames();

    /**
     * Check if we want to skip the database or continue.
     */
    if( dbRegex.test(dbName) ) {
      say( dbName +" (skipped)" );
      continue; // skip

    } else {
      say( dbName );

    }

    /**
     * Iterate all collections on the current db and compact
     */
    for( var j=0; j<colNames.length; j++ ) {
      var colName = colNames[j],
          colInst = dbInst.getCollection(colName);

      /**
       * Check if we want to skip the collection or continue.
       */
      if( colRegex.test(colName) ) {
        say( "\t- "+ colName +" (skipped)" );
        continue; // skip

      } else {
        say( "\t- "+ colName );

      }

      /**
       * Perform compaction on current collection
       */
      try {
        var compact = dbInst.runCommand({ compact : colName });

        // something went wrong
        if ( compact.ok == 0 ) {
          throw "Compaction of "+ colName +" resulted in an error: "+ compact.toSource()

        }

        /**
         * After compaction, the node goes into recovery, so we need to wait for 
         * it to return to normal.
         */
        var count = 1;
        while( !rs.isMaster().secondary ) {
          if ( count < 20 ) {
            sleep( 1000 );
            count++;

          } else {
            throw "Timed out waiting to return from recovery after "+ count +" tries"

          }
        }

      } catch( e ) {
        say( "[ERROR] "+ e );

      }
    }

  }

} catch( e ) {
  say( "[ERROR] " + e );

}

