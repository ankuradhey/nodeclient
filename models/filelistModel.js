/*
* @Author - Ankit Sharma
* @Description - For Database related operations - table filelist
*/
'use strict';

var db = require('../db.js'),
	tableName = 'filelist';

//======= Status [1: downloading , 2: downloaded, 3: extracted] 

module.exports = {
	getFileList: function(slcId, downloadStatus, done){
		db.get().query('select * from filelist where download_status = ? and slc_id = ?', [downloadStatus || 1, slcId] ,function (err, rows, fields) {
			if(err){
				done(err);
			}else{
				done(null, rows);
			}
		});
	},
	getDownloadableFiles: function(slcId, patchVersion, done){
		db.get().query('select * from filelist where download_status < "2" and slc_id = ?', slcId ,function (err, rows, fields) {
			if(err){
				done(err);
			}else{
				done(null, slcId, patchVersion, rows);
			}
		});
	},
	setFileDownloading: function(slcId, filename, done){
		db.get().query('update filelist set download_status = "1" where filename = ? and slc_id = ?',[filename, slcId], function(err, result){
			if(err){
				console.log(err);
				done(err);
			}else{
				done(null, slcId, filename);
			}
		});
	},
	setFileDownloaded: function(slcId, filename, done){
		db.get().query('update filelist set download_status = "2" where filename = ? and slc_id = ?',[filename, slcId], function(err, result){
			if(err){
				console.log(err);
				done(err);
			}else{
				done(null, slcId, filename);
			}
		});
	},
	setFileExtracted: function(slcId, filename, done){
		db.get().query('update filelist set download_status = "3" where filename = ? and slc_id = ?',[filename, slcId], function(err, result){
			if(err){
				console.log(err);
				done(err);
			}else{
				done(null, slcId, filename);
			}
		});
	}

}