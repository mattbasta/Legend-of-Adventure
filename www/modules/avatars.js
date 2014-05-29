define('avatars',
    ['canvases', 'comm', 'drawing', 'hitmapping', 'images', 'level', 'offset', 'settings'],
    function(canvases, comm, drawing, hitmapping, images, level, offset, settings) {

    var registry = {};
    var follow = 'local';

    var avatarHeight = 32;
    var avatarWidth = 32;
    var avatarBodyOffset = -7;
    var avatarScale = settings.scales.avatars;

    // Add avatar
    comm.messages.on('add', function(body) {
        var data = body.split(' ');
        if (data[0] !== 'player') return;
        register(
            data[1],
            {
                image: "avatar",
                sprite: registry.local.sprite,
                x: data[2] * settings.tilesize,
                y: data[3] * settings.tilesize,
                velocity: [data[4] | 0, data[5] | 0],
                direction: [data[6] | 0, data[7] | 0],
            },
            true
        );
    });

    // Remove avatar
    comm.messages.on('del', function(body) {
        if (!(body in registry)) return;
        delete registry[body];
        redrawAvatars();
    });

    // Change avatar position and direction
    comm.messages.on('loc', function(body) {
        var data = body.split(" ");
        var av = registry[data[0]];
        av.x = data[1] * settings.tilesize;
        av.y = data[2] * settings.tilesize;

        var oldVX = av.velocity[0];
        var oldVY = av.velocity[1];

        av.velocity[0] = data[3] | 0;
        av.velocity[1] = data[4] | 0;
        av.direction[0] = data[5] | 0;
        av.direction[1] = data[6] | 0;

        if (follow === data[0])
            require('level').setCenterPosition();

        var sp_dir;
        if (!av.velocity[0] && !av.velocity[1] && (oldVX || oldVY)) {
            sp_dir = getSpriteDirection(av.direction);
            av.position = sp_dir[0].position;

        } else {
            sp_dir = getSpriteDirection(av.direction);
            av.position = sp_dir[1].position;
        }
        av.cycle_position = 0;
        av.sprite_cycle = 0;

        draw(data[0]);
        redrawAvatars();
    });


    function register(id, props, nodraw) {
        props.position = props.position || settings.avatar.sprite.down[0].position;
        props.velocity = props.velocity || [0, 0];
        props.direction = props.direction || [0, 1];
        props.hitmap = props.hitmap || [0, Infinity, Infinity, 0];
        props.dirty = true;
        props.hidden = false;
        props.cycle_position = 0;
        props.sprite_cycle = 0;

        props.canvas = document.createElement("canvas");

        registry[id] = props;
        draw(id);

        if (!nodraw) redrawAvatars();
    }

    function draw(avatar) {
        var av = registry[avatar];
        var context = av.canvas.getContext('2d');
        context.imageSmoothingEnabled = false;
        context.mozImageSmoothingEnabled = false;
        context.webkitImageSmoothingEnabled = false;

        images.waitFor(av.image).done(function(sprite) {
            context.clearRect(0, 0, settings.avatar.w, settings.avatar.h);
            context.drawImage(
                sprite,
                (av.position % 3) * avatarWidth, (av.position / 3 | 0) * avatarHeight, avatarWidth, avatarHeight,
                0, 0, avatarWidth, avatarHeight
            );
            av.dirty = true;
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
        if (!dirty) return;

        var ctx = canvases.getContext('avatars');
        ctx.clearRect(
            offset.x * avatarScale,
            offset.y * avatarScale,
            offset.w * avatarScale,
            offset.h * avatarScale
        );

        if (avatars.length > 1) {
            // Sort such that avatars with a lower Y are further back.
            avatars.sort(function(a, b) {
                return a.y - b.y;
            });
        }
        drawing.setChanged('avatars');
        for(var i = 0; i < avatars.length; i++) {
            avatar = avatars[i];
            ctx.drawImage(
                avatar.canvas,
                (avatar.x + avatarBodyOffset) * avatarScale,
                (avatar.y - avatarHeight) * avatarScale
            );
            avatar.dirty = false;
        }
    }

    function getFollowing() {
        return registry[follow];
    }

    function getSpriteDirection(x, y) {
        if (x < 0)
            return settings.avatar.sprite.left;
        else if (x > 0)
            return settings.avatar.sprite.right;
        else if (y < 0)
            return settings.avatar.sprite.up;
        else
            return settings.avatar.sprite.down;
    }

    register(
        "local",
        {
            image: "avatar",
            x: 0,
            y: 0,
            facing: "down",
            direction: [0, 0]
        },
        true // No Draw
    );

    level.on('newLevel', function(width, height, hitmap) {
        var avatar = registry.local;
        avatar.x = width / 2;
        avatar.y = height / 2;
        if(hitmap) {
            hitmapping.updateAvatarX(avatar, hitmap);
            hitmapping.updateAvatarY(avatar, hitmap);
        }
    });

    level.on('redraw', redrawAvatars);
    level.on('unload', function() {
        for (var avatar in registry) {
            if (avatar === 'local') continue;
            delete registry[avatar];
        }
        follow = 'local';
    });

    return {
        redrawAvatars: redrawAvatars,
        getLocal: function() {
            return registry.local;
        },
        getFollowing: getFollowing,
        getSpriteDirection: getSpriteDirection,
        register: register,
        draw: draw,
        tick: function(speed) {
            var doRedrawAVS = false;

            var spriteDirection;
            var a;
            var a_x;
            var a_y;
            for (var av in registry) {
                a = registry[av];
                a_x = a.velocity[0];
                a_y = a.velocity[1];
                if (!a_x && !a_y) continue;

                if (av !== 'local') {
                    if (a_x && a_y) {
                        a_x *= Math.SQRT1_2;
                        a_y *= Math.SQRT1_2;
                    }
                    a.x += a_x * speed;
                    a.y += a_y * speed;
                }

                spriteDirection = getSpriteDirection(a.direction[0], a.direction[1]);
                if (a.sprite_cycle++ === spriteDirection[a.cycle_position].duration) {
                    a.dirty = true;
                    a.sprite_cycle = 0;
                    a.cycle_position = a.cycle_position + 1 === 3 ? 1 : 2;
                    a.position = spriteDirection[a.cycle_position].position;
                    draw(av);
                }
                a.dirty = true;
                doRedrawAVS = true;
            }

            return doRedrawAVS;
        },
        resetFollow: function() {
            follow = 'local';
        }
    };
});
