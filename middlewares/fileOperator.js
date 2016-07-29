/*
* @Name:- fileOperation
* @Author:- Ankit Sharma
* @Description - File operations related code here
*/
'use strict';

var shell = require('shelljs'),
	config = require('../config'),
	filters = ['encrypt'],
	fileListModel = require('../models/fileListModel'),
	slcModel = require('../models/slcModel'),
	Ftp = new JSFtp(config.ftp),
	AdmZip = require('adm-zip');;

module.exports = {
		backupFiles: function(slcId, patchVersion,done){
			shell.exec('mkdir -p /opt/lampp/htdocs/backup', {
		        silent: true
		    }).output;

			console.log("inside backup");
			//traversing all files and make backup of them
		    list = fs.readdirSync(config.filePath);
		    list.forEach(function (file) {
		        if (filters.indexOf(file) > -1) {
		            console.log(file);
		            shell.exec('cp -fRv ' + config.filePath + '/' + file + ' ../backup/' + config.filePath + '.' + date.getDate() + date.getMonth() + date.getYear() + '.bkp').output;
		        }
		    });
		    console.log('backup done!!');
		    //====== TO DO ============
		    //=========================
		    // No Exception Handling for
		    // backup files
		    done(null, slcId, patchVersion);
		},
		downloadFiles: function(slcId, patchVersion, files, done){
			async.mapLimit(files, 1, function(filename, callback){

				//each file's lifecycle starts here
				// Lifecycle - 	1. Set downloading flag of the file
				//				2. Ftp download
				//				3. Set download status to downloaded i.e. 2
				//				4. Extract downloaded file
				//				5. Set file status to extracted i.e. 3
				async.waterfall([
									function(next){
										next(null, slcId, filename);
									},
									fileListModel.setFileDownloading,
									function(slcId, filename, next){
										Ftp.get(filename, filename, function (hadErr,ftpSocket) {
											next(hadErr, slcId, filename);
										});
									},
									fileListModel.setFileDownloaded,
									this.extractFile,
									fileListModel.setFileExtracted
								],
								function(err, res){

								});

				
			}, function(err, res){
				if(err){
					done(err);
				}else{
					console.log('Downloading finished successfully');
					//finally unset download flag here -->
					//if all the files were downloaded successfully - unset download flag
					slcModel.unsetDownloadFlag(slcId, function(err, result){
						done(null, result);	
					});
					
				}
			});
		
	},
	extractFile: function(slcId,filename, done){
		try{
	        console.log(filename);
	        var zip = new AdmZip('./' + filename);
	        zip.extractAllTo("/");
	    }catch(e){
	        console.log('Caught Exception: ',e,filename);
	        done(e);
	    }
	    done(null, slcId, filename);
	}
}