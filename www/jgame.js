String.prototype.explode = function(value, count) {
    var split = this.split(value);
    if(!count || count >= split.length)
        return split;
    var last_segment = split.slice(count);
    split = split.slice(0, count);
    split.push(last_segment.join(value));
    return split;
};

var lockImages = false;
function toggleImageLock() {
    lockImages = !lockImages;
    if(!lockImages && jgame.images_loaded == jgame.images_added)
        require('load').completeTask('images');
}
function createImage(id, url) {
    if(jgame.images[id]) {
        // Refresh the tileset when requested, but not anything else.
        if(id === 'tileset' && url != jgame.images.tileset.attributes[0].value)
            delete jgame.images[id];
        else {
            if(jgame.images_loaded === jgame.images_added)
                require('load').completeTask('images');
            return;
        }
    }
    var i = new Image();
    jgame.images_added++;
    i.onload = function() {
        jgame.images_loaded++;
        if(!lockImages && jgame.images_loaded == jgame.images_added)
            require('load').completeTask('images');
    };
    i.src = url;
    jgame.images[id] = i;
}
function adjust_diagonal(direction) {
    if(direction[0] && direction[1])
        return direction.map(function(x) {return x * Math.SQRT1_2;});
    return direction;
}

var jgutils = {
    setup : function() {

        // Setup the jgame instance
        jgame.images = {};
        jgame.images_added = 0;
        jgame.images_loaded = 0;
        jgame.level = {};
        jgame.follow_avatar = "local";
        jgame.offset = {
            x : 0,
            y : 0,
            w : document.body.offsetWidth,
            h : document.body.offsetHeight
        };
        jgame.location_id = "";
        jgame.canvases = {
            output: document.getElementById("output_full"),
            terrain: document.createElement("canvas"),
            objects: document.createElement("canvas"),
            avatars: document.createElement("canvas")
        };

        jgame.show_fps = false;
        jgame.show_epu = false;
        jgame.filter_console = false;

        jgutils.avatars.register(
            "local",
            {
                image: "avatar",
                x:0,
                y:0,
                facing: "down"
            },
            true // No Draw
        );

        // Make sure it stays in sync.
        $(window).resize(function(){
            jgame.offset.w = document.body.offsetWidth;
            jgame.offset.h = document.body.offsetHeight;

            // Update the scene to make sure everything is onscreen.
            jgutils.level.update();
            jgutils.level.setCenterPosition(true);
            require('drawing').forceRedraw();
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
        avatar_offsets : {x: 0, y: 0},
        registry : {},
        draw_order : [],
        register : function(id, properties, nodraw) {
            if(!properties.dirty)
                properties.dirty = true;
            if(!properties.position)
                properties.position = jgame.avatar.sprite.down[0].position;
            if(!properties.hitmap)
                properties.hitmap = [0, Infinity, Infinity, 0];
            jgutils.avatars.registry[id] = properties;

            properties.hidden = false;
            properties.canvas = document.createElement("canvas");
            if(!("direction" in properties))
                properties.direction = [0, 1];
            properties.cycle_position = 0;
            properties.sprite_cycle = 0;

            if(!nodraw)
                jgutils.avatars.redrawAvatars();

        },
        unregister : function(id) {
            if(!(id in jgutils.avatars.registry))
                return false;
            delete jgutils.avatars.registry[id];
        },
        draw : function(id) {
            function _draw(avatar) {
                var av = jgutils.avatars.registry[avatar];
                if(!av.dirty)
                    return;
                if(!(av.image in jgame.images))
                    return;
                var context = av.canvas.getContext('2d');
                context.clearRect(0, 0, jgame.avatar.w, jgame.avatar.h);
                context.drawImage(jgame.images[av.image],
                                  (av.position % 3) * 32, ((av.position / 3) | 0) * 32,
                                  32, 32,
                                  0, 0,
                                  jgame.avatar.w, jgame.avatar.h);
            }
            if(typeof id != "undefined")
                return _draw(id);
        },
        redrawAvatars : function() {
            var dirty = false,
                avatars = [];
            var avatar;
            for(avatar in jgutils.avatars.registry) {
                var a = jgutils.avatars.registry[avatar];
                dirty = dirty || a.dirty;
                avatars[avatars.length] = jgutils.avatars.registry[avatar];
            }
            if(!dirty)
                return;

            var avatar_canvas = jgame.canvases.avatars,
                ctx = avatar_canvas.getContext("2d");
            avatars = avatars.sort(function(a, b) {return a.y - b.y;});
            ctx.clearRect(jgame.offset.x, jgame.offset.y, jgame.offset.w, jgame.offset.h);
            require('drawing').setChanged('avatars');
            for(var i = 0; i < avatars.length; i++) {
                avatar = avatars[i];
                ctx.drawImage(avatar.canvas, avatar.x - 7, avatar.y - jgame.avatar.h);
            }
        },
        get_avatar_sprite_direction : function(x, y) {
            if(x < 0)
                return jgame.avatar.sprite.left;
            else if(x > 0)
                return jgame.avatar.sprite.right;
            else if(y < 0)
                return jgame.avatar.sprite.up;
            else
                return jgame.avatar.sprite.down;
        },
        setTilePosition : function(id, x, y, resize) {
            var avatar = jgutils.avatars.registry[id];
            avatar.x = x * jgame.tilesize;
            avatar.y = y * jgame.tilesize;
            jgutils.level.setCenterPosition(resize);
        },
        setAvatarOffset : function(x, y) {jgutils.avatars.avatar_offsets = {x: x, y: y};}
    },
    level : {
        init : function() {

            // Clear out whatever timer might exist
            if(jgame.drawinterval)
                clearInterval(jgame.drawinterval);

            // Get everything looking decent and positioned correctly
            jgutils.level.update();
            require('playerStatsOverlay').redraw();
            jgutils.objects.redrawLayers();
            jgutils.avatars.redrawAvatars();

            // Start everything back up
            jgutils.level.setCenterPosition(true);

            require('timing').start();

        },
        load : function(x, y, av_x, av_y) {
            jgutils.level.preprepare();
            require('load').startTask(
                ["images", "load", "comm", "comm_reg"],
                jgutils.level.init
            );

            require('comm').register(
                x + ":" + y,  // + ":" + av_x + ":" + av_y,
                jgutils.level.prepare
            );
        },
        preprepare : function() {
            // Remove everything level-specific
            require('timing').stop();
            require('chat').stopChat();

            for (var av in jgutils.avatars.registry)
                if(av != "local")
                    jgutils.avatars.unregister(av);
            if (jgame.follow_avatar != "local")
                jgame.follow_avatar = "local";
            if (!lockImages)
                toggleImageLock();
        },
        prepare : function(data) {
            jgame.level = data;

            jgutils.objects.registry = {};
            for(var i in jgutils.objects.layers) {
                var layer = jgutils.objects.layers[i];
                layer.child_objects = {};
                layer.updated = true;
            }

            var avatar = jgutils.avatars.registry.local;
            avatar.x = jgame.level.w / 2 * jgame.tilesize;
            avatar.y = jgame.level.h / 2 * jgame.tilesize;
            console.log(avatar);
            if(data.hitmap) {
                var x_map = require('hitmapping').generate_x(data.hitmap, avatar.x * jgame.tilesize, avatar.y * jgame.tilesize),
                    y_map = require('hitmapping').generate_y(data.hitmap, avatar.x * jgame.tilesize, avatar.y * jgame.tilesize);
                avatar.hitmap = [y_map[0], x_map[1], y_map[1], x_map[0]];
            }

            var tileset_url = '/static/images/tilesets/' + data.tileset + '.png';
            createImage('tileset', tileset_url);
            toggleImageLock(); // Release the image lock.
            require('load').completeTask('load');
        },
        update : function() {
            var output_buffer = jgame.canvases.output,
                output = jgame.canvases.terrain;
            var level_h = jgame.level.h * jgame.tilesize,
                level_w = jgame.level.w * jgame.tilesize;

            // Resize the output canvas if the window size has changed.
            if(output.height != level_h ||
               output.width != level_w) {
                for(var canvas in jgame.canvases) {
                    jgame.canvases[canvas].height = level_h;
                    jgame.canvases[canvas].width = level_w;
                }
                for(var layer_id in jgutils.objects.layers) {
                    var layer = jgutils.objects.layers[layer_id];
                    layer.obj.height = level_h;
                    layer.obj.width = level_w;
                }
                //require('drawing').redrawBackground();
            }
            output_buffer.height = jgame.offset.h;
            output_buffer.width = jgame.offset.w;

            // Adjust the window offsets to recent the game.
            if(jgame.offset.h > level_h)
                jgame.offset.y = ((jgame.offset.h / 2 - level_h / 2) | 0) * -1;
            if(jgame.offset.w > level_w)
                jgame.offset.x = ((jgame.offset.w / 2 - level_w / 2) | 0) * -1;

        },
        // Centers the screen around an avatar
        setCenterPosition : function(resize) {
            var avatar = jgutils.avatars.registry[jgame.follow_avatar];
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

            var output = jgame.canvases.output,
                terrain = jgame.canvases.terrain;

            require('drawing').setState(
                Math.max(jgame.offset.x, 0), Math.max(jgame.offset.y, 0),
                Math.min(output.clientWidth, terrain.width), Math.min(output.clientHeight, terrain.height),
                Math.max(n_x, 0), Math.max(n_y, 0),
                Math.min(output.clientWidth, terrain.width), Math.min(output.clientHeight, terrain.height)
            );

            jgutils.avatars.setAvatarOffset(n_x, n_y);
        }
    },
    objects : {
        layers : {},
        registry : {},
        createLayer : function(name) {
            var layer = document.createElement('canvas');
            layer.height = jgame.canvases.objects.height;
            layer.width = jgame.canvases.objects.width;
            var x = (jgutils.objects.layers[name] = {
                obj : layer,
                child_objects : {},
                updated : false
            });

            return x;
        },
        redrawLayers : function() {
            var layers = jgutils.objects.layers,
                updated = false;
            var sortFunc = function(a, b) {
                return jgutils.objects.registry[a].y - jgutils.objects.registry[b].y;
            };
            var layer;
            for(var l in layers) {
                layer = layers[l];
                if(l > 2 || layer.updated) {
                    updated = true;
                    var context = layer.obj.getContext('2d');
                    context.clearRect(0, 0, layer.obj.width, layer.obj.height);

                    var sorted_cos = Object.keys(layer.child_objects).sort(sortFunc);
                    for(var co = 0; co < sorted_cos.length; co++) {
                        var child = layer.child_objects[sorted_cos[co]],
                            li = child.last_view;
                        if(!li)
                            continue;
                        var ii = child.image,
                            base_x = child.x + child.offset.x,
                            base_y = child.y + child.offset.y;
                        if(!(ii in jgame.images))
                            continue;

                        if("movement" in child && child.movement) {
                            var movement_offset = frameutils.get(child.movement.type, child.movement,
                                                                 require('timing').getLastTick() % 3000, 0);
                            base_x += movement_offset[0];
                            base_y += movement_offset[1];
                        }
                        if("sprite" in li)
                            context.drawImage(jgame.images[ii], li.sprite.x, li.sprite.y,
                                              li.sprite.swidth, li.sprite.sheight,
                                              base_x, base_y,
                                              child.height, child.width);
                        else
                            context.drawImage(jgame.images[li.image], child.x + child.offset.x, child.y.offset.y);
                        //context.fillStyle = "red";
                        //context.fillRect(child.x - 2, child.y - 2, 4, 4);
                        //context.fillStyle = "green";
                        //context.fillRect(child.x + child.offset.x - 2, child.y + child.offset.y - 2, 4, 4);
                    }
                    layer.updated = false;
                }
            }
            if(!updated)
                return;
            var layer_canvas = jgame.canvases.objects,
                c = layer_canvas.getContext("2d");
            c.clearRect(0, 0, layer_canvas.width, layer_canvas.height);
            require('drawing').setChanged('objects');
            for(var layer_id in layers) {
                layer = layers[layer_id].obj;
                c.drawImage(layer, 0, 0);
            }
        },
        create : function(id, proto, layer) {
            var lay;
            if(!(layer in jgutils.objects.layers))
                lay = jgutils.objects.createLayer(layer);
            else
                lay = jgutils.objects.layers[layer];
            proto.updated = true;
            proto.movement_prerender = [];
            proto.registry_layer = layer;
            proto.x *= jgame.tilesize;
            proto.y *= jgame.tilesize;
            proto.start_x = proto.x;
            proto.start_y = proto.y;
            lay.child_objects[id] = proto;
            lay.updated = true;

            // jgutils.objects.update(proto, 0, 0);

            jgutils.objects.registry[id] = proto;
        },
        simple_collision : function(x, y, x2, y2, radius) {
            x -= x2;
            y -= y2;
            var dist = Math.sqrt(x * x + y * y);
            return dist < radius;
        },
        update : function(proto, otick, speed) {
            // Speed is denoted in pixels per tick.

            if(!otick)
                otick = 0;

            var updated = proto.updated;
            proto.updated = false;

            if(!proto.view)
                return;

            if(typeof proto.view == "string")
                proto.view = jgassets[proto.view];

            var new_view = frameutils.get(proto.view.type,
                                           proto.view,
                                           otick,
                                           0); // TODO : Set this to something useful.
            if(new_view != proto.last_view) {
                updated = true;
                proto.last_view = new_view;
            }

            if(proto.x_vel || proto.y_vel) {
                updated = true;
                var adjusted_velocity = adjust_diagonal([proto.x_vel, proto.y_vel]);
                proto.x += adjusted_velocity[0] * speed * proto.speed;
                proto.y += adjusted_velocity[1] * speed * proto.speed;
            }

            return updated;

        },
        remove : function(id) {
            if(!(id in jgutils.objects.registry))
                return false;
            var proto = jgutils.objects.registry[id];
            delete jgutils.objects.registry[id];
            delete jgutils.objects.layers[proto.registry_layer].child_objects[id];
            jgutils.objects.layers[proto.registry_layer].updated = true;
            jgutils.objects.redrawLayers();
        }
    }
};

var frameutils = {
    changed : function(type, data, ticks, start_tick) {
        if(type == "static")
            return false;
        ticks -= start_ticks;
        switch(type) {
            case "sequence":
                var seconds = "positions" in data ? data.positions : 10,
                    duration = "duration" in data ? data.duration : 1,
                    otick = Math.floor(ticks / duration) % seconds;
                var old = Math.floor((ticks - 1) / duration) % seconds,
                    new_ = Math.floor(ticks / duration) % seconds;
                return old != new_;
            case "callback":
                // TODO: Once this starts getting used, a smarter means of providing
                // updates should be devised.
                return true;
        }
    },
    get : function(type, data, ticks, start_ticks) {
        ticks -= start_ticks;
        switch(type) {
            case "static":
                return data;
            case "sequence":
                var duration = "duration" in data ? data.duration : 1,
                    otick = Math.floor(ticks / duration) % data.sequence.length;
                return data.sequence[otick];
            case "callback":
                if (typeof data.callback == "string")
                    return jgassets[data.callback](ticks, data);
                else
                    return data.callback(ticks);
        }
    }
};
