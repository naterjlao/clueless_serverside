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
	Every element has an associated playerId
*/
players = [];
/*
	Funny names for the geek. TODO this is temporary because testing at same localhost
*/
playerIds = ["redBoi","greenBoi","blueBoi","orangeGurl","yellowBoi","magentaBoi","transparentBoi"]
playerIDidx = 0

/******************************************************************************
* AUXILIARY FUNCTIONS
******************************************************************************/
/* Log wrapper */
function log(message) {
	// TODO send to a log file for the Server to Clients ClientX to Server
	if (DEBUG == true) {
		console.log(message);
	}
}

/* Recursively finds the Player's IP based on the socket input object */
// NOTE - sooo this works, but there's implied issues with this bit
function findPlayerIP(player) {
	playerId = null;
	for (var key in player) {
		if (key == "address") {
			playerId = player[key];
			break;
		}
		if (player[key] != undefined && player[key].constructor == Object) {
			playerId = findPlayerIP(player[key]);
			if (playerId != null) {
				break;
			}
		}
	}
	return playerId;
}

/*
	Creates a player ID. Do I really have to spell it out?
*/
function createPlayerID(player) {
	// TODO - this might not work
	// TODO --TESTING
	//log("SOCKETDUMP:");
	//log(player);
	//playerId = findPlayerIP(player); // TODO -- one thing to consider, there might be more than one player within a private network
	//log("PLAYER IP");
	//log(playerId);
	//log(String(player)); // TESTING
	
	playerId = playerIds[playerIDidx];
	playerIDidx = (playerIDidx + 1) % playerIds.length; // TODO this is a band aid
	log("Creating player ID: ".concat(playerId));
	return playerId;
}

/* 
	Does a bunch of stuff:
	- Creates a unique playerId for the given player
	- Associates a field within player (ie. player.playerId)
	- Have the Player join the server in a "room" (for individual player updates)
	- Adds it to the Server's Players list so that they can be tagged and sold to the blackmarket.
*/
function addPlayer(player) {
	player.playerId = createPlayerID(player);
	log("ServerSide: adding player ".concat(player.playerId));
	player.join(playerId);   // the player is joined in a "room" named after the playerId
	players.push(player);    // add the player to player list
}

/* Returns the Player that is associated with the PlayerID */
function getPlayer(playerId) {
	target = null;
	// I hate javascript, I have to create a GD function
	// in order to do simple for loop...
	players.forEach(player => {
		if (player.playerId == playerId) {
			target = player;
		}
	});
	return target;
}

/* Removes the Player from the Server */
function removePlayer(player) {
	player.leave(player.playerId);
}

/* Shoots a signal to the backend listener */
function sendToBackend(playerId,eventName,payload) {
	signal = {
			'playerId' : playerId,
			'eventName': eventName,
			'payload'  : payload
		};
	signal = JSON.stringify(signal);	// absolutely necessary
	signal = signal.concat('\n');		// also absolutely necessary
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
	/* We take the raw output from the listener thread and split it into managable
	*  chunks using delimited newlines.
	*/
	data.toString().split("\n").forEach( chunk => {
		log("<<< PARSING FROM BACKEND >>>");
		log(chunk);
		log("<<< END OF PARSING >>>");
		log("LENGTH OF PARSING STRING=".concat(chunk.length));
		
		// Diregard empty strings
		if (chunk.length > 0) {
			signal = JSON.parse(chunk);
			// Spit to an individual player
			if (signal.playerId != "all") {
				player = getPlayer(signal.playerId);
				player.emit(signal.eventName,signal.payload);
			}
			// Spit to all of the players!
			else {
				mainSocket.emit(signal.eventName,signal.payload);
			}
		}
	});
});

/******************************************************************************
* Client -> Server
******************************************************************************/

/*
	When the server connects to anybody, so these thing.
*/
mainSocket.on('connection', player => {
	
	/*
		This bit does a bunch of stuff under the hood:
		- Creates a unique playerId for the given player
		- Associates a field within player (ie. player.playerId)
		- Have the Player join the server in a "room" (for individual player updates)
		- Adds it to the Server's Players list so that they can be tagged and sold to the blackmarket.
	*/
	addPlayer(player);
	
	/**************************************************************************
		Create the event handlers to link up the Front to the Backend listener.
		These are tied to the SENDER functions in the server.service.ts component
		in the Frontend subsystem.
	**************************************************************************/
	
	player.on('entered_game', () => {
		log("recieved entered_game signal");
		sendToBackend(player.playerId,'entered_game',null);
	});
	
	player.on('start_game', (data) => {
		/* data format:
		  {
			playerId: string
		  }
		*/
		log("recieved start_game signal");
		log("data: ");
		log(data);
		sendToBackend(player.playerId,'start_game',data);
	});
	
	player.on('move', (data) => {
		/* data format:
		  {
			playerId: string,
			direction: string
		  }
		*/
		log("recieved move signal");
		log("data: ");
		log(data);
		sendToBackend(player.playerId,'move',data);
	});
	

	player.on('make_suggestion', (data) => {
		/* data format:
          {
            playerId: string,
            suspect: string,
            weapon: string,
            room: string
          }
        */
		log("recieved make_suggestion signal");
		log("data: ");
		log(data);
		sendToBackend(player.playerId,'make_suggestion',data);
	});
	
	player.on('make_accusation', (data) => {
		/* data format:
          {
            playerId: string,
            suspect: string,
            weapon: string,
            room: string
          }
        */
		log("recieved make_accusation signal");
		log("data: ");
		log(data);
		sendToBackend(player.playerId,'make_accusation',data);
	});

	player.on('pass_turn', (data) => {
		/* data format:
			{
				playerId: string
			}
		*/
		log("recieved pass_turn signal");
		log("data: ");
		log(data);
		sendToBackend(player.playerId,'pass_turn',data);
	});
	
	player.on('make_move', (data) => {
		/* data format:
		  {
			playerId: string,
			suspect: string,
			room: string
		  }
		*/
		log("recieved make_move signal");
		log("data: ");
		log(data);
		sendToBackend(player.playerId,'make_move',data);
	});

	player.on('select_suspect', (data) => {
		/* data format:
		  {
			playerId: string,
			suspect: string
		  }
		*/
		log("recieved select_suspect signal");
		log("data: ");
		log(data);
		sendToBackend(player.playerId,'select_suspect',data);
	});

	player.on('disconnect', () => {
		log("recieved disconnect signal");
		removePlayer(player)
		sendToBackend(player.playerId,'disconnect',null);
	});
});
