#!/usr/bin/python3
################################################################################
# File: clueless
# Language: python3
# Author: Nate Lao (nlao1@jh.edu)
# Date Created: 4/12/2020
# Description:
#          Listener thread to catch input data from stdin and print output to stdout.
#
# Detailed Description:
#
#          ############### Backend -> Serverside -> Frontend ###############
#          The JSON data that is sent to the ServerSide must be in the following
#          format:
#          {
#               playerId: "all" or <playerId>,
#               event: <string>,
#               payload: {}
#          }
#          Where:
#              -playerId : the target player ID string to be sent
#              -event : the string action that corresponds to the event
#                           signature expected by the player
#              -payload : a dictionary (JSON) to sent to the player(s)
#
#          ############### Frontend -> Serverside -> Backend ###############
#          The JSON data that is sent to the Backend (this) is expected to be in 
#          the following format:
#          {
#               playerId: <playerId>,
#               event: <string>,
#               payload: {}
#          }
#          Where:
#              -playerId : the player ID that sent the signal
#              -event : the string action that corresponds to the event
#                           signature made by the player
#              -payload : a dictionary (JSON) to sent to the player(s)
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
        
        # Game functions that return a json string:
        # start_game
        # make_move
        # end_turn
        
        # TODO this is ugly and slow as hell, could use a hash or something
        if event == "entered_game":
            sendToPlayer(playerId,'startInfo',{"player":playerId})
            sendToAll("turnChange",{"turn":current_turn})
            sendToPlayer(playerId,"position",{"position":position})
            
            # We add a player in the Game and return a gamestate JSON
            game.add_player(playerId)
            sendToAll('gamestate',game.get_gamestateJSON())
            
        elif event == "start_game":
            pass
            
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
            pass
            
        elif event == "make_accusation":
            pass
        
        elif event == "pass_turn":
            pass
            ''' TODO
            if (current_turn == playerId):
                current_turn = game
            '''
        
        elif event == "make_move":
            pass
            
        elif event == "select_suspect":
            game.select_suspect(playerId,payload["suspect"])
            
        elif event == "disconnect":
            pass
            