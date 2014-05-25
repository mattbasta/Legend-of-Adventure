define('comm',
    ['defer', 'events', 'guid', 'load', 'settings', 'sound'],
    function(defer, events, guid, load, settings, sound) {

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

    // Add avatar
    commMessages.on('add', function(body) {
        var data = body.split(':');
        jgutils.avatars.register(
            data[0],
            {image: "avatar",
             facing: "down",
             direction: [0, 0],
             sprite: jgutils.avatars.registry.local.sprite,
             dirty: true,
             x: data[1] * 1,
             y: data[2] * 1},
            true
        );
        jgutils.avatars.draw(data[0]);
    });

    // Remove avatar
    commMessages.on('del', function(body) {
        var data = body.split(':');
        var sX = parseFloat(data[1]);
        var sY = parseFloat(data[2]);
        var follow_av = jgutils.avatars.registry[require('game').follow_avatar],
            dist = Math.sqrt(Math.pow(s_x - follow_av.x, 2) + Math.pow(s_y - follow_av.y, 2));
        dist /= settings.tilesize;
        sound.playSound(data[0], dist);
    });

    // Change avatar position and direction
    commMessages.on('loc', function(body) {
        var data = body.split(":");
        var av = jgutils.avatars.registry[data[0]];
        av.x = parseInt(data[1], 10);
        av.y = parseInt(data[2], 10);
        var new_direction = [data[3] * 1, data[4] * 1];
        if(require('game').follow_avatar == data[0])
            jgutils.level.setCenterPosition(true);

        var sp_dir;
        if(!new_direction[0] && !new_direction[1] && (av.direction[0] || av.direction[1])) {
            sp_dir = jgutils.avatars.get_avatar_sprite_direction(av.direction);
            av.dirty = true;
            av.position = sp_dir[0].position;
            av.cycle_position = 0;
            av.sprite_cycle = 0;
        } else if(new_direction != av.direction) {
            av.dirty = true;
            sp_dir = jgutils.avatars.get_avatar_sprite_direction(new_direction);
            av.position = sp_dir[1].position;
            av.cycle_position = 0;
            av.sprite_cycle = 0;
        }
        av.direction = new_direction;
        jgutils.avatars.draw(data[0]);
        jgutils.avatars.redrawAvatars();
    });

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
