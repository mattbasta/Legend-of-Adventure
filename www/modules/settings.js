define('settings', [], function() {
    return {
        init_module: 'game',
        port: 80,
        fps: 30,
        speed: 0.2,
        tilesize: 50,

        show_epu: false,
        show_fps: false,

        set: function(settings) {
            for (var setting in settings) {
                this[setting] = settings[setting];
            }
        }
    };
});
