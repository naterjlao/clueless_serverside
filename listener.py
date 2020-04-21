#!/usr/bin/python3
################################################################################
# File:            listener.py
# Subcomponent:    Clueless/Serverside
# Language:        python3
# Author:          Nate Lao (nlao1@jh.edu)
# Date Created:    4/12/2020
# Description:
#          Listener interface for the Clueless Frontend Client subcomponent and
#          the Clueless Backend Server subcomponent. Manages the subcomponent
#          interface protocol through file redirection through OS stdin/stdout
#          pipe.
#
# Detailed Description:
#          <<Method of Execution>>
#          Memory and thread resources are allocated within the Server OS for this 
#          process by using the 'spawn' OS function in Serverside:main.js.
#          This process performs a busy wait by calling an infinite loop that blocks
#          for OS stdin input. The input is then parsed and interpreted as a Dictionary
#          object for processing. Output is done through stdout. Once a request is
#          made on the process, the process performs a print function to output
#          the requested data to stdout. This data is parsed and interpreted by the
#          caller, Serverside:main.js.
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
#              -payload : a dictionary (JSON) that is sent to the Client(s).
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

################################################################################
# IMPORT STUFF FROM THE BACKEND TO LINK UP THE APPLICATION
################################################################################
import json
import sys
sys.path.append('/opt/clueless/src/backend')
from Server import Game

################################################################################
# STATIC GLOBAL VARIABLES
################################################################################
PLAYER_ID = 'playerId'
EVENT = 'eventName' # NOTE - Javascript has 'event' as a reserved keyword!
PAYLOAD = 'payload'
MIN_PLAYER = 2

################################################################################
# DEBUG
################################################################################
DEBUG = True

################################################################################
# AUXILIARY FUNCTIONS
################################################################################

# Shoots <sendData> for the <event> in Serverside to the lucky Client
# that is associated with <playerId>
def sendToPlayer(playerId,event,sendData):
	# Prepare the data to transfer to the Serverside
	signal = {
		PLAYER_ID : playerId,
		EVENT     : event,
		PAYLOAD   : sendData
		}
	# Data is sent to the Serverside using stdout file IO
	print(json.dumps(signal).replace("'",'"'),flush=True)

# Shoots <sendData> for the <event> to Serverside for all Clients
def sendToAll(event,sendData):
	sendToPlayer("all",event,sendData)
	
################################################################################
# INSTANCE VARIABLES
################################################################################

# Stores the player IDs that sent the request
playerIds = []

# Flags for one-time signals TODO -- not the ideal solution
game_ready_sent = False
entered_player_select_sent = False

#### TODO --- THIS IS TEMPORARY replace with actual game objects ----- #######
# Create variables that is stored at runtime for this process
position = {"x":100,"y":100}
current_turn = "redBoi" # set to the ID of the first Player entered
#### TODO --- THIS IS TEMPORARY replace with actual game objects ----- #######


################################################################################
# MAIN
################################################################################
if __name__ == "__main__": # Safeguard against accidental imports


	################################################################################
	# GENERATE THE GAME INSTANCE
	################################################################################
	game = Game()

	# Spinup a listener, this will be killed when the Serverside application is killed
	while True:
	
		# TODO -- there is a case where there might be conflicting signals at the same time,
		# TODO -- might need to implement an input buffer to handle these cases.
		# TODO -- absolute worst case, multithreading might be needed
	
		########################################################################
		# Get the RAW signal from the ServerSide
		########################################################################
		signal = input()
		signal = signal.strip()
		signal = json.loads(signal) # data is coverted to a dictionary
		
		########################################################################
		# Strip out the metadata from the given RAW signal
		########################################################################
		playerId = signal[PLAYER_ID]
		event = signal[EVENT]
		if PAYLOAD in signal: # Guard against the event that no payload was given
			payload = signal[PAYLOAD]
		
		# Add the player to the list of players registered in the game
		# TODO, this thing's job is only to keep track of how many
		# clients have CONNECTED in the game, this is potentially redundant.
		if (not (playerId in playerIds)):
			playerIds.append(playerId)
		
		# Event Signal Signatures
		
		# << FRONT -> BACK >>
		# entered_game
		# start_game
		# move
		# make_suggestion
		# make_accusation
		# pass_turn
		# make_move
		# select_suspect
		# disconnect
		
		# << BACK -> FRONT >>
		# startInfo
		# position
		# turnChange
		
		# Interface game functions from Server.py
		# Game(self)
		# Game.get_gamestateDict()
		# Game.add_player(name)
		# Game.start_game()
		# Game.end_game()
		# Game.make_move(name, suspect, room)
		# Game.select_suspect(name, suspect)
		# Game.make_suggestion(name, suspect, weapon, room)
		# Game.respond_suggestion(player, card)
		# Game.make_accusation(name, suspect, weapon, room)
		# Game.end_turn(name)
		
		# TODO this is ugly and slow as hell, could use a hash or something
		
		# One time send of available characters TODO -- not ideal
		if event == "entered_player_select" and not entered_player_select_sent:
			available_characters = game.start_select_character()
			sendToPlayer(playerId,'available_characters',available_characters)
			entered_player_select_sent = True
			
		elif event == "entered_game":
			sendToPlayer(playerId,'startInfo',{"player":playerId})
			sendToAll("turnChange",{"turn":current_turn})
			sendToPlayer(playerId,"position",{"position":position})
		
		elif event == "start_game":
			game.start_game()
		
		# THIS IS TEMPORARY
		elif event == "move":
			# TODO This whole thing might be temp
			# Fun fact, python3 does not support switches
			if payload["direction"] == "left":
				position["x"] = position["x"] - 5
			if payload["direction"] == "right":
				position["x"] = position["x"] + 5
			if payload["direction"] == "up":
				position["y"] = position["y"] - 5
			if payload["direction"] == "down":
				position["y"] = position["y"] + 5
			sendToAll('position',{"position":position})
		
		elif event == "make_suggestion":
			game.make_suggestion(playerId,payload["suspect"],payload["weapon"],payload["room"])
			
		elif event == "make_accusation":
			game.make_accusation(playerId,payload["suspect"],payload["weapon"],payload["room"])
		
		elif event == "pass_turn":
			game.end_turn(playerId)
		
		elif event == "make_move":
			game.make_move(playerId,payload["suspect"],payload["room"])
			# Return the list of rooms that is available to the player
			sendToPlayer(playerId,'move_options',{"move_options":game.check_move_options(payload["room"])})
			
		elif event == "select_character":
			game.add_player(playerId)
			game.select_character(playerId,payload["character"]) # select a character
			
		elif event == "disconnect":
			# TODO redundant code is redundant, should player management be handled in the ServerSide or Backend?
			playerIds.remove(playerId)
			game.end_game()
			
		# Once the minimal amount of clients has reached the server, send out game ready signal
		if ((len(playerIds) >= MIN_PLAYER) and not game_ready_sent):
			game_ready_sent = True
			sendToPlayer(playerIds[0],'game_is_ready',{'placeholder':'nothing'}) # Assuming that the first player is the first element
		
		# Send out the game state at every cycle
		sendToPlayer(playerId,'turn_status',{'turn_status':game.check_turn_status()})
		sendToAll('available_characters',game.start_select_character()) # TODO the thing its returning should be mutable???
		sendToAll('update_gameState',game.get_gamestateDict())
		
		
		
		
		