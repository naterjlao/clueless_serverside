#!/usr/bin/python3

# TODO import
import json
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

PLAYER_ID = 'playerId'
EVENT = 'event' # TODO use 'event' (name is redundant)
PAYLOAD = 'payload'

################################################################################
# AUXILIARY FUNCTIONS
################################################################################

# Shoots <sendData> for the <event> to Serverside for the lucky Client
# that is associated with <playerId>
def sendToPlayer(playerId,event,sendData):
    signal = {
        PLAYER_ID : playerId,
        EVENT     : event,
        PAYLOAD   : sendData
        }
    print(json.dumps(signal).replace("'",'"'),flush=True) # Spit out to stdout!

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
current_turn = 0 # start at the first player
#### TODO --- THIS IS TEMPORARY replace with actual game objects ----- #######


################################################################################
# MAIN
################################################################################
if __name__ == "__main__": # Safeguard against accidental imports
    # Spinup a listener, this will be killed when the Serverside application is killed
    while True:
    
        # TODO -- there is a case where there might be conflicting signals at the same time,
        # TODO -- might need to implement an input buffer to handle these cases.
        # TODO -- worst case, multithreading might be needed
    
        # Raw signal from the ServerSide
        recieve = input()
        recieve = recieve.strip()
        data = json.loads(recieve) # data is coverted to a dictionary
        
        ########## NOTE -- these might be temporary!!!! ##########
        # NOTE -- THESE CORRESPOND TO THE CLIENT -> SERVER event SIGNATURE in server.service.ts (frontend)
        # Handler for enteredGame()
        if data[EVENT] == "enteredGame":
            pass
            
        # Handler for move()
        elif data[EVENT] == "move":
            if data[PAYLOAD] == "left":
                position["x"] = position["x"] - 5
            if data[PAYLOAD] == "right":
                position["x"] = position["x"] + 5
            if data[PAYLOAD] == "up":
                position["y"] = position["y"] - 5
            if data[PAYLOAD] == "down":
                position["y"] = position["y"] + 5
            sendToAll('move',position)
                
        # Handler for endTurn()
        elif data[EVENT] == "pass_turn":
            pass
        
        # Handler for removeSocket()
        elif data[EVENT] == "disconnect":
            pass
            
        data = None
        
        ########## NOTE -- these might be temporary!!!! ##########
