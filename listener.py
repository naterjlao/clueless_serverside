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

# TODO this might be temporary
def nextTurn(): # TODO
	pass
	
################################################################################
# INSTANCE VARIABLES
################################################################################

# Stores the player IDs that sent the request
playerIds = []

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
		payload = signal[PAYLOAD]
		
		
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
		if event == "entered_game":
			sendToPlayer(playerId,'startInfo',{"player":playerId})
			sendToAll("turnChange",{"turn":current_turn})
			sendToPlayer(playerId,"position",{"position":position})
			
			# We add a player in the Game and return a gamestate JSON
			game.add_player(playerId)
			
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
			game.make_suggestion(payload["playerId"],payload["suspect"],payload["weapon"],payload["room"])
			
		elif event == "make_accusation":
			game.make_suggestion(payload["playerId"],payload["suspect"],payload["weapon"],payload["room"])
		
		elif event == "pass_turn":
			game.end_turn(payload["playerId"])
		
		elif event == "make_move":
			game.make_move(payload["playerId"],payload["suspect"],payload["room"])
			
		elif event == "select_character":
			game.select_suspect(payload["playerId"],payload["character"])
			
		elif event == "disconnect":
			game.end_game()
			
		sendToAll('gamestate',game.get_gamestateDict())
