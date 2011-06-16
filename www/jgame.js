/*
jGame utilities
*/

function createImage(id, url) {
    if(jgame.images[id]) {
        // Refresh the tileset when requested, but not anything else.
        if(id == "tileset")
            delete jgame.images[id];
        else
            return;
    }
    var i = new Image();
    jgame.images_added++;
    i.onload = function() {
        jgame.images_loaded++;
        if(jgame.images_loaded == jgame.images_added) {
            jgutils.level.init();
        }
    };
    i.src = url;
    jgame.images[id] = i;
}

var jgutils = {
    setup : function() {
        // Setup key handlers
        $(document).keydown(function(e) {

            switch(e.keyCode) {
                case 37:
                    jgame.keys.left = true;
                    break;
                case 38:
                    jgame.keys.up = true;
                    break;
                case 39:
                    jgame.keys.right = true;
                    break;
                case 40:
                    jgame.keys.down = true;
                    break;
                default:
                    var kb;
                    if(kb = jgame.keys.bindings[e.keyCode]) {
                        if(typeof kb == 'function')
                            kb();
                        else
                            for(var i=0; i<jgame.keys.bindings[e.keyCode].length; i++)
                                (jgame.keys.bindings[e.keyCode][i])();
                    }
            }

        });
        $(document).keyup(function(e) {

            switch(e.keyCode) {
                case 37:
                    jgame.keys.left = false;
                    break;
                case 38:
                    jgame.keys.up = false;
                    break;
                case 39:
                    jgame.keys.right = false;
                    break;
                case 40:
                    jgame.keys.down = false;
                    break;
            }

        });

        // Setup the jgame instance
        window.jgame = {
            fps : 30,
            cdn : 0,
            images : {},
            images_added : 0,
            images_loaded : 0,
            avatar : {
                image : "avatar",
                sprite : null,
                x : 0,
                y : 0,
                h : 65,
                w : 65,
                state : 0
            },
            follow_avatar : "local",
            keys : {
                up : false,
                down : false,
                left : false,
                right : false,
                bindings : {}
            },
            offset : {
                x : 0,
                y : 0,
                w : document.body.offsetWidth,
                h : document.body.offsetHeight
            },
            tilesize : 50
        };

        jgutils.avatars.register(
            "local",
            {
                image: "avatar",
                x:0,
                y:0,
                facing: "down",
                sprite: {
                    left : [
                        {position:4, duration:20},
                        {position:5, duration:20},
                        {position:3, duration:20}
                    ],
                    right : [
                        {position:7, duration:20},
                        {position:8, duration:20},
                        {position:6, duration:20}
                    ],
                    up : [
                        {position:10, duration:20},
                        {position:11, duration:20},
                        {position:9, duration:20}
                    ],
                    down : [
                        {position:1, duration:20},
                        {position:2, duration:20},
                        {position:0, duration:20}
                    ]
                }
            },
            true // No Draw
        );

        // Make sure it stays in sync.
        $(window).resize(function(){

            window.jgame.offset.w = document.body.offsetWidth;
            window.jgame.offset.h = document.body.offsetHeight;

            // Invalidate the cache
            jgame.updated = true;

            // Update the scene to make sure everything is onscreen.
            jgutils.level.setCenterPosition(true);

        });

    },
    user : {
        user_data : {},
        isLoggedIn : function(callback) {
            // TODO: Implement FB Connect stuff here
            jgutils.user.user_data = {"gender": "male"};
            callback(true);
        }
    },
    avatars : {
        registry : {},
        register : function(id, properties, nodraw) {
            if(!properties.dirty)
                properties.dirty = true;
            if(!properties.position)
                properties.position = properties.sprite.down[0].position;
            jgutils.avatars.registry[id] = properties;

            // Create the canvas
            var canv = document.createElement("canvas");
            canv.id = "avatar_" + id;
            canv.width = 65;
            canv.height = 65;
            canv.style.position = "absolute";
            canv.style.left = (properties.x - jgame.offset.x) + "px";
            canv.style.top = (properties.y - jgame.offset.y) + "px";

            canv.jg_hidden = false;

            document.getElementById("object_wrapper").appendChild(canv);

            properties["canvas"] = canv;
            properties["direction"] = [0, 1];
            properties["cycle_position"] = 0;
            properties["sprite_cycle"] = 0;

            if(!nodraw)
                jgutils.avatars.draw();

        },
        unregister : function(id) {
            jgutils.avatars.registry[id] = null;
            var av = document.getElementById("avatar_" + id);
            document.getElementById("object_wrapper").removeChild(av);
        },
        get : function(id) {return jgutils.avatars.registry[id];},
        get_element : function(id) {return document.getElementById("avatar_" + id);},
        draw : function(id) {
            function _draw(avatar) {
                var av = jgutils.avatars.registry[avatar];
                if(!av.dirty)
                    return;
                if(!(av.image in jgame.images))
                    return;
                var context = document.getElementById('avatar_' + avatar).getContext('2d');
                context.clearRect(0, 0, 65, 65);
                context.drawImage(jgame.images[av.image],
                                  (av.position % 3) * 32, Math.floor(av.position / 3) * 32,
                                  32, 32,
                                  0, 0,
                                  65, 65);
            }
            if(typeof id != "undefined")
                return _draw(id);
            for(var avatar in jgutils.avatars.registry)
                _draw(avatar);

        },
        refresh : function(preserved) {
            // Load up all of the avatars we want to save
            var museum = {local: jgutils.avatars.registry["local"]};
            for(var preserve in preserved)
                if(preserve in jgutils.avatars.registry)
                    museum[preserve] = jgutils.avatars.registry[preserve];

            // Iterate the rest and prune their canvas
            var object_wrapper = document.getElementById("object_wrapper");
            for(var avatar in jgutils.avatars.registry) {
                if(avatar in museum) continue;
                object_wrapper.removeChild(document.getElementById("avatar_" + avatar));
            }
            jgutils.avatars.registry = museum;

            // If we're following someone that's not preserved by
            // game logic, then break our follow.
            if(!jgame.follow_avatar in museum)
                jgame.follow_avatar = "local";


        },
        setTilePosition : function(id, x, y, resize) {
            var avatar = jgutils.avatars.registry[id];
            avatar.x = x * jgame.tilesize;
            avatar.y = y * jgame.tilesize;
            jgutils.level.setCenterPosition(resize);
        },
        reposition : function(x, y, movefollow_x, movefollow_y) {
            for(var avatar in jgutils.avatars.registry) {
                var av = jgutils.avatars.registry[avatar],
                    canv = av["canvas"],
                    follower = jgame.follow_avatar == avatar;
                var xpos = av.x + x,
                    ypos = av.y - 100 + y;
                if(xpos < -75 || ypos < -100 || xpos > jgame.offset.w || ypos > jgame.offset.h) {
                    if(!canv.jg_hidden) {
                        canv.style.display = "none";
                        canv.jg_hidden = true;
                    }
                    continue;
                } else {
                    if(canv.jg_hidden) {
                        canv.style.display = "block";
                        canv.jg_hidden = false;
                    }
                }
                if(follower && movefollow_x || !follower)
                    canv.style.left = xpos + "px";
                if(follower && movefollow_y || !follower)
                    canv.style.top = ypos + "px";
            }
        }
    },
    keys : {
        addBinding : function(keyCode, callback, multiple) {
            if(multiple) {
                var bindings = jgame.keys.bindings;
                if(!bindings[keyCode])
                    jgame.keys.bindings[keyCode] = [callback];
                else
                    jgame.keys.bindings[keyCode].push(callback);
            } else
                jgame.keys.bindings[keyCode] = callback;
        },
        clearBindings : function(keyCode) {
            jgame.keys.bindings[keyCode] = null;
        }
    },
    level : {
        init : function() {

            // Clear out whatever timer might exist
            if(jgame.drawinterval)
                clearInterval(jgame.drawinterval);

            // Ready the UI for painting (without being blocked)
            loadutils.completed()

            // Get everything looking decent and positioned correctly
            jgutils.level.update();
            jgutils.avatars.refresh();
            jgutils.avatars.draw();

            // Start everything back up
            jgutils.drawing.init();
            jgutils.timing.start();

        },
        load : function(x, y) {

            // Remove everything level-specific
            jgutils.timing.stop();

            // Load in the new level
            $.getJSON(
                'level/',
                { x : x, y : y },
                function(data) {
                    jgame['level'] = data;

                    var avatars = jgutils.avatars;
                    avatars.setTilePosition("local", data.avatar.x, data.avatar.y, true);

                    var avatar = avatars.get("local");
                    if(avatar.image != data.avatar.image) {
                        jgame.images['avatar'] = null;
                        createImage('avatar', data.avatar.image);
                    }

                    createImage("tileset", 'http://cdn' + (jgame.cdn++ % 4 + 1) + '.legendofadventure.com/tilesets/' + data.tileset);
                        jgutils.level.init();
                }
            );
        },
        update : function() {
            var bgt = document.getElementById('bg_tile');
            var dtile_h;
            var level_h = jgame.level.h * jgame.tilesize,
                level_w = jgame.level.w * jgame.tilesize;

            bgt.height = level_h;
            bgt.width = level_w;

            if(jgame.offset.h > level_h)
                jgame.offset.y = Math.floor(jgame.offset.h / 2 - level_h / 2) * -1;

            if(jgame.offset.w > level_w)
                jgame.offset.x = Math.floor(jgame.offset.w / 2 - level_w / 2) * -1;

        },
        // Centers the screen around an avatar
        setCenterPosition : function(resize) {
            var avatar = jgutils.avatars.get(jgame.follow_avatar);
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

            if(c_levelw * c_tilesize > c_offsetw) { // The scene isn't narrower than the canvas

                var half_w = c_offsetw / 2;
                var temp;

                if(x < half_w)
                    jgame.offset.x = 0;
                else if(x > (temp = (c_levelw * c_tilesize - half_w)))
                    jgame.offset.x = temp - half_w;
                else {
                    jgame.offset.x = x - half_w;
                    moveavatar_x = false;
                }

                jgame.offset.x = Math.floor(jgame.offset.x);

            } else if(resize)
                jgame.offset.x = Math.floor(c_offsetw / 2 - c_levelw * c_tilesize / 2) * -1;


            if(c_levelh * c_tilesize > c_offseth) { // The scene isn't narrower than the canvas

                var half_h = c_offseth / 2,
                    level_h = c_levelh * c_tilesize;
                var temp;

                if(y < half_h)
                    jgame.offset.y = 0;
                else if(y > (temp = (level_h - half_h)))
                    jgame.offset.y = temp - half_h;
                else {
                    jgame.offset.y = y - half_h;
                    moveavatar_y = false;
                }

                jgame.offset.y = Math.floor(jgame.offset.y);

            } else if(resize)
                jgame.offset.y = Math.floor(c_offseth / 2 - c_levelh * c_tilesize / 2) * -1;


            var n_x = jgame.offset.x * -1,
                n_y = jgame.offset.y * -1;

            var obj_cont = document.getElementById('object_container');
            var bg_tile = document.getElementById('bg_tile');

            if(!moveavatar_x || resize) {
                bg_tile.style.left = n_x + 'px';
                obj_cont.style.left = n_x + 'px';
            }
            if(!moveavatar_y || resize) {
                bg_tile.style.top = n_y + 'px';
                obj_cont.style.top = n_y + 'px';
            }

            jgutils.avatars.reposition(
                n_x, n_y,
                moveavatar_x || resize,
                moveavatar_y || resize
            );
        }
    },
    objects : {
        layers : {},
        registry : [],
        createLayer : function(name) {
            var oc = document.getElementById('object_container');

            var layer = document.createElement('canvas');
            layer.id = 'jglayer' + name;
            layer.width = jgame.level.w * jgame.tilesize;
            layer.height = jgame.level.h * jgame.tilesize;
            layer.style.position = 'absolute';
            layer.style.top = '0';
            layer.style.left = '0';
            oc.appendChild(layer);

            var x = (jgutils.objects.layers[name] = {
                obj : layer,
                child_objects : [],
                updated : false
            });

            return x;
        },
        create : function(proto, layer) {
            var l = layer ? layer : 1;
            var lay;
            if(!(l in jgutils.objects.layers))
                lay = jgutils.objects.createLayer(l);
            else
                lay = jgutils.objects.layers[l];
            var llen = lay.child_objects.length;
            lay.child_objects[llen] = proto;

            var len = jgutils.objects.registry.length;
            jgutils.objects.registry[len] = proto;

            proto['registry_proto'] = len;
            proto['registry_layer'] = layer;
            proto['registry_layer_len'] = llen;
        },
        simple_collision : function(x, y, x2, y2, radius) {
            x -= x2;
            y -= y2;
            var dist = Math.sqrt(x * x + y * y);
            return dist < radius;
        },
        update : function(proto, otick, ftick, mod_sec) {
            if(!otick)
                otick = 0;

            var updated = false;

            switch(proto.image.type) {
                case 'static':
                    proto.last_image = proto.image.image;
                    break;
                case 'sequence':
                    var ps_c, ps_st;

                    if(typeof proto.image.current == 'undefined') {
                        ps_c = proto.image['current'] = -1;
                        ps_st = proto.image['start_time'] = 0;
                    } else {
                        ps_c = proto.image.current;
                        ps_st = proto.image.start_time;
                    }

                    // We want to use ftick because otick has a max.
                    var curr = proto.image.series[ps_c];
                    var len = ftick - ps_st;
                    if(len > curr.duration) {
                        proto.image.start_time = ps_st + curr.duration;
                        ps_c++;
                        if(ps_c > proto.image.series.length)
                            ps_c = 0;
                        proto.image.current = ps_c;

                        proto.last_image = proto.image.series[ps_c].image;
                        updated = true;

                    }

                    break;
                case 'dynamic':
                    // WOW. Most. Convoluted. Assignment. Slash. Comparison. EVER.
                    updated = (proto.last_image != (proto.last_image = proto.image.callback(otick)));
                    break;
            }

            switch(proto.movement.type) {
                case 'static':
                    proto.x = proto.movement.x;
                    proto.y = proto.movement.y;
                    break;
                case 'sequence':
                    var ps_c, ps_st, ps_sx, ps_sy;

                    updated = true;

                    if(typeof proto.movement.current == 'undefined') {
                        ps_c = proto.movement['current'] = 0;
                        ps_st = proto.movement['start_time'] = ftime;
                        ps_sx = proto.movement['start_x'] = proto.x;
                        ps_sy = proto.movement['start_y'] = proto.y;
                    } else {
                        ps_c = proto.movement.current;
                        ps_st = proto.movement.start_time;
                        ps_sx = proto.movement.start_x;
                        ps_sy = proto.movement.start_y;
                    }

                    // We want to use ftick because otick has a max.
                    var curr = proto.movement.series[ps_c];
                    var len = ftick - ps_st;
                    if(len > curr.duration) {
                        proto.movement.start_time = ps_st + curr.duration;
                        len -= curr.duration;
                        ps_c++;
                        if(ps_c > proto.movement.series.length)
                            ps_c = 0;
                        proto.movement.current = ps_c;
                        curr = proto.movement.series[ps_c];
                    }

                    var perc = (len / curr.duration);

                    proto.x = (curr.x - ps_sx) * perc + ps_sx;
                    proto.y = (curr.y - ps_sy) * perc + ps_sy;

                    break;
                case 'dynamic':
                    var new_locs = proto.movement.callback(otick);

                    // We have to do this silly thing because it could jack us up if we don't.
                    var x_u = (proto.x != (proto.x = new_locs.x));
                        y_u = (proto.y != (proto.y = new_locs.y));
                    if(!updated) // Silly silly silly
                        updated = x_u || y_u; // Silliness!
                    break;
            }

            return updated;

        },
        remove : function(proto) {
            jgutils.objects.registry[proto.registry_proto] = null;
            jgutils.objects.layers[proto.registery_layer].child_objects[proto.registry_layer_len] = null;
        }
    },
    drawing : {
        init : function() {
            jgutils.drawing.redrawBackground();
        },
        forceRecenter : function() {
            jgutils.level.setCenterPosition(true);
        },
        redrawBackground : function() {
            var c = document.getElementById('bg_tile').getContext('2d');

            var image;
            var c_levlev = jgame.level.level,
                c_tilesize = jgame.tilesize,
                c_tileset = jgame.images["tileset"],
                c_tiles_w = c_tileset.width / 16,
                c_tiles_h = c_tileset.height / 16;

            var yy = 0;
            for(var y = 0; y < jgame.level.h; y++) {
                var xx = 0;
                for(var x = 0; x < jgame.level.w; x++) {

                    var sprite_y = Math.floor(c_levlev[y][x] / c_tiles_w) * 16,
                        sprite_x = (c_levlev[y][x] % c_tiles_h) * 16;

                    c.drawImage(c_tileset,
                                sprite_x, sprite_y,
                                16, 16,
                                xx, yy,
                                c_tilesize, c_tilesize)

                    xx += c_tilesize;
                }
                yy += c_tilesize;
            }
        }
    },
    timing : {
        registers : {},
        timer : null,
        last : 0,
        start : function() { jgutils.timing.timer = setInterval(jgutils.timing.tick, jgame.fps); },
        stop : function() {
            if(typeof jgutils.timing.timer == 'undefined')
                return;
            clearTimeout(jgutils.timing.timer);
            jgutils.timing.last = 0;
        },
        unregister : function(id) {jgutils.timing.registers[id] = null;},
        every : function(id, callback, seconds) {
            jgutils.timing.registers[id] = {
                id : id,
                interval : seconds,
                last_called : (new Date()).getTime(),
                callback : callback
            };
        },
        tick : function() {
            var ticks = (new Date()).getTime(),
                timing = jgutils.timing,
                objects = jgutils.objects;
            if(timing.last == 0) {
                timing.last = ticks;
                return;
            } else {
                var ms = ticks - timing.last;
                timing.last = ticks;
            }

            // Move Avatar
            var _x = 0,
                _y = 0,
                _rate = 0.15, // Pixels per millisecond
                _val = _rate * ms,
                keys = jgame.keys;
            if(keys.left == true)
                _x = -1;
            else if(keys.right == true)
                _x = 1;
            if(keys.up == true)
                _y = -1;
            else if(keys.down == true)
                _y = 1;

            // This needs to be crafted before the diagonal magic happens.
            var direction = [_x, _y];

            function get_avatar_sprite_direction(direction) {
                _x = direction[0];
                _y = direction[1];
                if(_x < 0)
                    return avatar.sprite.left;
                else if(_x > 0)
                    return avatar.sprite.right;
                else if(_y < 0)
                    return avatar.sprite.up;
                else
                    return avatar.sprite.down;
            }

            var avatar = jgutils.avatars.registry["local"];
            if(_x || _y) {
                // Prevent the avatar from moving at speeds > _val
                if(_x && _y) {
                    _x *= Math.SQRT1_2;
                    _y *= Math.SQRT1_2;
                }

                avatar.x += _x * _val;
                avatar.y += _y * _val;

                var sprite_direction = get_avatar_sprite_direction(direction)
                if(direction[0] != avatar.direction[0] || direction[1] != avatar.direction[1]) {
                    avatar.dirty = true;
                    avatar.direction = direction;
                    avatar.position = sprite_direction[1].position;
                    avatar.cycle_position = 0;
                    avatar.sprite_cycle = 0;
                    jgutils.avatars.draw("local");
                } else {
                    // TODO : This needs to be converted to jgutils.timing.every.
                    if(avatar.sprite_cycle++ == sprite_direction[avatar.cycle_position].duration) {
                        avatar.dirty = true;
                        avatar.sprite_cycle = 0;

                        avatar.cycle_position = avatar.cycle_position + 1 == 3 ? 1 : 2;
                        avatar.position = sprite_direction[avatar.cycle_position].position;

                        jgutils.avatars.draw("local");
                    }
                }
                jgutils.level.setCenterPosition();
            } else if(avatar.direction[0] || avatar.direction[1]) {
                avatar.position = get_avatar_sprite_direction(avatar.direction)[0].position;
                // So it doesn't make sense to reset the avatar's direction,
                // but it's more of a 'last known velocity' than anything.
                avatar.direction = [0, 0];
                avatar.sprite_cycle = 0;
                avatar.cycle_position = 0;
                avatar.dirty = true;
                jgutils.avatars.draw("local");
            }


            // Update Objects
            for(objid in objects.registry) {
                var obj = objects.registry[objid];

                var mod_sec = (obj.mod_seconds ? obj.mod_seconds : 1000),
                    mod_dur = (obj.mod_duration ? obj.mod_duration : 1),
                    otick = ticks / mod_dur % mod_sec;

                // Outsourced for easy update as well as setup.
                var updated = objects.update(obj, otick, ticks, mod_sec);

                if(updated)
                    objects.layers[obj.registry_layer].updated = true;

            }


            // Redraw layers
            for(l in objects.layers) {
                var layer = objects.layers[l];
                if(layer.updated) {

                    var context = layer.obj.getContext('2d');
                    context.clearRect(0,0,layer.obj.offsetWidth,layer.obj.offsetHeight);

                    for(co in layer.child_objects) {

                        var child = layer.child_objects[co];
                        context.drawImage(jgame.images[child.last_image], child.x, child.y);

                    }

                    layer.updated = false;
                }
            }

            for(var register in timing.registers) {
                var reg = timing.registers[register];
                if(ticks - reg.last_called > reg.interval / 1000) {
                    reg.callback(ticks);
                    reg.last_called = ticks;
                }
            }

        }
    }
};

var loadutils = {
    loading: function() {
        document.body.style.backgroundImage = "";
        $.blockUI({ css: {
            border: 'none',
            padding: '15px',
            backgroundColor: '#000',
            '-webkit-border-radius': '10px',
            '-moz-border-radius': '10px',
            opacity: .5,
            color: '#fff'
        } });
    },
    completed: function() {
        $.unblockUI();
    }
};
