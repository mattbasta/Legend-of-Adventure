String.prototype.explode = function(value, count) {
    var split = this.split(value);
    if(!count || count >= split.length)
        return split;
    var last_segment = split.slice(count);
    split = split.slice(0, count);
    split.push(last_segment.join(value));
    return split;
};

// Make sure it stays in sync.
$(window).resize(function(){
    jgame.offset.w = document.body.offsetWidth;
    jgame.offset.h = document.body.offsetHeight;

    // Update the scene to make sure everything is onscreen.
    jgutils.level.setCenterPosition(true);
});

var jgutils = {
    setup : function() {

        // Setup the jgame instance
        jgame.level = {};
        jgame.offset = {
            x : 0,
            y : 0,
            w : document.body.offsetWidth,
            h : document.body.offsetHeight
        };

    },
    level : {
        init : function() {
            jgutils.level.setCenterPosition();
            require('defer').when(
                require('playerStatsOverlay').redraw(), // Redraw the player stats menu
                require('objects').redrawLayers(), // Redraw objects on the screen
                require('avatars').redrawAvatars(), // Redraw avatars on the screen
                require('drawing').redrawBackground() // Redraw terrain
            ).done(function() {
                // Start everything back up
                jgutils.level.setCenterPosition();
                require('drawing').start();
                require('timing').start();
            });

        },
        load : function(x, y, av_x, av_y) {
            jgutils.level.unload();
            require('load').startTask(
                ["load", "comm", "comm_reg"],
                jgutils.level.init
            );

            require('comm').register(
                x + ":" + y,  // + ":" + av_x + ":" + av_y,
                jgutils.level.prepare
            );
        },
        unload : function() {
            // Remove everything level-specific
            require('drawing').stop();
            require('timing').stop();
            require('chat').stopChat();

            require('avatars').unregisterAll();
            require('avatars').resetFollow();
        },
        prepare : function(data) {
            jgame.level = data;
            require('canvases').setSizes(data.w * jgame.tilesize, data.h * jgame.tilesize);
            require('objects').setLayerSizes(data.w * jgame.tilesize, data.h * jgame.tilesize);

            require('objects').clear();

            var avatar = require('avatars').getLocal();
            avatar.x = jgame.level.w / 2 * jgame.tilesize;
            avatar.y = jgame.level.h / 2 * jgame.tilesize;
            if(data.hitmap) {
                var x_map = require('hitmapping').generate_x(data.hitmap, avatar.x, avatar.y),
                    y_map = require('hitmapping').generate_y(data.hitmap, avatar.x, avatar.y);
                avatar.hitmap = [y_map[0], x_map[1], y_map[1], x_map[0]];
            }

            require('load').completeTask('load');
        },
        // Centers the screen around an avatar
        setCenterPosition : function(resize) {
            var output_buffer = require('canvases').getCanvas('output');
            var level_h = jgame.level.h * jgame.tilesize,
                level_w = jgame.level.w * jgame.tilesize;

            // Resize the terrain canvas if the window size has changed.
            output_buffer.height = jgame.offset.h;
            output_buffer.width = jgame.offset.w;

            if(jgame.offset.h > level_h)
                jgame.offset.y = ((jgame.offset.h / 2 - level_h / 2) | 0) * -1;
            if(jgame.offset.w > level_w)
                jgame.offset.x = ((jgame.offset.w / 2 - level_w / 2) | 0) * -1;

            var avatar = require('avatars').getFollowing();
            var x = avatar.x,
                y = avatar.y;

            // Level isn't loaded, but the window is resizing.
            if(typeof jgame.level == 'undefined')
                return;

            var c_tilesize = jgame.tilesize,
                c_levelw = jgame.level.w,
                c_levelh = jgame.level.h,
                c_offsetw = jgame.offset.w,
                c_offseth = jgame.offset.h;

            var moveavatar_x = true,
                moveavatar_y = true;

            var temp;

            if(c_levelw * c_tilesize > c_offsetw) { // The scene isn't narrower than the canvas

                var half_w = c_offsetw / 2;

                if(x < half_w)
                    jgame.offset.x = 0;
                else if(x > (temp = (c_levelw * c_tilesize - half_w)))
                    jgame.offset.x = temp - half_w;
                else {
                    jgame.offset.x = x - half_w;
                    moveavatar_x = false;
                }

                jgame.offset.x = jgame.offset.x | 0;

            } else if(resize)
                jgame.offset.x = ((c_offsetw / 2 - c_levelw * c_tilesize / 2) | 0) * -1;


            if(c_levelh * c_tilesize > c_offseth) { // The scene isn't narrower than the canvas

                var half_h = c_offseth / 2,
                    level_h = c_levelh * c_tilesize;

                if(y < half_h)
                    jgame.offset.y = 0;
                else if(y > (temp = (level_h - half_h)))
                    jgame.offset.y = temp - half_h;
                else {
                    jgame.offset.y = y - half_h;
                    moveavatar_y = false;
                }

                jgame.offset.y = jgame.offset.y | 0;

            } else if(resize)
                jgame.offset.y = Math.floor(c_offseth / 2 - c_levelh * c_tilesize / 2) * -1;


            var n_x = jgame.offset.x * -1,
                n_y = jgame.offset.y * -1;

            require('drawing').setState(
                Math.max(jgame.offset.x, 0), Math.max(jgame.offset.y, 0),
                Math.min(output_buffer.clientWidth, level_w), Math.min(output_buffer.clientHeight, level_h),
                Math.max(n_x, 0), Math.max(n_y, 0),
                Math.min(output_buffer.clientWidth, level_w), Math.min(output_buffer.clientHeight, level_h)
            );
        }
    }
};
