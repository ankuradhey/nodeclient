var io = require('socket.io-client'),
        fs = require('fs'),
        mysql = require('mysql'),
        connectionsArray = [],
        JSFtp = require('jsftp');
//server connection db


socket = io.connect('http://10.1.17.94:8000');

function handleDisconnect() {
    cloudConnection = mysql.createConnection({
        host: '10.1.17.94',
        user: 'root',
        password: '',
        database: 'patch',
        port: 3306
    });

    cloudConnection.connect(function (err) {
        if (err) {
            console.log("mysql socket unexpectedly closed ");
            setTimeout(handleDisconnect, 2000);
        }

    });

}

//If there is an error connecting to the server database
handleDisconnect();

socket.on('connect', function (data) {
    cloudConnection.query('select * from slc_patch where slc_id = 1', function (err, rows, fields) {
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
                'slcId': rows[0].slc_id
            };
            socket.emit('newsocket-info', clientdata)


            //check whether downloading should start
            if (rows[0].download_flag == '1') {
                //console.log("Downloading started. If downloading was in progress then its not")
                downloadFile(rows[0].slc_id, function () {
                    console.log("All files downloaded successfully");
                });
            }

        }
    });
});

socket.on('disconnect', function (socket) {
    console.log('socket disconnected! bye!');
})
//new version download available
socket.on('new-version-available', function (data) {
    console.log("new version available for download", data.slc_id);
    setDownloadFlag(data.slc_id, function () {
        console.log("download flag set!!");
        socket.emit('download-flag-slc-set', data);

        //now process ftp download
        downloadFile(data.slc_id, function () {
            //downloading finished
            console.log('All files downloaded successfully');
        });
    });

});

socket.on('timeout', function (data) {
    console.log('ankit - socket timeout error');
});
//downloadFile();

function setDownloadFlag(slcId, callback) {
    console.log('slc id - ', +slcId);
    if (!isNaN(parseInt(slcId))) {
        // Make the database query
        var query = cloudConnection.query('update slc_patch set download_flag = "1" where slc_id = "' + slcId + '" ', function (err, rows) {
            if (err) {
                console.log("while updating download flag socket closed ");
                throw err;
            }

            if (rows.changedRows > 0) {
                console.log("school patch download flag set");
            } else {
                console.log("school patch download flag not set");
            }
            console.log(rows.changedRows);

            callback();
        });
    } else {
        console.log("Slc id not found");
    }
}

cloudConnection.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
      handleDisconnect();                         // lost due to either server restart, or a
    } else {                                      // connnection idle timeout (the wait_timeout
      throw err;                                  // server variable configures this)
    }
  });

function unsetDownloadFlag(slcId, callback) {
    console.log('slc id - ', +slcId);
    if (!isNaN(parseInt(slcId))) {
        // Make the database query
        var query = cloudConnection.query('update slc_patch set download_flag = "0" where slc_id = "' + slcId + '" ', function (err, rows) {
            if (err) {
                console.log(" mysql socket connect unexpectedly closed ");
                throw err;
            }

            if (rows.changedRows > 0) {
                console.log("school patch download flag unset");
            } else {
                console.log("school patch download flag not set");
            }
            console.log(rows.changedRows);

            callback();
        });
    } else {
        console.log("Slc id not found");
    }
}



function downloadFile(slcId, callback) {
    cloudConnection.query('select * from filelist where download_status < "2" and slc_id = "' + slcId + '" ', function (err, rows, fields) {
        console.log('checking files to be downloaded');
        if (err) {
            console.log(" mysql socket connect unexpectedly closed ");
            throw err;
        }

        if (!rows.length) {
            console.log("no file available for download");
            unsetDownloadFlag(slcId, function () {
                console.log("All files were completely downloaded");
            });
        }

        if (rows) {
            for (var i in rows) {
                FtpDownload(rows[i].filename, slcId, function (filename, Ftp) {
                    cloudConnection.query('update filelist set download_status = "2" where filename = "' + filename + '" and slc_id = "' + slcId + '" ')
                    Ftp.raw.quit(function (err, data) {
                        if (err)
                            throw err;

                        console.log('ftp closed! Bye!!');
                    });
                });
            }
            if (i == rows.length)
                callback();
        }

    })
}

function FtpDownload(filename, slcId, callback) {
    var Ftp = new JSFtp({
        host: '10.1.17.94',
        user: 'extramarks',
        password: 'extra123',
    });

    Ftp.keepAlive(1000000);

    Ftp.auth('extramarks', 'extra123', function (err, res) {
        cloudConnection.query('update filelist set download_status = "1" where filename = "' + filename + '" and slc_id = "' + slcId + '" ', function (err, results) {

            if (err) {
                console.log(" mysql socket connect unexpectedly closed ");
                throw err;
            }

            Ftp.get('/nodejs/git/' + filename, filename, function (hadErr) {
                if (hadErr) {
                    console.log('FTP ERROR');
                    throw hadErr;
                }
                else
                    console.log(" file copied!! " + filename + " hurray!! ");
                callback(filename, Ftp);
            });



        });
    });
}

process.on('uncaughtException', function (err) {
    console.log("uncaughtException");
    console.error(err.stack);
    process.exit();
});
