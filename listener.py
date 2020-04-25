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
DIRTY = 'dirty' # key name if TRUE - the status/payload has been modified
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
# MAIN
################################################################################
if __name__ == "__main__": # Safeguard against accidental imports

	################################################################################
	# GENERATE THE GAME INSTANCE
	################################################################################
	game = Game()

	# Spinup a listener, this will be killed when the Serverside application is killed
	while True:
	
		########################################################################
		# Send out these signals after every cycle
		########################################################################
		gamestate    = game.getGamestate()    # For all
		gameboard    = game.getGameboard()    # For all
		playerstates = game.getPlayerstates() # Player dependent
		checklists   = game.getChecklists()   # Player dependent
		moveoptions  = game.getMoveOptions()  # Player dependent
		cardlists    = game.getCardLists()    # Player dependent
		messages     = game.getMessages()     # Player dependent
		
		# Global signals
		sendToAll("gamestate", gamestate)
		sendToAll("gameboard", gameboard)
		
		# Player dependent signals
		for elem in playerstates:
			if elem[DIRTY]:
				sendToPlayer(elem[PLAYER_ID],'playerstate',elem[PAYLOAD])
		for elem in checklists:
			if elem[DIRTY]:
				sendToPlayer(elem[PLAYER_ID],'checklist',elem[PAYLOAD])
		for elem in moveoptions:
			if elem[DIRTY]:
				sendToPlayer(elem[PLAYER_ID],'moveoptions',elem[PAYLOAD])
		for elem in cardlists:
			if elem[DIRTY]:
				sendToPlayer(elem[PLAYER_ID],'cardlist',elem[PAYLOAD])
		for elem in messages:
			if elem[DIRTY]:
				sendToPlayer(elem[PLAYER_ID],'message',elem[PAYLOAD])
	
		########################################################################
		# Retrieve any signal that any Client sends and send to the Game
		########################################################################
		signal = input() # Execution will pause at this point until a messsage is recieved
		signal = signal.strip()
		signal = json.loads(signal) # data is coverted to a dictionary
		# Retrieve the information from the Client signal
		playerId, event, payload = signal[PLAYER_ID], signal[EVENT], signal[PAYLOAD]
		
		# TODO
		