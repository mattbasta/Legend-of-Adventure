define('comm',
    ['defer', 'events', 'guid', 'settings'],
    function(defer, events, guid, settings) {

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
        var origin;
        if (subheader === 'evt') {
            var linebreak = message.data.indexOf('\n');
            origin = message.data.substr(7, linebreak - 7);
            body = message.data.substr(linebreak + 1);
        } else {
            body = message.data.substr(3);
        }

        commMessages.fire(header, body, origin);
    };

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
            commEvents.one('level', promise.resolve);
            if (position) send('lev', position);
        });
        return promise.promise();
    };

    commEvents.messages = commMessages.endpoint();
    commEvents.ready = readyPromise.promise();

    return commEvents;
});
