var mysql = require('mysql')
  , async = require('async'),
    config = require('./config');

var state = {
  pool: null,
  mode: null,
}

exports.connect = function(mode, done) {
    state.pool = mysql.createPool(
                    config.database
                 )
    state.mode = mode
    done();
}

exports.get = function() {
  return state.pool
}