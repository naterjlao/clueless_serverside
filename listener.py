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
from game import Game

################################################################################
# PAYLOAD SIGNATURE LABELS
################################################################################
PLAYER_ID = 'playerId'
EVENT     = 'eventName' # NOTE - Javascript has 'event' as a reserved keyword!
PAYLOAD   = 'payload'
DIRTY     = 'dirty'     # if TRUE - the status/payload has been modified on the backend
						# only used if FORCE_UPDATE is False

################################################################################
# SETTINGS
################################################################################
DEBUG = True
FORCE_UPDATE = True		# if True, player specific backend payloads are not checked
						# if they are modified

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

# Accepts an input string signal from the Frontend and Serverside/main.js
# Returns a tuple: (<playerId : string>, <signalEvent : string>,<payload : dict>)
def parseRecieveSignal(signal):
	signal = signal.strip()     # Remove any leading of trailing whitespace
	signal = json.loads(signal) # Convert into a dictionary
	return signal[PLAYER_ID], signal[EVENT], signal[PAYLOAD]

################################################################################
# MAIN
################################################################################
if __name__ == "__main__": # Safeguard against accidental imports

	################################################################################
	# INITIALIZE THE GAME INSTANCE
	################################################################################
	game = Game()

	# Spinup a listener, this will be killed when the Serverside application is killed
	while True:
	
		########################################################################
		# OUTPUT SIGNALS (sent first and after every signal cycle)
		########################################################################
		#startinfo (handled in playerstate)
		#availchars (handled in gamestate)
		gamestate      = game.getGamestate()    		# For all (dict) # TODO who's turn, list of players, availableCharacters
		gameboard      = game.getGameboard()    		# Player dependent (list of dicts)
		playerstates   = game.getPlayerstates() 		# Player dependent (list of dicts)
		moveoptions    = game.getMoveOptions()  		# Player dependent (list of dicts)
		suggestOptions = game.getSuggestionOptions()	# Player dependent (list of dicts)
		accuseOptions  = game.getAccusationOptions()	# Player dependent (list of dicts)
		checklists     = game.getChecklists()   		# Player dependent (list of dicts)
		cardlists      = game.getCardlists()    		# Player dependent (list of dicts)
		messages       = game.getMessages()     		# Player dependent (list of dicts)
		
		# Global signals
		sendToAll("gamestate", gamestate)
		sendToAll("gameboard", gameboard)
		
		# Player dependent signals
		# We iterate through a list of dictionaries each containing
		# the target playerId.
		# If FORCE_UPDATE is True (see above), then the signal is sent
		# no matter what. Else, if the DIRTY key in each dictionary
		# is set to True, we send the signal.
		# If FORCE_UPDATE is False and the message has not been updated
		# between it being sent or not, do not send the signal to that
		# player.
		''' CANDIDATE FOR DEPRECATION
		for player in gameboard:
			if FORCE_UPDATE or player[DIRTY]:
				sendToPlayer(player[PLAYER_ID],'gameboard',player[PAYLOAD])
		'''
		for player in playerstates:
			if FORCE_UPDATE or player[DIRTY]:
				sendToPlayer(player[PLAYER_ID],'playerstate',player[PAYLOAD])
		for player in moveoptions:
			if FORCE_UPDATE or player[DIRTY]:
				sendToPlayer(player[PLAYER_ID],'move_options',player[PAYLOAD])
		for player in suggestOptions:
			if FORCE_UPDATE or player[DIRTY]:
				sendToPlayer(player[PLAYER_ID],'suggestion_options',player[PAYLOAD])
		for player in accuseOptions:
			if FORCE_UPDATE or player[DIRTY]:
				sendToPlayer(player[PLAYER_ID],'accusation_options',player[PAYLOAD])
		for player in checklists:
			if FORCE_UPDATE or player[DIRTY]:
				sendToPlayer(player[PLAYER_ID],'checklist',player[PAYLOAD])
		for player in cardlists:
			if FORCE_UPDATE or player[DIRTY]:
				sendToPlayer(player[PLAYER_ID],'card_list',player[PAYLOAD])
		for player in messages:
			if FORCE_UPDATE or elem[DIRTY]:
				sendToPlayer(player[PLAYER_ID],'message',player[PAYLOAD])
	
		########################################################################
		# Retrieve any signal that any Client sends and send to the Game
		########################################################################
		signal = input() # Execution will pause at this point until a messsage is recieved
		playerId, event, payload = parseRecieveSignal(signal)
		
		if   event == "entered_player_select": # this signal is sent when the player has entered the player select screen
			game.addPlayer(playerId)
		elif event == "select_character":
			game.selectSuspect(playerId,payload["character"])
		elif event == "entered_game": # this signal is sent when the player has entered the board screen
			game.enteredGame(playerId)
		elif event == "start_game":
			game.startGame()
		
		elif event == "move_choice":
			game.selectMove(playerId,payload["choice"])
		elif event == "card_choice":
			game.selectCard(playerId,payload["choice"])
		elif event == "pass_turn":
			game.passTurn(playerId)
			
		# SUGGESTION HANDLERS
		elif event == "suggestion_start":
			game.startSuggestion(playerId)
		elif event == "suggestion_choice":
			game.proposeSuggestion(playerId,payload["suspect"],payload["weapon"])
		elif event == "suggestion_trial":
			game.disproveSuggestion(playerId,payload["card"],payload["type"],payload["cannotDisprove"])
		
		# ACCUSATION HANDLERS
		elif event == "accusation_start":
			game.startAccusation(playerId)
		elif event == "accusation_choice":
			game.proposeAccusation(playerId,payload["weapon"],payload["room"])
		elif event == "accusation_trial":
			game.disproveAccusation(playerId,payload["card"],payload["type"],payload["cannotDisprove"])
			
		elif event == "disconnect":
			game.removePlayer(playerId)
		
