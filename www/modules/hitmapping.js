define('hitmapping', ['level', 'settings'], function(level, settings) {
    'use strict';

    var tilesize = settings.tilesize;

    return {
        updateAvatarX: function(avatar, hitmap) {
            hitmap = hitmap || level.getHitmap();

            var x_orig = avatar.x + 7.5;
            var x = x_orig / tilesize | 0;
            var y = ((avatar.y) / tilesize) - 1| 0;
            var x2 = (((x_orig - 1) / tilesize) | 0) + 1;

            var y_min = 0, y_max = hitmap.length * tilesize;
            var i;
            var maplen;
            for(i = y; i >= 0; i--) {
                if(hitmap[i][x] || hitmap[i][x2]) {
                    y_min = (i + 1) * tilesize;
                    break;
                }
            }
            for(i = y + 1, maplen = hitmap.length; i < maplen; i++) {
                if(hitmap[i][x] || hitmap[i][x2]) {
                    y_max = (i) * tilesize;
                    break;
                }
            }
            avatar.hitmap[0] = y_min;
            avatar.hitmap[2] = y_max;
        },
        updateAvatarY: function(avatar, hitmap) {
            hitmap = hitmap || level.getHitmap();

            var y_orig = avatar.y - tilesize;
            var x = (avatar.x + 7.5) / tilesize | 0;
            var y = y_orig / tilesize | 0;
            var y2 = ((y_orig - 1) / tilesize | 0) + 1;

            var x_min = -1 * tilesize,
                x_max = (hitmap[y].length + 1) * tilesize;
            var i;
            var rowlen;
            for(i = x - 1; i >= 0; i--) {
                if(hitmap[y][i] || hitmap[y2][i]) {
                    x_min = (i + 1) * tilesize - 7.5;
                    break;
                }
            }
            for(i = x + 1, rowlen = hitmap[y].length; i < rowlen; i++) {
                if(hitmap[y][i] || hitmap[y2][i]) {
                    x_max = i * tilesize + 7.5;
                    break;
                }
            }
            avatar.hitmap[3] = x_min;
            avatar.hitmap[1] = x_max;
        }
    };
});
