const Express = require('express')();
const Http = require('http').Server(Express);
const Socketio = require('socket.io')(Http);

var position = {
    x: 100,
    y: 100
};

let players = [];
let current_turn = 0;

Http.listen(3000, () => {
    console.log('Listening at :3000...');
});

Socketio.on('connection', socket => {
    socket.join('player' + players.length);
	// a player has connected
    console.log('player conncted');
    console.log("current_turn is:" + current_turn);    
    players.forEach(socket => console.log(socket.rooms));
    console.log("==============================================");
    console.log(socket.rooms);

    // action upon player joining game
    players.push(socket);

    // action for changing which player's turn it is
    socket.on('pass_turn',function(){
        console.log('turn end attempt');
        if(socket.rooms['player' + current_turn]){
            next_turn();
        }
        Socketio.emit('turnChange', current_turn); // emit to all clients
    })

    // for temporary block moving game play
    socket.emit('position', position);
    socket.on('move', data => {
	    console.log(socket.rooms);
	    console.log(('player' + current_turn) in socket.rooms);
        if(socket.rooms['player' + current_turn]) {
            switch(data) {
                case 'left':
                    position.x -= 5;
                    Socketio.emit('position', position);
                    break;
                case 'right':
                    position.x += 5;
                    Socketio.emit('position', position);
                    break;
                case 'up':
                    position.y -= 5;
                    Socketio.emit('position', position);
                    break;
                case 'down':
                    position.y += 5;
                    Socketio.emit('position', position);
                    break;
            }
        }
    });

    // action for when a player disconnects from the game
    socket.on('disconnect', function() {
        console.log('A player disconnected');
        players.splice(players.indexOf(socket), 1);
        console.log("number of players now ", players.length);
    });
});

function next_turn() {
    current_turn = (current_turn + 1) % players.length;
    players[current_turn].emit('your_turn');
    console.log("next turn triggered " , current_turn);
}
