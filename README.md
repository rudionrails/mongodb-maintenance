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


## Usage

There are sevaral files available that you may use to either backup for database 
or compact it.

### backup.js

Once you have downloaded the files, you will need to open up the `backup.js` file and 
possible change the backup settings to your liking.

By default, the `backup.js` will use rsync to move your files to a designated location.

```console
mongo backup.js
```

If you are running a replica set, the script will not run against the primary node and 
abort automatically.

```console
mongo --port 27017 backup.js
```


### compact.js

To be documented


Copyright &copy; 2012 Rudolf Schmidt, released under the MIT license.

