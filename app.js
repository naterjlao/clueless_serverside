const Express = require('express');
var app = Express();
const Http = require('http').Server(app);
const Socketio = require('socket.io')(Http);

var position = {
    x: 200,
    y: 200
};

// THIS IS A TESTING AREA FOR PYTHON SPAWN
console.log('spawning python listener')
var spawn = require("child_process").spawn;
// pass into argument upon initialization first argument is the script
// TODO the path is hardcoded
var process = spawn("python3",["/root/Clue-Less/server/python_test.py"]); 
// please use python3 
// Bind a listener on the python process to recieve incoming data from it
// python -> nodejs
process.stdout.on('data', (data) => {
    console.log(`python returns ${data}`)
});
// END OF TESTING AREA

// bind the port to everything: 0.0.0.0
// listen on port: 3000
Http.listen(3000, '0.0.0.0', () => {
    console.log('Listening at 0.0.0.0:3000...');
    // log into a log file 
});

Socketio.on('connection', socket => {
    socket.emit('position', position);
    socket.on('move', data => {
        switch(data) {
            case 'left':
                // write to python process concurrently
                // nodejs -> python
                process.stdin.write('left\n'); // we are sending a signal to process (THE NEWLINE IS NECESSARY)
                position.x -= 5;
                Socketio.emit('position', position);
                break;
            case 'right':
                process.stdin.write('right\n'); // we are sending a signal to process (THE NEWLINE IS NECESSARY)
                position.x += 5;
                Socketio.emit('position', position);
                break;
            case 'up':
                process.stdin.write('up\n'); // we are sending a signal to process (THE NEWLINE IS NECESSARY)
                position.y -= 5;
                Socketio.emit('position', position);
                break;
            case 'down':
                process.stdin.write('down\n'); // we are sending a signal to process (THE NEWLINE IS NECESSARY)
                position.y += 5;
                Socketio.emit('position', position);
                break;
        }
    });
});

