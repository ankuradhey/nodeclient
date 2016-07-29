/*
* @Author - Ankit Sharma
* @Description - For Database related operations - table slc_list
*/
'use strict';

var db = require('../db.js'),
	tableName = 'slc_list';

module.exports = {
	updateDownloadFlag: function(updateParams, slcId, done){
		db.get().query('update slc_list set ? where slc_id = ? ',[updateParams, slcId],function(err, result){
			if(err){
				done(err);
			}else{
				done(null, result)
			}
		});
	},
	setDownloadFlag: function(slcId, patchVersion, done){
		if(!isNaN(parseInt(slcId))){

			this.updateDownloadFlag({download_flag:"1", patch_version:patchVersion}, slcId, function(err, result){
				if(err){
					done(err);
				}else if(result.affectedRows > 0){
					done(null, result);
				}else{
					done('Update not effected', result);
				}
			});

		}else{
			done('Slc Id not valid', slcId);
		}
	},
	unsetDownloadFlag: function(slcId, done){
		if(!isNaN(parseInt(slcId))){

			this.updateDownloadFlag({download_flag:"0"}, slcId, function(err, result){
				if(err){
					done(err);
				}else if(result.affectedRows > 0){
					done(null, result);
				}else{
					done('Update not effected', result);
				}
			});

		}else{
			done('Slc Id not valid', slcId);
		}	
	}

}