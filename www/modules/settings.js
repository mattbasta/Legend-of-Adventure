define('settings', [], function() {
    return {
        init_module: 'game',
        port: 80,
        fps: 30,
        speed: 0.2,
        tilesize: 50,
        tilesetTileSize: 16,  // The size of a tile in the tileset

        show_epu: false,
        show_fps: false,

        scales: {
            terrain: 16 / 50,
            avatars: 32 / 50,
            objects: 1
        },

        set: function(settings) {
            for (var setting in settings) {
                this[setting] = settings[setting];
            }
        }
    };
});
