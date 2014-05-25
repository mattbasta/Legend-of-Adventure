define('avatars', ['comm', 'drawing', 'game', 'images', 'settings'], function(comm, drawing, game, images, settings) {

    var registry = {};

    // Add avatar
    comm.messages.on('add', function(body) {
        var data = body.split(':');
        register(
            data[0],
            {image: "avatar",
             sprite: registry.local.sprite,
             x: data[1] * 1,
             y: data[2] * 1},
            true
        );
        draw(data[0]);
    });

    // Remove avatar
    comm.messages.on('del', function(body) {
        if (!(body in registry)) return;
        delete registry[body];
        redrawAvatars();
    });

    // Change avatar position and direction
    comm.messages.on('loc', function(body) {
        var data = body.split(":");
        var av = registry[data[0]];
        av.x = parseInt(data[1], 10);
        av.y = parseInt(data[2], 10);
        // TODO: Make this recycle the existing direction
        var new_direction = [data[3] * 1, data[4] * 1];
        if(game.follow_avatar === data[0])
            jgutils.level.setCenterPosition(true);

        var sp_dir;
        if(!new_direction[0] && !new_direction[1] && (av.direction[0] || av.direction[1])) {
            sp_dir = getSpriteDirection(av.direction);
            av.dirty = true;
            av.position = sp_dir[0].position;
            av.cycle_position = 0;
            av.sprite_cycle = 0;

        } else if(new_direction != av.direction) {
            av.dirty = true;
            sp_dir = getSpriteDirection(new_direction);
            av.position = sp_dir[1].position;
            av.cycle_position = 0;
            av.sprite_cycle = 0;
        }

        av.direction = new_direction;
        draw(data[0]);
        redrawAvatars();
    });


    function register(id, props, nodraw) {
        props.dirty = props.dirty || true;
        props.position = props.position || game.avatar.sprite.down[0].position;
        props.direction = props.direction || [0, 1];
        props.hitmap = props.hitmap || [0, Infinity, Infinity, 0];
        props.hidden = false;
        props.cycle_position = 0;
        props.sprite_cycle = 0;

        props.canvas = document.createElement("canvas");

        registry[id] = props;

        if (!nodraw) redrawAvatars();
    }

    function draw(avatar) {
        var av = registry[avatar];
        if(!av.dirty) return;

        var context = av.canvas.getContext('2d');
        images.waitFor(av.image).done(function(sprite) {
            context.clearRect(0, 0, jgame.avatar.w, jgame.avatar.h);
            context.drawImage(sprite,
                              (av.position % 3) * 32, ((av.position / 3) | 0) * 32,
                              32, 32, 0, 0,
                              jgame.avatar.w, jgame.avatar.h);
        });
    }

    function redrawAvatars() {
        var dirty = false;
        var avatars = [];

        var avatar;
        for (avatar in registry) {
            var a = registry[avatar];
            dirty = dirty || a.dirty;
            avatars.push(a);
        }
        if(!dirty) return;

        var canvas = game.canvases.avatars;
        var ctx = canvas.getContext("2d");
        ctx.clearRect(game.offset.x, game.offset.y, game.offset.w, game.offset.h);

        // Sort such that avatars with a lower Y are further back.
        avatars = avatars.sort(function(a, b) {
            return a.y - b.y;
        });
        drawing.setChanged('avatars');
        for(var i = 0; i < avatars.length; i++) {
            avatar = avatars[i];
            ctx.drawImage(avatar.canvas, avatar.x - 7, avatar.y - game.avatar.h);
        }
    }

    function getFollowing() {
        return registry[game.follow_avatar];
    }

    function getSpriteDirection(x, y) {
        if (x < 0)
            return game.avatar.sprite.left;
        else if (x > 0)
            return game.avatar.sprite.right;
        else if (y < 0)
            return game.avatar.sprite.up;
        else
            return game.avatar.sprite.down;
    }

    return {
        redrawAvatars: redrawAvatars,
        unregisterAll: function() {
            for (var avatar in registry) {
                if (avatar === 'local') continue;
                delete registry[avatar];
            }
        },
        getLocal: function() {
            return registry.local;
        },
        getFollowing: getFollowing,
        getSpriteDirection: getSpriteDirection,
        register: register,
        draw: draw,
        tick: function() {
            var doRedrawAVS = false;

            var spriteDirection;
            var a;
            var a_x;
            var a_y;
            for (var av in registry) {
                var a = registry[av];
                var a_x = a.direction[0];
                var a_y = a.direction[1];
                if (!a_x && !a_y) continue;

                if (av !== 'local') {
                    if (a_x && a_y) {
                        a_x *= Math.SQRT1_2;
                        a_y *= Math.SQRT1_2;
                    }
                    a.x += a_x * speed;
                    a.y += a_y * speed;
                }

                spriteDirection = getSpriteDirection(a.direction);
                if (a.sprite_cycle++ === spriteDirection[a.cycle_position].duration) {
                    a.dirty = true;
                    a.sprite_cycle = 0;
                    a.cycle_position = a.cycle_position + 1 === 3 ? 1 : 2;
                    a.position = spriteDirection[a.cycle_position].position;
                    draw(av);
                }
                doRedrawAVS = true;
            }

            return doRedrawAVS;
        }
    };
});
