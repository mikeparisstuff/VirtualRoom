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
    /*
     This is not guaranteed to be unique as it is not communicating cross client
     but should be sufficient for now.
     */
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-xxxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
}

var internalState = {
    users: [],
    sceneItems: []
};


function updateInternalState(type, state) {
    switch (type) {
        case "sceneItem":
            var obj = null;
            for (var i = 0; i < internalState.sceneItems.length; i++) {
                var o = internalState.sceneItems[i];
                if (o.name == state.name) {
                    obj = o;
                    break;
                }
            }
            if (obj != null) {
                // Maybe update name here. Not sure if that necessary yet
                obj.position = state.position;
                obj.rotation = state.rotation;
                obj.type = state.type;
                obj.params = state.params;
                obj.rotation = state.rotation;
                obj.color = state.color;
                obj.scale = state.scale;
            } else {
                // This is a new object so add it to the list of sceneItems
                internalState.sceneItems.push({
                    name: state.name,
                    type: state.type,
                    position: state.position,
                    params: state.params,
                    rotation: state.rotation,
                    color: state.color,
                    scale: state.scale
                })
            }
            break;
        case "user":
            var user = null;
            for (var j = 0; j < internalState.users.length; j++) {
                var u = internalState.users[j];
                if (u.userId == state.userId) {
                    user = u;
                    break;
                }
            }
            if (user != null) {
                user.position = state.position;
            } else {
                // If user is null still then it does not exist to create an entry
                internalState.users.push({userId: state.userId, position: state.position})
            }
            break;
    }
}

function removeUser(uid) {
    for (var i = 0; i < internalState.users.length; i ++) {
        var u = internalState.users[i];
        if (u.userId == uid) {
            internalState.users.splice(i, 1);
        }
    }
}

function removeObject(state) {
    // remove object from internal state
    for (var i = 0; i < internalState.sceneItems.length; i++) {
        var o = internalState.sceneItems[i];
        if (o.name === state.name) {
            internalState.sceneItems.splice(i, 1);
        }
    }
}

var socketToUserId = {};

/*
Socket IO routes and connections
 */
io.on('connection', function(socket) {
    console.log('a user connected');
    var uid = generateUniqueId();
    socketToUserId[socket.client.id] = uid;
    io.to(socket.client.id).emit('new user', {
        userId: uid,
        currentSceneState: internalState
    });
    /*
    Disconnect event
     */
    socket.on('disconnect', function() {
        // Remove user from internal state
        var uid = socketToUserId[socket.client.id];
        console.log('user disconnected with id: ' + uid);
        removeUser(uid);
        delete socketToUserId[socket.client.id];
        socket.broadcast.emit('user left', {userId: uid});
    });

    socket.on('object created', function(state) {
        updateInternalState('sceneItem', state);
        socket.broadcast.emit('foreign object created', state);
    });

    socket.on('object removed', function(state) {
        removeObject(state);
        socket.broadcast.emit('foreign object removed', state);
    });
    /*
    Object Moved Event
     */
    socket.on('object moved', function(state) {
        console.log('An object has moved');
        console.log(state);
        updateInternalState('sceneItem', state);
        socket.broadcast.emit('object moved', state);
    });

    socket.on('user moved', function(state) {
        console.log('A user has moved in the world');
        console.log(state);
        updateInternalState('user', state);
        socket.broadcast.emit('user moved', state);
    });

    socket.on('user joined', function(state) {
        console.log('A user has joined with id: ' + state.userId);
        updateInternalState('user', state);
        socket.broadcast.emit('user joined', state)
    })
});

/*
Listen on port 3000
 */
http.listen(3000, function() {
    console.log('listening on *:3000');
});
