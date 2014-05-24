define('sound', [], function() {

    // TODO: make `buzz` into a module

    var loops = {};
    var sounds = {};
    var playingLoop = null;

    return {
        loadLoop : function(name, url) {
            if(name in loops)
                return;
            loops[name] = new buzz.sound(
                url,
                {
                    formats: ["ogg", "mp3"],
                    preload: true,
                    autoload: true,
                    loop: true
                }
            );
        },
        playLoop : function(name) {
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
        loadSound : function(name, url) {
            sounds[name] = new buzz.sound(
                url,
                {formats: ["ogg", "mp3"],
                 preload: true,
                 autoload: true,
                 loop: false}
            );
        },
        playSound : function(name, distance) {
            if(!(name in sounds))
                return;
            if(distance > 25)
                return;
            var sound = sounds[name];
            var sc = sound.getStateCode();
            if(sc >= 2) {
                distance /= 2.5;
                // TODO : Make this a constant somewhere.
                sound.setVolume(100 - distance * distance);
                sound.play();
            }
        }
    };
});
