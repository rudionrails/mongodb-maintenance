```
 _______                           _____  ______
|   |   |.-----.-----.-----.-----.|     \|   __ \
|       ||  _  |     |  _  |  _  ||  --  |   __ <
|__|_|__||_____|__|__|___  |_____||_____/|______/
                     |_____|
           _______         __         __
          |   |   |.---.-.|__|.-----.|  |_.-----.-----.---.-.-----.----.-----.
          |       ||  _  ||  ||     ||   _|  -__|     |  _  |     |  __|  -__|
          |__|_|__||___._||__||__|__||____|_____|__|__|___._|__|__|____|_____|
```

This is a compilation of useful maintenance scripts for [MongoDb](http://mongodb.org).

There are several files available to better maintain the state of your database. Ideally, 
you will want to run them preiodically in the crontab.

## script/backup.js

By default, `backup.js` will use rsync to move your files to  `/opt/backups/mongodb`. If 
you decide to change the backup location, then you need to open `script/backup.js` and 
change the the value manually. The backup will determine the data location of your files 
automatically, either from the passed options to the mongod process or take the default 
`/data/db` location.

```console
mongo script/backup.js

# MongoDB shell version: 2.0.2
# connecting to: test
# 06/27/2012 20:30:47: [INFO] Flushing data and locking for snapshot
# 06/27/2012 20:30:47: [INFO] Performing snapshot
# shell: started program rsync -avz --delete /data/db /opt/backups/mongodb
# sh6781| building file list ... done
# sh6781| db/
# sh6781| ...
# sh6781| sent 8405239 bytes  received 428 bytes  169811.45 bytes/sec
# sh6781| total size is 2483027973  speedup is 295.40
# 06/27/2012 20:31:36: [INFO] Releasing the lock
# 06/27/2012 20:31:36: [INFO] Done.
```

If you are running a replica set, the script will not run on the primary node and 
abort automatically. In that case, you need to specify the port of any secondary. Again, 
it will continue on a single MongoDB node, but it will promt a warning.

```console
mongo --port 27017 script/backup.js
```

Also, if you want to `tar.gz` the data files, you can find an example within 
`script/backup.js`. 


## script/compact.js

The `compact.js` will attempt to compact every collection in every database of the
current node. The script will ignore the following administrative databases by default: 
`admin`, `local` and `test`. Also, for every database, any collection starting with 
`system` will **not** be compacted.

Execute the script as follows:

```console
mongo script/compact.js 

# MongoDB shell version: 2.0.2
# connecting to: test
# 06/27/2012 20:59:38: [WARN] There seems to be no replica set configured. Continuing anyways.
# 06/27/2012 20:59:38: [INFO] Performing compact
# 06/27/2012 20:59:38: graylog2
# 06/27/2012 20:59:38:  - blacklists
# 06/27/2012 20:59:38:  - filtered_terms
# 06/27/2012 20:59:38:  - hosts
# 06/27/2012 20:59:38:  - jobs
# 06/27/2012 20:59:38:  - message_counts
# 06/27/2012 20:59:38:  - messagecomments
# 06/27/2012 20:59:38:  - server_values
# 06/27/2012 20:59:38:  - settings
# 06/27/2012 20:59:38:  - streamcategories
# 06/27/2012 20:59:38:  - streams
# 06/27/2012 20:59:38:  - system.indexes (skipped)
# 06/27/2012 20:59:38:  - users
# 06/27/2012 20:59:38: admin (skipped)
# 06/27/2012 20:59:38: local (skipped)
# 06/27/2012 20:59:38: [INFO] Done.
```

If you run compact against a replica set primary node, it will attempt a `rs.stepDown()`. 
Once a new primary has been elelcted, it will continue compacting. If you experience 
timeouts, then you can change some settings within the `compact.js`.

Copyright &copy; 2012 Rudolf Schmidt, released under the MIT license.

