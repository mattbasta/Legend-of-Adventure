define('settings', [], function() {
    'use strict';

    return {
        init_module: 'game',
        port: 80,
        fps: 30,
        speed: 0.3,
        tilesize: 50,
        tilesPerRow: 5,
        tilesetTileSize: 16, // The size of a tile in the tileset
        terrainChunkSize: 15,

        show_epu: false,
        show_fps: false,
        show_hitmap: false,
        show_hitmappings: false,

        scales: {
            terrain: 16 / 50,
            entities: 32 / 50,
            objects: 1
        },

        avatar: {
            image: "avatar",
            h: 65,
            w: 65,
            sprite: {
                left: [
                    {position:4, duration:5},
                    {position:5, duration:5},
                    {position:3, duration:5}
                ],
                right: [
                    {position:7, duration:5},
                    {position:8, duration:5},
                    {position:6, duration:5}
                ],
                up: [
                    {position:10, duration:5},
                    {position:11, duration:5},
                    {position:9, duration:5}
                ],
                down: [
                    {position:1, duration:5},
                    {position:2, duration:5},
                    {position:0, duration:5}
                ]
            }
        },

        set: function(settings) {
            for (var setting in settings) {
                this[setting] = settings[setting];
            }
        }
    };
});
