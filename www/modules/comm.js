define('comm',
    ['defer', 'events', 'guid', 'load', 'settings'],
    function(defer, events, guid, load, settings) {

    var localID = guid();

    var commEvents = new events.EventTarget();
    var commMessages = new events.EventTarget();

    var readyPromise = defer();

    var socket = new WebSocket("ws://" + document.domain + ":" + settings.port + "/socket");

    socket.onopen = function(message) {
        commEvents.fire('connected', socket);
        readyPromise.resolve();
    };
    socket.onmessage = function(message) {
        var header = message.data.substr(0, 3);
        var body = message.data.substr(3);

        if (header !== 'epu' || settings.show_epu) {
            // console.log('Server message: ' +  message.data);
        }

        commMessages.fire(header, body);
    };

    // Spawn object
    commMessages.on('spa', function(body) {
        var data = body.split("\n");
        if(data[0] in jgutils.objects.registry)
            return;
        var jdata = JSON.parse(data[1]);
        jgutils.objects.create(
            data[0],
            jdata,
            jdata.layer
        );
    });

    // Location change notification
    commMessages.on('flv', function(body) {
        jgutils.level.unload();
        load.startTask(
            ["load", "comm_reg"],
            jgutils.level.init
        );
        register().done(jgutils.level.prepare);
    });

    // New level data
    commMessages.on('lev', function(body) {
        commEvents.fire('level', JSON.parse(body));
    });

    // Entity position update
    commMessages.on('epu', function(body) {
        body = body.explode(":", 1);
        var entity = jgutils.objects.registry[body[0]];
        var data = body[1].split("\n");
        if(!entity)
            return;
        for(var i = 0; i < data.length; i++) {
            var line = data[i].explode("=", 2);
            var key = line[0];
            var value = JSON.parse(line[1]);
            if(key === "x" || key === "y")
                entity[key] = value * settings.tilesize;
            else
                entity[key] = value;
        }
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
