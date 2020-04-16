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
const BACKEND_WRAPPER = "/opt/clueless/src/serverside/listener.py";
const DEBUG = true

/******************************************************************************
* IMPORTS
******************************************************************************/
const crypto = require('crypto');

/******************************************************************************
* SETUP THE NETWORK CONFIGURATION
******************************************************************************/
log('SETTING UP NETWORK CONFIGURATION...');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var mainSocket = require('socket.io')(http); // This pushes to everyone!
var spawn = require("child_process").spawn;
log('NETWORK CONFIGURATION ESTABLISHED...');

/******************************************************************************
* SPAWN PYTHON LISTENER
******************************************************************************/
log('SPAWNING PYTHON LISTENER THREAD...');
var backend = spawn("python3",[BACKEND_WRAPPER]); // TODO send output of spawn to log
log('PYTHON LISTENER THREAD SPAWNED');

/******************************************************************************
* INSTANCE VARIABLES
******************************************************************************/

/*
	Stores the socket object for each player.
	Every element has an associated playerID
*/
players = [];

/******************************************************************************
* AUXILIARY FUNCTIONS
******************************************************************************/
/* Log wrapper */
function log(message) {
	// TODO send to a log file for the Server to Clients ClientX to Server
	console.log(message);
}

/* Recursively finds the Player's IP based on the socket input object */
function findPlayerIP(player) {
	playerID = null;
	for (var key in player) {
		if (key == "address") {
			playerID = player[key];
			break;
		}
		if (player[key] != undefined && player[key].constructor == Object) {
			playerID = findPlayerIP(player[key]);
			if (playerID != null) {
				break;
			}
		}
	}
	return playerID;
}

function createPlayerID(player) {
	// TODO - this might not work
	// TODO --TESTING
	console.log("SOCKETDUMP:");
	console.log(player);
	
	playerID = findPlayerIP(player); // TODO -- one thing to consider, there might be more than one player within a private network

	console.log("PLAYER IP");
	console.log(playerID);
	
	console.log(String(player)); // TESTING
	
	return playerID;
}

/* Adds a Player to the list of Players */
function addPlayer(player) {
	hash = createPlayerID(player);
	player.playerID = hash;
	console.log("ServerSide: adding player ".concat(hash));
	player.join(playerID);   // the player is joined in a "room" named after the playerID
	players.push(player);    // add the player to player list
}

/* Returns the Player that is associated with the PlayerID */
function getPlayer(playerID) {
	target = null;
	// i hate javascript
	players.forEach(player => {
		if (player.playerID == playerID) {
			target = player;
		}
	});
	return target;
}

/* Removes the Player from the Server */
function removePlayer(player) {
	player.leave(player.playerID);
}

/* Shoots a signal to the backend listener */
function sendToBackend(playerID,eventName,sendData) {
	if (sendData == null) {
		signal = {
			'playerID' : playerID,
			'eventName': eventName
		};
	}
	else {
		signal = {
			'playerID' : playerID,
			'eventName': eventName,
			'payload'  : sendData
		};
	}
	signal = JSON.stringify(signal);	// absolutely necessary
	signal.concat('\n');				// also absolutely necessary
	backend.stdin.write(signal);		// Spit out to stdin!
}

/******************************************************************************
* MAIN FUNCTIONS
******************************************************************************/
/* Call the http listener */
http.listen(3000, '0.0.0.0', () => { // TODO need configuration call
    log('Listening at 0.0.0.0:3000...');
});

/******************************************************************************
* Backend -> Server
******************************************************************************/

/* Listens for whatever the Backend spits out 
*  Note that this is continuous, any info flushed from the Backend stdout is
*  processed through here.
*/
backend.stdout.on('data', (data) => {
    signal = JSON.parse(data);
	// Spit to an individual player
	if (signal.playerID != "all") {
		player = getPlayer(signal.playerID);
		player.emit(signal.eventName,signal.payload);
	}
	// Spit to all of the players!
	else {
		mainSocket.emit(signal.eventName,signal.payload);
	}
});

/******************************************************************************
* Client -> Server
******************************************************************************/

// TODO this might be temporary
mainSocket.on('connection', player => {
	
	// Add the player to the players list and have them join
	addPlayer(player);
	
	// Create event handlers for the player
	player.on('enteredGame', () => {
		sendToBackend(player.playerID,'enteredGame',null);
	});
	player.on('move', (direction) => {
		sendToBackend(player.playerID,'move',direction);
	});
	player.on('pass_turn', () => {
		sendToBackend(player.playerID,'pass_turn',null);
	});
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