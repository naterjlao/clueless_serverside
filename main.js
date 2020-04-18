/*
##############################################################################
# File: main.js
# Language: Javascript
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
const HTTP_PORT           = 3000                // TODO refer to config file
const URL_WILDCARD        = '0.0.0.0'           // TODO refer to config file
const LOG_DIR             = '/opt/clueless/log/'
const GENERAL_LOG         = 'serverside.log';
const INCOMING_SIGNAL_LOG = 'incoming.log';
const OUTGOING_SIGNAL_LOG = 'outgoing.log';
const BACKEND_WRAPPER     = '/opt/clueless/src/serverside/listener.py';
const DEBUG               = true

/******************************************************************************
* IMPORTS
******************************************************************************/
const crypto = require('crypto');
const fs = require('fs')

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
* LOGGING
******************************************************************************/
function timestamp() {
	var tardis, timestamp;
	tardis = new Date();
	timestamp = tardis.getFullYear()+'-'+(tardis.getMonth()+1)+'-'+tardis.getDate()+' ';
	timestamp+= tardis.getHours()+':'+tardis.getMinutes()+':'+tardis.getSeconds()+':';
	return timestamp
}

/*  Log wrapper
	Generates log message in the server console and to the log files in LOG_DIR.
	- Timestamps are recorded in log files.
	- By default, <type> is set to GENERAL_LOG.
	- If an another <type> is specified (i.e. INCOMING_SIGNAL_LOG or OUTGOING_SIGNAL_LOG),
		the function will log to GENERAL_LOG and the given <type>.
*/
function log(message,type=GENERAL_LOG) {
	if (DEBUG == true) {
		console.log(message);
	}
	
	fs.appendFileSync((LOG_DIR+type),(timestamp()+'\t'+message+'\n'));
	if (type != GENERAL_LOG) {
		fs.appendFileSync((LOG_DIR+type),(timestamp()+'\t'+message+'\n'));
	}
}

/******************************************************************************
* AUXILIARY FUNCTIONS
******************************************************************************/

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
	
	log("CREATED PLAYER ID: ".concat(playerId));
	
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
	
	log("ADDING PLAYER: ".concat(player.playerId));
	
	player.join(playerId);   // the player is joined in a "room" named after the playerId
	players.push(player);    // add the player to player list
	
	log("ADDED PLAYER: ".concat(player.playerId));
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
	log("REMOVING PLAYER: ".concat(player.playerId));
	
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
http.listen(HTTP_PORT, URL_WILDCARD, () => { // TODO need configuration call
	log('SERVER LISTENING FOR CLIENTS: '+URL_WILDCARD+':'+HTTP_PORT);
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
		/* Disregard empty strings */
		if (chunk.length > 0) {
			
			log("<<< START OF BACKEND RAW DATA >>>");
			log(chunk);
			log("<<< END OF BACKEND RAW DATA >>>");
			log("LENGTH OF PARSING STRING=".concat(chunk.length));
			
			/* Parse the chunk into a dictionary object */
			signal = JSON.parse(chunk);
			log(">>> SENDING SIGNAL TO: ".concat(signal.playerId.toString()),OUTGOING_SIGNAL_LOG);
			log(">>> EVENT SIGNATURE: ".concat(signal.eventName.toString()),OUTGOING_SIGNAL_LOG);
			if (signal.payload.constructor == Object) {
				log("<<< START OF SIGNAL PAYLOAD >>>",OUTGOING_SIGNAL_LOG);
				log(JSON.stringify(signal.payload));
				log("<<< END OF SIGNAL PAYLOAD >>>",OUTGOING_SIGNAL_LOG);
			}
						
			/* Send out the signal depending on the playerId tag */
			
			// Send to a specified player
			if (signal.playerId != "all") {
				player = getPlayer(signal.playerId);
				player.emit(signal.eventName,signal.payload);
			}
			
			// Send to all of the players
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
		log("RECIEVED entered_game SIGNAL",INCOMING_SIGNAL_LOG);
		sendToBackend(player.playerId,'entered_game',null);
	});
	
	player.on('start_game', (data) => {
		/* data format:
		  {
			playerId: string
		  }
		*/
		log("RECIEVED start_game SIGNAL",INCOMING_SIGNAL_LOG);
		log(">>> START OF PAYLOAD DATA <<<",INCOMING_SIGNAL_LOG);
		log(data,INCOMING_SIGNAL_LOG);
		log(">>> END OF PAYLOAD DATA <<<",INCOMING_SIGNAL_LOG);
		
		sendToBackend(player.playerId,'start_game',data);
	});
	
	player.on('move', (data) => {
		/* data format:
		  {
			playerId: string,
			direction: string
		  }
		*/
		log("RECIEVED move SIGNAL",INCOMING_SIGNAL_LOG);
		log(">>> START OF PAYLOAD DATA <<<",INCOMING_SIGNAL_LOG);
		log(data,INCOMING_SIGNAL_LOG);
		log(">>> END OF PAYLOAD DATA <<<",INCOMING_SIGNAL_LOG);
		
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
		log("RECIEVED make_suggestion SIGNAL",INCOMING_SIGNAL_LOG);
		log(">>> START OF PAYLOAD DATA <<<",INCOMING_SIGNAL_LOG);
		log(data,INCOMING_SIGNAL_LOG);
		log(">>> END OF PAYLOAD DATA <<<",INCOMING_SIGNAL_LOG);
		
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
		log("RECIEVED make_accusation SIGNAL",INCOMING_SIGNAL_LOG);
		log(">>> START OF PAYLOAD DATA <<<",INCOMING_SIGNAL_LOG);
		log(data,INCOMING_SIGNAL_LOG);
		log(">>> END OF PAYLOAD DATA <<<",INCOMING_SIGNAL_LOG);
		
		sendToBackend(player.playerId,'make_accusation',data);
	});

	player.on('pass_turn', (data) => {
		/* data format:
			{
				playerId: string
			}
		*/
		log("RECIEVED pass_turn SIGNAL",INCOMING_SIGNAL_LOG);
		log(">>> START OF PAYLOAD DATA <<<",INCOMING_SIGNAL_LOG);
		log(data,INCOMING_SIGNAL_LOG);
		log(">>> END OF PAYLOAD DATA <<<",INCOMING_SIGNAL_LOG);
		
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
		log("RECIEVED make_move SIGNAL",INCOMING_SIGNAL_LOG);
		log(">>> START OF PAYLOAD DATA <<<",INCOMING_SIGNAL_LOG);
		log(data,INCOMING_SIGNAL_LOG);
		log(">>> END OF PAYLOAD DATA <<<",INCOMING_SIGNAL_LOG);
		
		sendToBackend(player.playerId,'make_move',data);
	});

	player.on('select_suspect', (data) => {
		/* data format:
		  {
			playerId: string,
			suspect: string
		  }
		*/
		log("RECIEVED select_suspect SIGNAL",INCOMING_SIGNAL_LOG);
		log(">>> START OF PAYLOAD DATA <<<",INCOMING_SIGNAL_LOG);
		log(data,INCOMING_SIGNAL_LOG);
		log(">>> END OF PAYLOAD DATA <<<",INCOMING_SIGNAL_LOG);
		
		sendToBackend(player.playerId,'select_suspect',data);
	});

	player.on('disconnect', () => {
		log("RECIEVED disconnect SIGNAL",INCOMING_SIGNAL_LOG);
		
		removePlayer(player)
		sendToBackend(player.playerId,'disconnect',null);
	});
});
