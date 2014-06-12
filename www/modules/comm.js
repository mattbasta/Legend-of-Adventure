define('comm',
    ['defer', 'events', 'guid', 'load', 'settings', 'sound'],
    function(defer, events, guid, load, settings, sound) {

    'use strict';

    var localID = guid();

    var commEventsRaw = new events.EventTarget();
    var commEvents = commEventsRaw.endpoint();
    var commMessages = new events.EventTarget();

    var readyPromise = defer();

    var socket = new WebSocket("ws://" + document.domain + ":" + settings.port + "/socket");

    socket.onopen = function(message) {
        commEventsRaw.fire('connected', socket);
        readyPromise.resolve();
    };
    socket.onmessage = function(message) {
        var header = message.data.substr(0, 3);
        var subheader = message.data.substr(3, 3);
        var body;
        if (subheader === 'evt') {
            body = message.data.substr(message.data.indexOf('\n') + 1);
        } else {
            body = message.data.substr(3);
        }

        if (header !== 'epu' || settings.show_epu) {
            // console.log('Server message: ' +  message.data);
        }

        commMessages.fire(header, body);
    };

    // Play sound
    commMessages.on('snd', function(body) {
        var data = body.split(':');
        var sX = parseFloat(data[1]);
        var sY = parseFloat(data[2]);
        var follow_av = getFollowing();
        var dist = Math.sqrt(Math.pow(s_x - follow_av.x, 2) + Math.pow(s_y - follow_av.y, 2));
        dist /= settings.tilesize;
        sound.playSound(data[0], dist);
    });

    // Error
    commMessages.on('err', function(body) {
        console.error('Server error: ' + body);
    });


    // Assign members for outside interaction:
    var send = commEvents.send = function(header, body) {
        socket.send(header + '\n' + body);
    };
    var register = commEvents.register = function(position, callback) {
        var promise = defer();
        if (callback) {
            promise.done(callback);
        }
        readyPromise.done(function() {
            commEvents.one('level', function(levelData) {
                load.completeTask('comm_reg');
                promise.resolve(levelData);
            });

            if (position) send('lev', position);

            load.completeTask('comm');
        });
        return promise.promise();
    };

    commEvents.messages = commMessages.endpoint();
    commEvents.ready = readyPromise.promise();

    return commEvents;
});
