/**
 *
 * MongoDB Backup Script
 *
 * Copyright (c) 2012, Rudolf Schmidt
 * Released under the MIT license.
 *
 */


/**
 * Switch to the admin db and get the dbpath (usually
 * passed as argument to he mongod process)
 */
var adminDb = db.getSisterDB( "admin" ),
    dbPath  = adminDb.runCommand( "getCmdLineOpts" ).parsed.dbpath || "/data/db";

/**
 * This file is executed when copying files for the snapshot.
 *
 * If you are using another script or want to run it from a different 
 * locatin, please change it.
 *
 * @example Tar the data
 * var date      = new Date(),
 *     timestamp = [date.getFullYear(), ('0'+(date.getMonth()+1)).slice(-2), ('0'+date.getDate()).slice(-2)].join(""),
 *     tarfile   = "mongodb-backup-"+ timestamp +".tar.gz", 
 *     snapshot  = ["tar", "-czvf", tarfile, dbPath];
 *
 * @example Rsync the data
 *  var snapshot = ["rsync", "-avz", "--delete", dbPath, "/mnt/backups/mongodb"];
 */

var backupDir = "/opt/backups/mongodb", 
    snapshot  = ["rsync", "-avz", "--delete", dbPath, backupDir];


function say( m ) {
  var date = new Date(),
      timestamp = date.toLocaleDateString() +" "+ date.toLocaleTimeString();

  print( timestamp +": "+ m );
}

try {
  /**
   * Some pre-checks
   */
  if ( rs.status().ok == 0 ) {
    say( "[WARN] There seems to be no replica set configured. Continuing anyways." );

  } else if ( rs.isMaster().ismaster ) {
      throw "Connected to PRIMARY. Not going to perform a backup."

  }

  if ( db.currentOp().fsyncLock == 1 ) {
    throw "Database is already locked. Not going to perform backup."

  }

  /**
   * Actual Backup
   */
  try {
    // TODO: get profiling level and disable if necessary --R

    say( "[INFO] Flushing data and locking for snapshot" );
    var lock = adminDb.runCommand({ fsync:1, lock:1 });

    if ( lock.ok == 0 ) {
      throw "Could not obtain lock: "+ lock.toSource();
    }

    // execute the snapshot script
    say( "[INFO] Performing snapshot" );
    runProgram.apply( null, snapshot );

  } catch( e ) {
    say( "[ERROR] "+ e );

  } finally {
    say( "[INFO] Releasing the lock" );
    adminDb.$cmd.sys.unlock.findOne();

  }
} catch( e ) {
  say( "[ERROR] "+ e );

}
