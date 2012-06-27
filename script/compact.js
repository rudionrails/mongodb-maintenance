/*!
 * MongoDB Compact Script
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
 * Settings, what else...
 */
var settings = {

  /**
   * Used to exclude administrative databases from being compacted
   */
  dbRegex: /^(admin|local|test)/,

  /**
   * Used to exclude administrative collections from being compacted
   */
  colRegex: /^(system)/,

  /**
   * This variable applies when you are running a replica set. The value determines
   * the time to wait for the script when a stepDown on the primary node is issued. 
   * Upon stepDown, the replica set will go into recovery state until a new primary 
   * has been promoted. This may take a while and 20 seconds should be sufficient by 
   * default. If not, please change the value.
   */
  stepDownRecoveryDelay: 20,

  /**
   * This variable defines the maximum timeout the script will wait after every 
   * compaction. After compacting a collection, the node will go into recovery and it 
   * may take a while for it to return as secondary. It may take longer than the default
   * 20 seconds (perhaps on really large collections). In that case, increate the value.
   */
  compactRecoveryDelay: 20
}

/**
 * The actual execution begins here.
 */
try {

  /**
   * Perform some pre-checks
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
      var count = 0;
      say( "[INFO] Waiting for recovery..." );
      while( rs.isMaster().ismaster || !rs.isMaster().primary ) {
        if ( count < settings.stepDownRecoveryDelay ) {
          sleep( 1000 );
          count++;

        } else {
          throw "No-one was promoted to master within "+ count +" seconds"

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
    if( settings.dbRegex.test(dbName) ) {
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
      if( settings.colRegex.test(colName) ) {
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
        var count = 0;
        while( !rs.isMaster().secondary ) {
          if ( count < settings.compactRecoveryDelay ) {
            sleep( 1000 );
            count++;

          } else {
            throw "Timed out waiting to return from recovery after "+ count +" seconds"

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

