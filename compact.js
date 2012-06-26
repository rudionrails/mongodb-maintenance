/**
 *
 * MongoDB maintenance script to compact all collections in all databases.
 *
 * Copyright (c) 2012, Rudolf Schmidt
 * Released under the MIT license.
 *
 */

try {

  /**
   * check if we are the master and step down if necessary
   */
  if ( rs.isMaster().ismaster ) {
    print( "[INFO] Connected to PRIMARY, going to step down..." );
    rs.stepDown();

    // After stepdown, connections are droped. Reconnect.
    rs.isMaster();

    // Let's wait for someone else to become the new PRIMARY
    var count = 1;
    while( rs.isMaster().ismaster || !rs.isMaster().primary ) {
      if ( count < 20 ) {
        print( "* No-one else is promoted to PRIMARY yet, going to sleep and try again..." );
        sleep( 1000 ); // second

        count++;
      } else {
        throw "No-one was promoted to master within "+ count +" tries"
      }
    }
  }

  // enable to do stuff on the slave
  // rs.slaveOk();

  /**
   * Compact from here onwards
   */
  print( "[INFO] Performing compact:" );
  // db.getSisterDB( "databse-name" )[ "collection-name" ].runCommand( "compact" )

  var dRegex = /^(admin|local|test)/,
      cRegex = /^(system)/,
      dNames = db.getMongo().getDBNames();

  for( i in dNames ) {
    var dName = dNames[i],
        d     = db.getSisterDB( dName );

    if( dRegex.test(dName) ) continue; // skip

    print( "  "+ dName );

    // iterate all collections on the current db and compact
    try {
      var cNames = d.getCollectionNames();

      for( j in cNames ) {
        var cName = cNames[j];

        if( cRegex.test(cName) ) continue; // skip

        print( "  - "+ cName );

        // d.runCommand({ compact : cName, slaveOk : true });
        d.runCommand({ compact : cName, slaveOk : true });
        // d.runCommand({ compact : cName, slaveOk : true });
      }
    } catch( e ) {
      print( "[ERROR]"+ e )
    }
  }


} catch( e ) {
  print( "[ERROR] " + e );

}
