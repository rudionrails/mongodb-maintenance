/*!
 * MongoDB Backup Script
 *
 * Copyright 2012, Rudolf Schmidt
 * Released under the MIT license.
 *
 * More information: http://github.com/rudionrails/mongodb-maintenance
 */


/**
 * Once you have downloaded this file, you may need to change some of the 
 * backup settings.
 *
 * By default, this script will rsync your files to a designated backup 
 * directory. It will automatically determine the data directory of the 
 * current mongo node.
 *
 * @example Run the script from the shell
 *  mongo backup.js
 *
 * @example run the script against a MongoDb node on a different port
 *  mongo --port 27017 backup.js
 *
 *
 * If you attempt to run it against a replica set primary node, the backup 
 * script will tell you and exit. Running it against a single node will sill 
 * prompt you a warning, but continue to lock the database and backup.
 *
 * @see http://www.mongodb.org/display/DOCS/fsync+Command#fsyncCommand-Lock%2CSnapshotandUnlock
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
   * Get the path to the data files. Change this if it can not be resolved automatically.
   */
  dbPath: db.adminCommand( "getCmdLineOpts" ).parsed.dbpath || "/data/db",

  /**
   * The directory for the backup files. Change this if you want them in a different location.
   */
  backupDir: "/opt/backups/mongodb"
}


/**
 * The following will show some examples for backup strategies. It is important 
 * to have a `snapshot` array defined as this will be the executed command!
 *
 * By default, rsync is used.
 *
 * @example Tar the data
 *    var date      = new Date(),
 *        timestamp = [ date.getFullYear(), 
 *                      ('0'+(date.getMonth()+1)).slice(-2), 
 *                      ('0'+date.getDate()).slice(-2) ].join(""),
 *        tarfile   = [ settings.backupDir, "mongodb-backup-"+ timestamp +".tar.gz" ].join( "/" ), 
 *        snapshot  = ["tar", "-czvf", tarfile, settings.dbPath];
 *
 * @example Rsync the data
 *    var snapshot  = ["rsync", "-avz", "--delete", settings.dbPath, settings.backupDir];
 */
var snapshot  = ["rsync", "-avz", "--delete", settings.dbPath, settings.backupDir];


/**
 * The actual execution begins here.
 */
try {
  /**
   * Perform some pre-checks
   */
  if ( rs.status().ok == 0 ) {
    say( "[WARN] There seems to be no replica set configured. Continuing anyways." );

  } else if ( rs.isMaster().ismaster ) {
      throw "Connected to replica set PRIMARY. Not going to perform a backup."

  }

  // If some other process has already locked it, then don't continue.
  if ( db.currentOp().fsyncLock == 1 ) {
    throw "Database is already locked. Not going to perform backup."

  }

  /**
   * When pre-checks are good, we can do the real backup: rsync data and lock the node.
   */
  say( "[INFO] Flushing data and locking for snapshot" );
  var lock = db.adminCommand({ fsync:1, lock:1 });

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
    db.getSiblingDB("admin").$cmd.sys.unlock.findOne()

  }

  /**
   * Just to see how long it took altogether.
   */
  say( "[INFO] Done." );

} catch( e ) {
  say( "[ERROR] "+ e );

}

