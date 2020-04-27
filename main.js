/*
################################################################################
# File:            main.js
# Subcomponent:    Clueless/Serverside
# Language:        Javascript
# Author:          Nate Lao (nlao1@jh.edu)
# Date Created:    3/31/2020
# Description:
#          Server interface for the Clueless Frontend Player subcomponent and
#          the Clueless Serverside Server subcomponent. Manages the handling of
#          SocketIO event signals, Player management and Backend Python thread
#          process allocation. 
#
# Detailed Description:
#          <<Method of Execution>>
#          This process runs when the Clueless Server has issued a OS 'node' call
#          for this program. Player (i.e. Players) are captured when a HTTP Node
#          signal request is made to the host Server. During the start of operation,
#          this process spawns a new Serverside:listener.py thread to interface with
#          Backend game logic component. This process interprets the request signals
#          from the Players and passes on the significant information to the listener
#          wrapper thread. The python listener thread interfaces through stdout/stdin
#          OS file pipes.
#
#          <<Data Protocol Design>>
#          Information that is sent from this process must observe the following schema:
#          Format:
#          {
#               playerId: "all" or <playerId>,
#               event: <string>,
#               payload: {}
#          }
#          Where:
#              -playerId : the target player ID string to be sent.
#              -event : the string action that corresponds to the event.
#                           signature expected by the player.
#              -payload : a dictionary (JSON) that is sent to the Player(s).
#
#          Information that is sent to this process must observe the following schema:
#          the following format:
#          {
#               playerId: <playerId>,
#               event: <string>,
#               payload: {}
#          }
#          Where:
#              -playerId : the player ID that sent the signal.
#              -event : the string action that corresponds to the event.
#                           signature made by the player.
#              -payload : a dictionary (JSON) that contains additional information
#                         about the event.
#
################################################################################
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
const CRASH_LOG           = 'crash.log';
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
var players = [];
/*
	These names have to spelled out this way - it is absolutely necessary for the frontend
*/
var playerIds = ["player0","player1","player2","player3","player4","player5","player6"]

// Stores all game instances (NOT CURRENTLY USED)
var games = [];

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

	fs.appendFileSync((LOG_DIR+GENERAL_LOG),(timestamp()+'\t'+message+'\n'));
	if (type != GENERAL_LOG) {
		fs.appendFileSync((LOG_DIR+type),(timestamp()+'\t'+message+'\n'));
	}
}

/* Logs information about payload data sent to the backend */
function logReceivePayload(data) {
	log(">>> START OF PAYLOAD DATA >>>",INCOMING_SIGNAL_LOG);
	log(JSON.stringify(data),INCOMING_SIGNAL_LOG);
	log(">>> END OF PAYLOAD DATA >>>",INCOMING_SIGNAL_LOG);
}

/* Log out crash info if the backend listener nopes out */
backend.stderr.on('data', (big_oof) => {
	log(big_oof,CRASH_LOG);
});

/******************************************************************************
* AUXILIARY FUNCTIONS
******************************************************************************/

