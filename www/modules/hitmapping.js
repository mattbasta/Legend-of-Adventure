define('hitmapping', ['level', 'settings'], function(level, settings) {
    'use strict';

    var HITMAP_BUFFER = 1 / settings.tilesize;

    return {
        updateAvatarX: function(avatar, hitmap) {
            hitmap = hitmap || level.getHitmap();

            var y = avatar.y - (avatar.height * 0.5 / settings.tilesize) | 0;
            var xLeft = avatar.x + HITMAP_BUFFER | 0;
            var xRight = avatar.x + (avatar.width / settings.tilesize) - HITMAP_BUFFER | 0;

            var yMin = 0;
            var yMax = hitmap.length;

            var i;
            var maplen;
            for(i = y; i >= 0; i--) {
                if(hitmap[i][xLeft] || hitmap[i][xRight]) {
                    yMin = i + 1;
                    break;
                }
            }
            for(i = y + 1, maplen = hitmap.length; i < maplen; i++) {
                if(hitmap[i][xLeft] || hitmap[i][xRight]) {
                    yMax = i;
                    break;
                }
            }
            avatar.hitmap[0] = yMin;
            avatar.hitmap[2] = yMax;
        },
        updateAvatarY: function(avatar, hitmap) {
            hitmap = hitmap || level.getHitmap();

            var yBottom = avatar.y - HITMAP_BUFFER | 0;
            var yTop = avatar.y - (avatar.height / settings.tilesize) + HITMAP_BUFFER | 0;

            var x = avatar.x + HITMAP_BUFFER | 0;

            var xMin = 0;
            var xMax = hitmap[yBottom].length;

            var i;
            var rowlen;
            for(i = x - 1; i >= 0; i--) {
                if(hitmap[yBottom][i] || hitmap[yTop][i]) {
                    xMin = i + 1;
                    break;
                }
            }
            for(i = x + 1, rowlen = hitmap[yBottom].length; i < rowlen; i++) {
                if(hitmap[yBottom][i] || hitmap[yTop][i]) {
                    xMax = i;
                    break;
                }
            }
            avatar.hitmap[3] = xMin;
            avatar.hitmap[1] = xMax;
        }
    };
});
