/**
 * Created by MichaelParis on 11/20/14.
 */
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

/*
Serve static files from public
 */
app.use(express.static(__dirname + '/public'));

/*
Serve the index.html page
 */
app.get('/', function(req, res) {
   res.sendFile('index.html');
});

function generateUniqueId() {
    return 127;
}

/*
Socket IO routes and connections
 */
io.on('connection', function(socket) {
    console.log('a user connected');
    io.to(socket.client.id).emit('new user', {user_id: generateUniqueId()});
    /*
    Disconnect event
     */
    socket.on('disconnect', function() {
        console.log('user disconnected');
    });

    /*
    Object Moved Event
     */
    socket.on('object moved', function(state) {
        console.log('An object has moved');
        console.log(state);
        socket.broadcast.emit('object moved', state);
    });

    socket.on('user moved', function(state) {
       console.log('A user has moved in the world');
        console.log(state);
    });
});

/*
Listen on port 3000
 */
http.listen(3000, function() {
    console.log('listening on *:3000');
});
