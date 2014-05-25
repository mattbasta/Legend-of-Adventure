define('hitmapping', ['settings'], function(settings) {

    var tilesize = settings.tilesize;

    // TODO: Update this module to allow existing hitmap tuples to be recycled.

    return {
        generate_x : function(map, x, y_orig) { // All hitmaps are assumed to be one tile space in size.

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
        },
        generate_y : function(map, x_orig, y) {
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
    };
});
