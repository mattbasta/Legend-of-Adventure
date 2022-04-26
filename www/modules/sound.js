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
                formats: ["mp3"],
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
    loadSound('chest_smash', 'static/sounds/chest_smash');
    loadSound('hit_grunt0', 'static/sounds/hit_grunt0');
    loadSound('hit_grunt1', 'static/sounds/hit_grunt1');
    loadSound('hit_grunt2', 'static/sounds/hit_grunt2');
    loadSound('hit_grunt3', 'static/sounds/hit_grunt3');
    loadSound('pot_smash', 'static/sounds/pot_smash');
    loadSound('pot_smash', 'static/sounds/pot_smash');
    loadSound('potion0', 'static/sounds/potion0');
    loadSound('potion1', 'static/sounds/potion1');
    loadSound('wolf_howl', 'static/sounds/wolf_howl');
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
            sound.setVolume(Math.max(100 - distance * distance, 0));
            sound.play();
        }
    }

    // loadLoop('daylight', 'static/music/daylight');
    // playLoop('daylight');

    return {
        loadLoop: loadLoop,
        playLoop: function(name) {
            if(playingLoop == name)
                return;

            if(!playingLoop) {
                loops[name].play().setVolume(0).fadeTo(10, 1000);
                playingLoop = name;
                return;
            }

            loops[playingLoop].fadeOut(2000, function() {
                playingLoop = name;
                // FIXME: Bad things might happen if playLoop is called again
                // within four seconds of it being called once.
                loops[name].play().setVolume(0).fadeTo(20, 2000);
            });
        },
        playSound: playSound
    };
});
