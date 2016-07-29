var fs = require('fs'), 
	mysql = require('mysql'), connectionsArray = [];


socket.on('disconnect', function(socket) {
	console.log('socket disconnected! bye!');
})
//new version download available
socket.on('new-version-available', function(socket) {
	console.log('hurray!! new version for downloading is available');
})
