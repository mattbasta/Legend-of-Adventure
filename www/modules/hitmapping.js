define('hitmapping', ['level', 'settings'], function(level, settings) {

    var tilesize = settings.tilesize;

    // TODO: Update this module to allow existing hitmap tuples to be recycled.

    function generate_x(map, x, y_orig) { // All hitmaps are assumed to be one tile space in size.
        var y = y_orig / tilesize | 0,
            y2 = ((y_orig - 1) / tilesize | 0) + 1;

        x = x / tilesize | 0;

        var x_min = -1 * tilesize,
            x_max = (map[y].length + 1) * tilesize;
        var i;
        for(i = x - 1; i >= 0; i--) {
            if(map[y][i] || map[y2][i]) {
                x_min = (i + 1) * tilesize;
                break;
            }
        }
        for(i = x + 1, rowlen = map[y].length; i < rowlen; i++) {
            if(map[y][i] || map[y2][i]) {
                x_max = i * tilesize;
                break;
            }
        }
        return [x_min, x_max];
    }

    function generate_y(map, x_orig, y) {
        var x = (x_orig / tilesize) | 0,
            x2 = (((x_orig - 1) / tilesize) | 0) + 1;

        y = ((y / tilesize) - 1) | 0;

        var y_min = 0, y_max = map.length * tilesize;
        var i;
        for(i = y; i >= 0; i--) {
            if(map[i][x] || map[i][x2]) {
                y_min = (i + 2) * tilesize;
                break;
            }
        }
        for(i = y + 1, maplen = map.length; i < maplen; i++) {
            if(map[i][x] || map[i][x2]) {
                y_max = (i + 1) * tilesize;
                break;
            }
        }
        return [y_min, y_max];
    }

    return {
        updateAvatarX: function(avatar, hitmap) {
            hitmap = hitmap || level.getHitmap();
            var y_hitmap = generate_y(hitmap, avatar.x + 7.5, avatar.y - tilesize);
            avatar.hitmap[0] = y_hitmap[0];
            avatar.hitmap[2] = y_hitmap[1] + 15;
        },
        updateAvatarY: function(avatar, hitmap) {
            hitmap = hitmap || level.getHitmap();
            var x_hitmap = generate_x(hitmap, avatar.x + 7.5, avatar.y - tilesize);
            avatar.hitmap[1] = x_hitmap[1] + 7.5;
            avatar.hitmap[3] = x_hitmap[0] - 7.5;
        }
    };
});
