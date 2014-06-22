define('sound', ['buzz', 'comm', 'entities'], function(buzz, comm, entities) {
    'use strict';

    var sounds = {};
    var loops = {};
    var playingLoop = null;

    function loadSound(name, url) {
        if(name in sounds) return;
        sounds[name] = new buzz.sound(
            url,
            {
                formats: ["ogg", "mp3"],
                preload: true,
                autoload: true,
                loop: false
            }
        );
    }

    // Play sound
    comm.messages.on('snd', function(body) {
        var data = body.split(':');
        var sX = parseFloat(data[1]);
        var sY = parseFloat(data[2]);
        var following = entities.getFollowing();
        var dist = Math.sqrt(Math.pow(sX - following.x, 2) + Math.pow(sY - following.y, 2));
        playSound(data[0], dist);
    });

    loadSound('bleat', 'static/sounds/bleat');
    loadSound('zombie_groan', 'static/sounds/zombie_groan');
    loadSound('zombie_attack', 'static/sounds/zombie_attack');

    function loadLoop(name, url) {
        if(name in loops) return;
        loops[name] = new buzz.sound(
            url,
            {
                formats: ["ogg", "mp3"],
                preload: true,
                autoload: true,
                loop: true
            }
        );
    }

    function playSound(name, distance) {
        if(!(name in sounds))
            return;
        if(distance > 25)
            return;
        var sound = sounds[name];
        var sc = sound.getStateCode();
        if(sc >= 2) {
            distance /= 2.5;
            // TODO: Make this a constant somewhere.
            sound.setVolume(100 - distance * distance);
            sound.play();
        }
    }

    // loadLoop('daylight', 'static/music/daylight');
    // playLoop('daylight');

    return {
        loadLoop: loadLoop,
        playLoop: function(name) {
            if(playing_loop == name)
                return;

            if(!playing_loop) {
                loops[name].play().setVolume(0).fadeTo(10, 1000);
                playing_loop = name;
                return;
            }

            loops[playing_loop].fadeOut(2000, function() {
                playing_loop = name;
                // FIXME: Bad things might happen if playLoop is called again
                // within four seconds of it being called once.
                loops[name].play().setVolume(0).fadeTo(20, 2000);
            });
        },
        playSound: playSound
    };
});
