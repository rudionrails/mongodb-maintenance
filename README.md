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

There are sevaral files available that you may use to either backup for database 
or compact it. Ideally, you will run those from a crontab.

## backup.js

Once you have downloaded the files, you will need to open up the `backup.js` file and 
possibly change the backup settings to your liking. By default, the `backup.js` will 
use rsync to move your files to a designated location. However, there is an example on 
how to tar your database within the `backup.js`.

Execute the script as follows:

```console
mongo script/backup.js
```

If you are running a replica set, the script will not run against the primary node and 
abort automatically. In that case, you need to specify the port of any secondary.

```console
mongo --port 27017 script/backup.js
```


## compact.js

The `compact.js` will attempt to compact every collection in every database of the
current node. The script will ignore the following databases by default: `admin`, `local` 
and `test`. Also, for every database the `system` collection will not be compacted.

Execute the script as follows:

```console
mongo script/compact.js
```

Copyright &copy; 2012 Rudolf Schmidt, released under the MIT license.

