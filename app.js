/*
##############################################################################
# File: app.js
# Author: Nate Lao (nlao1@jh.edu)
# Created On: 3/31/2020
# Description:
#       Server Side MAIN script
##############################################################################
*/
var Express = require('express');
var app = Express();
var Http = require('http').Server(app);
var Socketio = require('socket.io')(Http);
var spawn = require("child_process").spawn;

// Spawn the Backend component
console.log('spawning Backend main.py runner')
var backend = spawn("python3",["/opt/clueless/src/backend/main.py"]);//,">","/opt/clueless/log/serverside.log"]); 

// Listen at a port for commands from the Client
Http.listen(3000, '0.0.0.0', () => {
    console.log('Listening at 0.0.0.0:3000...');
});

// Initial Position -- TEMP
var position = {
    x: 200,
    y: 200
}

// When a signal is emmitted from the Client,
// we send a signal to the Backend
Socketio.on('connection', socket => {
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
    Socketio.emit('position',position);
});

