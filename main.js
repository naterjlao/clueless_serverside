/*
##############################################################################
# File: main.js
# Author: Nate Lao (nlao1@jh.edu)
# Created On: 3/31/2020
# Description:
#       ServerSide main script for ingesting and returning JSON messages
#       between the Client interface (FrontEnd) and the game logic (Backend)
##############################################################################
*/

/******************************************************************************
* GLOBAL CONSTANTS
******************************************************************************/
const LISTENER_PY = "/opt/clueless/src/serverside/listener.py"

/******************************************************************************
* SETUP THE NETWORK CONFIGURATION
******************************************************************************/
log('SETTING UP NETWORK CONFIGURATION...');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var clientSocket = require('socket.io')(http);
var spawn = require("child_process").spawn;
log('NETWORK CONFIGURATION ESTABLISHED...');

/******************************************************************************
* SPAWN PYTHON LISTENER
******************************************************************************/
log('SPAWNING PYTHON LISTENER THREAD...');
var backend = spawn("python3",[LISTENER_PY]); // TODO send output of spawn to log
log('PYTHON LISTENER THREAD SPAWNED');

/******************************************************************************
* AUXILIARY FUNCTIONS
******************************************************************************/
/* Log wrapper */
function log(message) {
	// TODO send to a log file
	console.log(message)
}


/******************************************************************************
* MAIN FUNCTIONS
******************************************************************************/

/* Call the http listener */
http.listen(3000, '0.0.0.0', () => { // TODO need configuration call
    log('Listening at 0.0.0.0:3000...');
});

/*

// When a signal is emmitted from the Client,
// we send a signal to the Backend
clientSocket.on('connection', socket => {
    socket.emit('position', position);
    socket.on('move', data => {
        // Digest data and send to the Backend
        data = data.concat('\n');
        backend.stdin.write(data);
    });
});

// From the messages recieved from the Backend,
// we send the signal to the Client
backend.stdout.on('data', (data) => {
    console.log(data);
    position = JSON.parse(data);
    console.log(position);
    clientSocket.emit('position',position);
});

*/