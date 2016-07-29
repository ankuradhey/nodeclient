var fs = require('fs'),
        async = require('async');
        mysql = require('mysql'),
        shell = require('shelljs'),
        _dir = '/opt/lampp/htdocs/ankit_ftp',
        _local='/opt/lampp/htdocs/nodeclient',
        JSFtp = require('jsftp'),
        i = 0,
        date = new Date(),
        filters = ['encrypt'];

//server connection db
var Ftp = new JSFtp({
    host: '115.112.128.10',
    user: 'ankit',
    password: '123',
}),
        AdmZip = require('adm-zip');
//log time taken to transfer files
start = 0;


var gatherFiles = function (dir) {
    return new Promise(function (resolve, reject) {
        Ftp.auth('ankit', '123', function (err, res)
        {
            if (err) {
                console.log("ftp authentication time error ");
            }

            Ftp.ls(dir+'/*', function (err, res) {

                console.log('inside',err);

                if (err)
                    reject(err)
                var files = [];
		console.log(res);
                res.forEach(function (file) {
                    if (/^.*\.zip$/.test(file.name))
                        files.push(file.name)

                });
                resolve(files)
            })
        });
    })
}

gatherFiles(_dir).then(function (files) {

    i = 0;
	console.log(files);
    async.mapLimit(files, 1, function (file, callback) {
        var filename = file.split("/")[file.split("/").length-1];
        console.log('attempting: ' + file + '->' + _local + '/'+filename);
        
        
        Ftp.get(file, _local + '/'+filename, function (err) {
            if (err) {
                console.log('Error getting ' + file)
                callback(err)
            } else {
                console.log('Got ' + file)
                callback()
            }

        })
    }, function (err, res) {
        if (err) {
            console.log(err)
        }
        console.log('updates complete' + res)
    })

}, function (err) {
    if (err)
        console.log(err);
    else
        console.log('Some error occurred');
})


function downloadFile(files, callback) {
    //log time taken to transfer files
    start = new Date().getTime();

    if (i < files.length) {

        Ftp.auth('extramarks', 'extra123', function (err, res)
        {
            if (err) {
                console.log("ftp authentication time error ");
            } else {

                Ftp.get(files[i], function (hadErr, ftpSocket) {
                    if (hadErr) {
                        console.log('FTP ERROR');
                        //throw hadErr;
                    }
                    else {
                        console.log(" file copied!! " + files[i] + " hurray!! ");
                        i++;
                        return downloadFile(files, callback);
                    }

                });

            }
        });

    } else {

        return callback();
    }


}
var ftpFlag = false;

function FtpDownloadRecursively(Rows, slcId, newVersion, callback) {

    FtpDownload(Rows[i].filename, slcId, function (filename, err) {

        if (err) {
            FtpDownloadRecursively(Rows, slcId, newVersion, callback);
        } else {
            extractFiles(slcId, filename, newVersion);

            delete Rows[i];
            i++;
            FtpDownloadRecursively(Rows, slcId, newVersion, callback);
            //});
        }
    });
    ftpFlag = true;
}


function FtpDownload(filename, slcId, callback) {

    console.log("ftp starts");

    Ftp.get('/nodejs/git/' + filename, filename, function (hadErr, ftpSocket) {
        if (hadErr) {
            callback(filename, hadErr)
            console.log('FTP ERROR');
            //throw hadErr;
        }
        else
            console.log(" file copied!! " + filename + " hurray!! ");

        callback(filename);
    });

}


function extractFiles(slcId, filename, newVersion) {
    //unzip downloaded file
    try {
        console.log(filename);
        var zip = new AdmZip('./' + filename);
        zip.extractAllTo("/");
    } catch (e) {
        console.log('Caught Exception: ', e, filename);
        throw e;

    }

}

process.on('uncaughtException', function (err) {
    console.log("uncaughtException");
    console.error(err);
    process.exit();
});
