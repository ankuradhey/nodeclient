var io = require('socket.io-client'),
fs = require('fs'),
mysql = require('mysql'),
shell = require('shelljs'),
config = require('./config'),
dir = '/opt/lampp/htdocs',
backupDir = '/opt/lampp/htdocs/',
connectionsArray = [],
JSFtp = require('jsftp'), i = 0, date = new Date(), 
filters = ['encrypt'];
//server connection db
var Ftp = new JSFtp(config.ftp),
AdmZip = require('adm-zip');
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
                    //blocking code
                    backupFiles();
                    
                    //console.log("Downloading started. If downloading was in progress then its not");
                    downloadFile(rows[0].slc_id, rows[0].patch_version, function (err, data) {
                        if(err){
                            socket.emit('error-socket',err);
                        }else{

                            console.log("All files downloaded successfully");    
                        }
                        
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
    setDownloadFlag(data.slc_id, data.patch_version, function (err, data) {
        
        if(err){
            console.log(err.message);
            socket.emit('error-socket',err);
        }else{
	    console.log('download flag set on client side');

            //download flag slc set confirmation code should be there
		//return;
            //download flag slc set confirmation code should be there
            socket.emit('download-flag-slc-set', data);
            //backup files
            backupFiles();
            //now process ftp download
            downloadFile(data.slc_id, data.patch_version ,function (err, data) {
                if(err){
                    socket.emit('error-socket',err);
                }else{
                    console.log('All files downloaded successfully');    
                }
                //downloading finished
                
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


function backupFiles() {
    console.log('inside backup');
    shell.exec('mkdir -p /opt/lampp/htdocs/backup', {
        silent: true
    }).output;

    //traversing all files and make backup of them
    list = fs.readdirSync(dir);
    list.forEach(function (file) {
        if (filters.indexOf(file) > -1) {
            console.log(file);
            shell.exec('cp -fRv ' + dir + '/' + file + ' ../backup/' + file + '.' + date.getDate() + date.getMonth() + date.getYear() + '.bkp').output;
        }
    });

}


function setDownloadFlag(slcId, newVersion, callback) {
    console.log('slc id - ', slcId);
    if (!isNaN(parseInt(slcId))) {
        handleDisconnect();
        // Make the database query
        var query = cloudConnection.query('update slc_list set download_flag = "1", patch_version = '+newVersion+' where slc_id = "' + slcId + '" ', function (err, rows) {
            if (err) {
                console.log("while updating download flag socket closed ");
                callback({message:"Updation Error"},null);
                throw err;
            }
            console.log(rows);
            if (rows.affectedRows > 0) {
                console.log("school patch download flag set");
                callback(null, {message:'School patch download flag set'});
            } else {
                console.log("school patch download flag not set");
                callback({message:"Updation not effected"}, null);
            }
            

            
            cloudConnection.end(function (err) {
                // The connection is terminated now
            });
        });
    } else {
        console.log("Slc id not found");
        callback({message:"slc id not found"}, null);
    }
}


function unsetDownloadFlag(slcId,newVersion, callback) {
    console.log('slc id - ', +slcId);
    if (!isNaN(parseInt(slcId))) {
        handleDisconnect();
        // Make the database query
        var query = cloudConnection.query('update slc_list set download_flag = "0", patch_version = '+newVersion+'  where slc_id = "' + slcId + '" ', function (err, rows) {
            if (err) {
                console.log(" mysql socket connect unexpectedly closed ");
                throw err;
            }

            if (rows.affectedRows > 0) {
                console.log("school patch download flag unset");
                callback(null, {message:"successfully school patch download flag unset"});
            } else {
                console.log("school patch download flag not set");
                callback({message:"school patch download flag not set"}, null);
            }
            
            
            cloudConnection.end(function (err) {
                // The connection is terminated now
            });
        });
    } else {
        console.log("Slc id not found");
        callback({message:"slc id not valid"}, null);
    }
}



function downloadFile(slcId, newVersion, callback) {
    //log time taken to transfer files
    start = new Date().getTime();
    console.log(config.ftp.user, config.ftp.pass)
    /*Ftp.auth(config.ftp.user, config.ftp.pass, function (err, res) 
    {
        if(err){
            console.log("ftp authentication time error ");
            throw err;
        }
    });*/

    handleDisconnect();
    cloudConnection.query('select * from filelist where download_status < "3" and slc_id = ?', slcId ,function (err, rows, fields) {
        console.log('checking files to be downloaded and the slc id is ', slcId);
        if (err) {
            console.log(" mysql socket connect unexpectedly closed ");
            throw err;
        }
        console.log('checking the result of filelist data - ',rows);
        if (!rows.length) {
            console.log("no file available for download");
            unsetDownloadFlag(slcId, newVersion, function (err, data) {
                if(err){
                    callback(err);
                }
                cloudConnection.end(function (err) {
                        // The connection is terminated now
                    });
            });
        }else {

            FtpDownloadRecursively(rows, slcId, newVersion, function (ftpFlag) {
                    //unsetDownloadFlag();
                    console.log("All files downloaded successfully");
                    
                    callback(null,{message:'Successfully downloaded all files'});

                    if(ftpFlag)
                        Ftp.raw.quit(function (err, data) {
                            if (err)
                                throw err;

                            console.log('ftp closed! Bye!!');
                        });
                });
        }
    //        cloudConnection.end(function (err) {
    //            // The connection is terminated now
    //        });
    })
}

var ftpFlag = false;
function FtpDownloadRecursively(Rows, slcId, newVersion, callback) {
    console.log(Rows[i]);
    if (Rows[i]) {

        //check if download status is downloaded
        if(Rows[i].download_status != '2'){
            FtpDownload(Rows[i].filename, slcId, function (filename, err) {

                if(err){
                    FtpDownloadRecursively(Rows, slcId, newVersion, callback);
                }else{
                    //                handleDisconnect();
                    cloudConnection.query('update filelist set download_status = "2" where filename = "' + filename + '" and slc_id = "' + slcId + '" ', function (err, rows, fields) {
                        if (err)
                            throw err;

                        extractFiles(slcId, filename,newVersion);
                            //                    cloudConnection.end(function (err) {
                            //                        // The connection is terminated now
                            //                    });
                        });
                    delete Rows[i];
                    i++;
                    FtpDownloadRecursively(Rows, slcId, newVersion, callback);
                    //});
                }
            });
            ftpFlag = true;
        }else{ //means downloaded so start extracting directly
            extractFiles(slcId, Rows[i].filename, newVersion);
            delete Rows[i];
            i++;
            FtpDownloadRecursively(Rows, slcId, newVersion, callback);
        }
        
    } else {
        callback(ftpFlag);
    }
}


function FtpDownload(filename, slcId, callback) {


//    Ftp.keepAlive(1000000);

//    Ftp.auth('extramarks', 'extra123', function (err, res) 
//    {
//        if(err){
//            console.log("ftp authentication time error ");
//        }

       // handleDisconnect();
cloudConnection.query('update filelist set download_status = "1" where filename = "' + filename + '" and slc_id = "' + slcId + '" ', function (err, results) {

    if (err) {
        console.log(" mysql socket connect unexpectedly closed ");
        throw err;
    }

    console.log("ftp starts");
    console.log('/nodejs/git/' + filename);
    Ftp.get(filename, filename, function (hadErr,ftpSocket) {
        if (hadErr) {
            callback(filename, hadErr)
            console.log('FTP ERROR');
                    //throw hadErr;
                }
                else
                    console.log(" file copied!! " + filename + " hurray!! ");

                callback(filename);
            });

           /* cloudConnection.end(function (err) {
                // The connection is terminated now
            });*/

//        });
});
}


function extractFiles(slcId, filename, newVersion) {
    //unzip downloaded file
    try{
        console.log(filename);
        var zip = new AdmZip('./' + filename);
        zip.extractAllTo("/");
    }catch(e){
        console.log('Caught Exception: ',e,filename);
        throw e;
        
    }

    cloudConnection.query('update filelist set download_status = "3" where filename = "' + filename + '" and slc_id = "' + slcId + '" ', function (err, results) {
        if (err) {
            console.log(" mysql socket connect unexpectedly while extracting files ");
            throw err;
        }
        console.log("File - " + filename + " extracted!!");

        //check all file extracted
        cloudConnection.query(' select * from filelist where  slc_id = ? and download_status != "3" ',slcId, function (err, rows, fields) {
            if (err) {
                console.log("mysql socket unexpectedly closed while checking extracting completed ");
                throw err;
            }
            console.log('start value - ', start);
            if (!rows.length) {
                console.log("no file available for download");
                unsetDownloadFlag(slcId, newVersion, function (err, data) {
                    if(err){
                        socket.emit('error-socket',err);
                    }else{
                        var end = new Date().getTime();
                        var time = end - start;
                        console.log('Execution time: ' + time);
                        socket.emit('patch-download-complete', {'slc_id':slcId,'patch_version':newVersion});
                       /* cloudConnection.end(function (err) {
                            // The connection is terminated now
                        });    */
                    }
                    
                });
            }
        });

    });
}

process.on('uncaughtException', function (err) {
    console.log("uncaughtException");
    console.error(err);
});