/* Recursively finds the Player's IP based on the socket input object */
function findPlayerIP(player) {
	var playerId = null;
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
	Returns a player for the given player
*/
function createPlayerID(player) {	
	var playerId = playerIds.shift(); // Remove from the beggining of the array
	var logOut = "ASSIGNING PLAYER ID: ".concat(playerId);
	logOut+= " TO ".concat(findPlayerIP(player));
	log(logOut);
	return playerId;
}

/*
	Does a bunch of stuff:
	- Creates a unique playerId for the given player
	- Associates a field within player (ie. player.playerId)
	- Have the Player join the server in a "room" (for individual player updates)
	- Adds it to the Server's Players list so that they can be tagged and sold to the blackmarket.
	- Shoots out `startInfo` signal to the player that was just added to the server
*/
function addPlayer(player) {
	player.playerId = createPlayerID(player);

	log("ADDING PLAYER: ".concat(player.playerId));

	player.join(playerId);   // the player is joined in a "room" named after the playerId
	players.push(player);    // add the player to player list
	player.emit('startInfo',{player:playerId}); // TODO DEPRECATE taken by playerstate
	
	log("ADDED PLAYER: ".concat(player.playerId));
	log("AVAILABLE PLAYER IDs: ".concat(playerIds));
}

/* Returns the Player that is associated with the PlayerID */
function getPlayer(playerId) {
	var target = null;
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

	// Remove the socket from the associated room
	player.leave(player.playerId);
	
	// (I hate javascript) remove the player from the list of players
	players.splice(players.indexOf(playerId),players.indexOf(playerId));
	
	// Push the ID back to available IDs that could be handed out
	playerIds.push(playerId);

	log("REMOVED PLAYER: ".concat(player.playerId));
	log("AVAILABLE PLAYER IDs: ".concat(playerIds));
}

/* Shoots a signal to the backend listener */
function sendToBackend(playerId,eventName,payload) {
	var signal = {
			'playerId' : playerId,
			'eventName': eventName,
			'payload'  : payload
		};
	signal = JSON.stringify(signal);	// absolutely necessary
	signal = signal.concat('\n');		// also absolutely necessary
	log(">>> START OF RAW BACKEND INPUT DATA >>>",INCOMING_SIGNAL_LOG);
	log(signal,INCOMING_SIGNAL_LOG);
	log(">>> END OF RAW BACKEND INPUT DATA >>>",INCOMING_SIGNAL_LOG);
	backend.stdin.write(signal);		// Spit out to stdin!
}

/******************************************************************************
* MAIN FUNCTIONS
******************************************************************************/
/* Call the http listener */
http.listen(HTTP_PORT, URL_WILDCARD, () => { // TODO need configuration call
	log('SERVER LISTENING FOR PLAYERS: '+URL_WILDCARD+':'+HTTP_PORT);
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

			log("<<< START OF BACKEND OUTPUT DATA <<<");
			log(chunk);
			log("<<< END OF BACKEND OUTPUT DATA <<<");
			log("LENGTH OF PARSING STRING=".concat(chunk.length));

			/* Parse the chunk into a dictionary object */
			signal = JSON.parse(chunk);
			log("<<< SENDING SIGNAL TO: ".concat(signal.playerId.toString()),OUTGOING_SIGNAL_LOG);
			log("<<< EVENT SIGNATURE: ".concat(signal.eventName.toString()),OUTGOING_SIGNAL_LOG);
			if (signal.payload.constructor == Object) {
				log("<<< START OF OUTPUT SIGNAL PAYLOAD <<<",OUTGOING_SIGNAL_LOG);
				log(JSON.stringify(signal.payload),OUTGOING_SIGNAL_LOG);
				log("<<< END OF SIGNAL PAYLOAD <<<",OUTGOING_SIGNAL_LOG);
			}

			/* Send out the signal depending on the playerId tag */

			// Send to a specified player
			if (signal.playerId != "all") {
				var player = getPlayer(signal.playerId);
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
* Player -> Server
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
		- Shoots out `startInfo` signal to the player that was just added to the server
	*/
	addPlayer(player);

	/**************************************************************************
		Create the event handlers to link up the Front to the Backend listener.
		These are tied to the SENDER functions in the server.service.ts component
		in the Frontend subsystem.
	**************************************************************************/
   
   /**********************************************
     PREGAME SIGNALS
   **********************************************/
	player.on('entered_player_select', (data) => {
		log("RECIEVED entered_player_select SIGNAL",INCOMING_SIGNAL_LOG);
		logReceivePayload(data)
		sendToBackend(player.playerId,'entered_player_select',data);
	});

	player.on('select_character', (data) => {
		log("RECIEVED select_character SIGNAL",INCOMING_SIGNAL_LOG);
		logReceivePayload(data)
		sendToBackend(player.playerId,'select_character',data);
	});
	
	player.on('entered_game', (data) => {
		log("RECIEVED entered_game SIGNAL",INCOMING_SIGNAL_LOG);
		logReceivePayload(data)
		sendToBackend(player.playerId,'entered_game',data);
	});
	
	player.on('start_game', (data) => {
		log("RECIEVED start_game SIGNAL",INCOMING_SIGNAL_LOG);
		logReceivePayload(data)
		sendToBackend(player.playerId,'start_game',data);
	});
	
   /**********************************************
     GAME IN-PROGRESS SIGNALS
   **********************************************/
	player.on('move_choice', (data) => {
		log("RECIEVED move_choice SIGNAL",INCOMING_SIGNAL_LOG);
		logReceivePayload(data)
		sendToBackend(player.playerId,'move_choice',data);
	});
	
	player.on('suggestion_start', (data) => {
		log("RECIEVED suggestion_start SIGNAL",INCOMING_SIGNAL_LOG);
		logReceivePayload(data)
		sendToBackend(player.playerId,'suggestion_start',data);
	});

	player.on('accusation_start', (data) => {
		log("RECIEVED accusation_start SIGNAL",INCOMING_SIGNAL_LOG);
		logReceivePayload(data)
		sendToBackend(player.playerId,'accusation_start',data);
	});
	
	player.on('suggestion_choice', (data) => {
		log("RECIEVED suggestion_choice SIGNAL",INCOMING_SIGNAL_LOG);
		logReceivePayload(data)
		sendToBackend(player.playerId,'suggestion_choice',data);
	});
	
	player.on('accusation_choice', (data) => {
		log("RECIEVED accusation_choice SIGNAL",INCOMING_SIGNAL_LOG);
		logReceivePayload(data)
		sendToBackend(player.playerId,'accusation_choice',data);
	});
	
	player.on('card_choice', (data) => {
		log("RECIEVED card_choice SIGNAL",INCOMING_SIGNAL_LOG);
		logReceivePayload(data)
		sendToBackend(player.playerId,'card_choice',data);
	});
	
	player.on('pass_turn', (data) => {
		log("RECIEVED pass_turn SIGNAL",INCOMING_SIGNAL_LOG);
		logReceivePayload(data)
		sendToBackend(player.playerId,'pass_turn',data);
	});
	
   /**********************************************
     OTHER SIGNALS
   **********************************************/
	player.on('disconnect', (data) => {
		log("RECIEVED disconnect SIGNAL",INCOMING_SIGNAL_LOG);
		logReceivePayload(data)
		removePlayer(player)
		sendToBackend(player.playerId,'disconnect',data);
	});
});
