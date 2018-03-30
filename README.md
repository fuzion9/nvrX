# Nvrx
A Network Video Recording system for almost all IP Cameras.  

# Requirements
* Linux/Windows
* ffmpeg 3.4 or higher
* MongoDB 3 or higher
* nodejs 8.10.0 or higher
* @angular/cli 1.7 or higher (globally installed: npm install @angular/cli@latest)


# Linux (Ubuntu) Installation and Configuration
* Install curl if not already installed
    * sudo apt install curl

* Install ffmpeg
    * sudo add-apt-repository ppa:jonathonf/ffmpeg-3  (this is only required if running Ubuntu 18+)
    * sudo apt install ffmpeg libav-tools x264 x265
  
* Install Build Essentials & other system dependencies
    * sudo apt install libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev build-essential g++
  
* Install GIT
    * apt install git

* Install MongoDB
    * https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/

* Install NodeJS
    * curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
    * sudo apt update
    * sudo apt install -y nodejs
  
* Create a directory to store your recordings

* Decide where you want to install nvrX, optionally create a user to run nvrX under.
    * for the purposes of this document, we will assume you are installing into your home folder
    * cd to your home folder

* Clone this repository (from within your home folder, or wherever you decide to put it), a folder inside this folder will be created called nvrx when you run Clone
    * git clone https://fuzion9@bitbucket.org/fuzion9/nvrx.git
    * cd nvrx (enter the newly created directory)

* Install Dependencies for nvrx (make sure your in the newly cloned directory)
    * sudo npm install -g @angular/cli@latest
    * npm install

* Build the front end of the website
    * ng build --prod
  
* Configure mongo database path for nvrX 
    * in the nvrx directory, modify the file server/conf/config.js (nano server/conf/config.js)
    * the default url for the database is mongodb://localhost:27017/nvrX
        * localhost is the machine mongodb runs on
    	* 27017 is the port mongoDB is listening on, 27017 is the default port, no need to change this unless you have customized your mongo install
    	* nvrX is the database name to use

* Run nvrX
    * from within the nvrx folder, run: 
        * env=production node server/bin/www
    * the line above sets the required environment variable 'env' to production, if using a process manager, this environment variable must also be set using whatever mechanism your process manager uses.

* Optionally install a process manager and configure it launch your node process such as:
    * PM2
    * forever

* Configuration
    * The default username is: admin@mynvrx.com
    * The default password is: admin
    * There is currently no way to configure users without 
    * After you startup nvrX, the first thing you will want to do is click on the gear icon in the top right corner and make sure the path to your ffmpeg tools is set correctly.  If it is not, set it correctly and restart nvrX

# Windows Installation and Configuration



# Todo

* Create UI For PTZ Configuration
* Schedule Housekeeping Operations
* Create user Manager
* Fix a problem where things just stop working when token expires (2 hours).  Workaround, refresh the page.
* Fix a problem where monitor (camera) is not visible after adding a new one.  Workaround, refresh page.
* Fix a problem where some monitor configuration changes are not reflected in the UI.  Workaround, refresh page.


