var io = require('socket.io-client'), fs = require('fs'), mysql = require('mysql'), connectionsArray = [], connection = mysql.createConnection({
	host : 'localhost',
	user : 'root',
	password : '',
	database : 'patch',
	port : 3306
}), socket = io.connect('http://localhost:8000');

// If there is an error connecting to the database
connection.connect(function(err) {
	// connected! (unless `err` is set)
	console.log(err);
});

// create a new websocket connection to keep the content updated without any AJAX request
socket.on('connect', function(data) {
	connection.query('select * from slc_patch where slc_id = "2" ', function(err, rows, fields) {
		if (err)
			throw err;

		if (rows) {
			console.log("Socket with slc id - "+rows[0].slc_id+" connected! ");
			//after getting slc information - socket connection
			//transfer client slc id and other related information
			var clientdata = {
				'slcId' : rows[0].slc_id
			};
			
			socket.emit('newsocket-info', clientdata)

		}
	});
});

socket.on('disconnect', function(socket) {
	console.log('socket disconnected! bye!');
})
//new version download available
socket.on('new-version-available', function(socket) {
	console.log('hurray!! new version for downloading is available');
})