/*!
 * MongoDB Backup Script
 *
 * Copyright 2012, Rudolf Schmidt
 * Released under the MIT license.
 *
 * More information: http://github.com/rudionrails/mongodb-maintenance
 */

/**
 * Once you have downloaded this file, you may need to change some of the backup settings.
 *
 * By default, this script will rsync your files to a designated backup directory. It will automatically 
 * determine the data directory of the current mongo node.
 *
 * @example Run the script from the shell
 *  mongo backup.js
 *
 * @example run the script against a MongoDb node on a different port
 *  mongo --port 27017 backup.js
 *
 *
 * If you attempt to run it against a replica set primary node, the backup script will tell you and exit. Running 
 * it against a single node will sill prompt you a warning, but continue to lock the database and backup.
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
 * Track time
 */
var date = new Date();


/**
 * Switch to the admin db and get the dbpath (usually passed as argument to he mongod process).
 */
var adminDb = db.getSisterDB( "admin" ),
    dbPath  = adminDb.runCommand( "getCmdLineOpts" ).parsed.dbpath || "/data/db";

/**
 * The following will show some examples for backup strategies. It is important to have a `snapshot` array
 * defined as this will be the executed command!
 *
 * By default, rsync is used.
 *
 * @example Tar the data
 *    var date      = new Date(),
 *        timestamp = [date.getFullYear(), ('0'+(date.getMonth()+1)).slice(-2), ('0'+date.getDate()).slice(-2)].join(""),
 *        tarfile   = "mongodb-backup-"+ timestamp +".tar.gz", 
 *        snapshot  = ["tar", "-czvf", tarfile, dbPath];
 *
 * @example Rsync the data
 *    var backupDir = "/opt/backups/mongodb",
 *        snapshot  = ["rsync", "-avz", "--delete", dbPath, backupDir];
 */
var backupDir = "/opt/backups/mongodb", 
    snapshot  = ["rsync", "-avz", "--delete", dbPath, backupDir];


/**
 * The actual execution begins here.
 */
try {
  /**
   * perform some pre-checks
   */
  if ( rs.status().ok == 0 ) {
    say( "[WARN] There seems to be no replica set configured. Continuing anyways." );

  } else if ( rs.isMaster().ismaster ) {
      throw "Connected to replica set PRIMARY. Not going to perform a backup."

  }

  if ( db.currentOp().fsyncLock == 1 ) {
    throw "Database is already locked. Not going to perform backup."

  }

  /**
   * When pre-checks are good, we can do the real backup: rsync data and lock the node.
   *
   * @see http://www.mongodb.org/display/DOCS/fsync+Command#fsyncCommand-Lock%2CSnapshotandUnlock
   */
  say( "[INFO] Flushing data and locking for snapshot" );
  var lock = adminDb.runCommand({ fsync:1, lock:1 });

  /**
   * When no lock acquired, prompt and exit. Something has already 
   * locked the DB and we don't want to interfere.
   */
  if ( lock.ok == 0 ) {
    throw "Could not obtain lock: "+ lock.toSource();

  }

  try {
    /**
     * Execute the snapshot script
     */
    say( "[INFO] Performing snapshot" );
    runProgram.apply( null, snapshot );

  } catch( e ) {
    say( "[ERROR] "+ e );

  } finally {
    /**
     * Make sure the lock is released in any case.
     */
    say( "[INFO] Releasing the lock" );
    adminDb.$cmd.sys.unlock.findOne();

  }

  /**
   * Just to see how long it took altogether.
   */
  say( "[INFO] Done." );

} catch( e ) {
  say( "[ERROR] "+ e );

}

