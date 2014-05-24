define('hitmapping', ['game'], function(game) {

    // TODO: Update this module to allow existing hitmap tuples to be recycled.

    return {
        generate_x : function(map, x, y_orig) { // All hitmaps are assumed to be one tile space in size.

            var ts = game.tilesize,
                y = y_orig / ts | 0,
                y2 = ((y_orig - 1) / ts | 0) + 1;

            x = x / ts | 0;

            var x_min = -1 * ts,
                x_max = (map[y].length + 1) * ts;
            var i;
            for(i = x - 1; i >= 0; i--) {
                if(map[y][i] || map[y2][i]) {
                    x_min = (i + 1) * ts;
                    break;
                }
            }
            for(i = x + 1, rowlen = map[y].length; i < rowlen; i++) {
                if(map[y][i] || map[y2][i]) {
                    x_max = i * ts;
                    break;
                }
            }
            //console.log("(result_translated): " + (x_min / game.tilesize) + ", " + (x_max / game.tilesize));
            return [x_min, x_max];
        },
        generate_y : function(map, x_orig, y) {
            var ts = game.tilesize,
                x = (x_orig / ts) | 0,
                x2 = (((x_orig - 1) / ts) | 0) + 1;

            y = ((y / ts) - 1) | 0;

            var y_min = 0, y_max = map.length * game.tilesize;
            var i;
            for(i = y; i >= 0; i--) {
                if(map[i][x] || map[i][x2]) {
                    y_min = (i + 2) * ts;
                    break;
                }
            }
            for(i = y + 1, maplen = map.length; i < maplen; i++) {
                if(map[i][x] || map[i][x2]) {
                    y_max = (i + 1) * ts;
                    break;
                }
            }
            //console.log("(result_translated): " + (y_min / game.tilesize) + ", " + (y_max / game.tilesize));
            return [y_min, y_max];
        }
    };
});
