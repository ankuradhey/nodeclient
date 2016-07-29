var io = require('socket.io-client'),
fs = require('fs'),
config = require('./config'),
dir = '/opt/lampp/htdocs',
backupDir = '/opt/lampp/htdocs/',
connectionsArray = [],
JSFtp = require('jsftp'), i = 0, date = new Date(), 
fileOperate = require('../fileOperator'),
slcModel = require('models/slcModel');
//server connection db
var Ftp = new JSFtp(config.ftp);
//log time taken to transfer files
start = 0;

socket = io.connect(config.socketServer);

function handleDisconnect() {
    cloudConnection = mysql.createConnection(config.database);

    cloudConnection.connect(function (err) {
        if (err) {
            console.log("mysql socket unexpectedly closed ");
            setTimeout(handleDisconnect, 2000);
        }
        console.log("socket connected");
    });

    cloudConnection.on('error', function (err) {
        console.log('db error', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
            handleDisconnect();                         // lost due to either server restart, or a
        } else {                                      // connnection idle timeout (the wait_timeout
            throw err;                                  // server variable configures this)
        }
    });

}

socket.on('connect', function (data) {
    //If there is an error connecting to the server database
    handleDisconnect();

    cloudConnection.query('select * from slc_list where slc_id = 1', function (err, rows, fields) {
        if (err) {
            console.log(" mysql socket connect unexpectedly closed ");
            throw err;
        }

        if (rows) {
            //after getting slc information - socket connection

            // create a new websocket connection to keep the content updated without any AJAX request
            console.log("Socket with slc id - " + rows[0].slc_id + " connected! ");

            //transfer client slc id and other related information
            var clientdata = {
                'slcId': rows[0].slc_id,
                'patch_version':rows[0].patch_version
            };

            socket.emit('newsocket-info', clientdata);
            socket.on('newsocket-info-handshake', function(){
                console.log(rows);
                //check whether downloading should start
                if (rows[0].download_flag == '1') {
                    //take backup of files
                    
                    async.waterfall([
                                function(next){
                                    next(null, data.slc_id, data.patch_version);
                                },
                                fileOperate.backupFiles,
                                filelistModel.getDownloadableFiles,
                                fileOperate.downloadFiles
                            ], function(err, result){
                                if(err)
                                    socket.emit('error-socket',err);
                                else
                                    socket.emit('patch-download-complete', clientdata);
                            });
                }    
        });

            

        }
    });
});

socket.on('disconnect', function (socket) {
    console.log('socket disconnected! bye!');
})
//new version download available
socket.on('new-version-available', function (data) {
    console.log("new version available for download", data.slc_id);
    //downloading starting - so set the download flag
    slcModel.setDownloadFlag(data.slc_id, data.patch_version, foundnction (err, data) {
        if(err){
            console.log(err.message);
            socket.emit('error-socket',err);
            throw err;
        }else{
           console.log('download flag set on client side');
            //download flag slc set confirmation code should be there
    		//return;
            //download flag slc set confirmation code should be there
            socket.emit('download-flag-slc-set', {slc_id:data.slc_id, patch_version:data.patch_version});
            //backup files
            async.waterfall([
                                function(next){
                                    next(null, data.slc_id, data.patch_version);
                                },
                                fileOperate.backupFiles,
                                filelistModel.getDownloadableFiles,
                                fileOperate.downloadFiles
                            ], function(err, result){
                                if(err)
                                    socket.emit('error-socket',err);
                                else
                                    socket.emit('patch-download-complete', {slc_id:data.slc_id, patch_version:data.patch_version});
                            });
            
            
        }

        
    });

});

socket.on('timeout', function (data) {
    console.log('ankit - socket timeout error');
});

socket.on('error', function (data) {
    console.log('socket connection unexpectedly closed', data)
});
//downloadFile();


process.on('uncaughtException', function (err) {
    console.log("uncaughtException");
    console.error(err);
});
