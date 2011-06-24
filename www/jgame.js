/*
jGame utilities
*/

function S4() {return (((1+Math.random())*0x10000)|0).toString(16).substring(1);}
// Simplified GUID function
function guid() {return S4()+S4()+S4()+S4();}

function createImage(id, url) {
    if(jgame.images[id]) {
        // Refresh the tileset when requested, but not anything else.
        if(id == "tileset" && url != jgame.images["tileset"].attributes[0].value)
            delete jgame.images[id];
        else
            if(jgame.images_loaded == jgame.images_added)
                loadutils.complete_task("images");
            return;
    }
    var i = new Image();
    jgame.images_added++;
    i.onload = function() {
        jgame.images_loaded++;
        if(jgame.images_loaded == jgame.images_added)
            loadutils.complete_task("images");
    };
    i.src = url;
    jgame.images[id] = i;
}

var jgutils = {
    setup : function() {

        chatutils._tb = document.getElementById("talkbar");
        chatutils._cb = document.getElementById("chatbox");

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
                                return (jgame.keys.bindings[e.keyCode][i])();
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
            port : 80,
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
        avatar_offsets : {x: 0, y: 0},
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
            if(!(id in jgutils.avatars.registry))
                return;
            delete jgutils.avatars.registry[id];
            var av = document.getElementById("avatar_" + id);
            av.parentNode.removeChild(av);
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
        setTilePosition : function(id, x, y, resize) {
            var avatar = jgutils.avatars.registry[id];
            avatar.x = x * jgame.tilesize;
            avatar.y = y * jgame.tilesize;
            jgutils.level.setCenterPosition(resize);
        },
        setAvatarOffset : function(x, y) {jgutils.avatars.avatar_offsets = {x: x, y: y};},
        reposition : function(movefollow_x, movefollow_y) {
            var x = jgutils.avatars.avatar_offsets.x,
                y = jgutils.avatars.avatar_offsets.y;
            for(var avatar in jgutils.avatars.registry) {
                var av = jgutils.avatars.registry[avatar],
                    canv = av["canvas"],
                    follower = jgame.follow_avatar == avatar;
                var xpos = av.x + x,
                    ypos = av.y - 65 + y;
                /*
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
                */
                if(follower && movefollow_x || !follower)
                    canv.style.left = xpos + "px";
                if(follower && movefollow_y || !follower)
                    canv.style.top = ypos + "px";
                canv.style.zIndex = ypos;
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

            // Get everything looking decent and positioned correctly
            jgutils.level.update();
            jgutils.avatars.draw();

            // Start everything back up
            jgutils.drawing.init();
            jgutils.timing.start();

        },
        load : function(x, y, av_x, av_y) {
            // Remove everything level-specific
            jgutils.timing.stop();
            for(var av in jgutils.avatars.registry)
                if(av != "local")
                    jgutils.avatars.unregister(av);
            if(jgame.follow_avatar != "local")
                jgame.follow_avatar = "local";

            loadutils.start_task(
                "level_init",
                ["images", "load", "comm", "comm_reg"],
                jgutils.level.init
            );

            // "T" for chat
            jgutils.keys.addBinding(84, chatutils.startChat, false);
            // ESC for chat
            jgutils.keys.addBinding(27, chatutils.stopChat, true);

            // Load in the new level
            $.getJSON(
                'level/',
                { x : x, y : y, avx : av_x ? av_x : null, avy : av_y ? av_y : null },
                function(data) {
                    jgame['port'] = data.port;
                    jgame['level'] = data;

                    var avatars = jgutils.avatars;
                    avatars.setTilePosition("local", data.avatar.x, data.avatar.y, true);

                    var avatar = avatars.get("local");
                    if(avatar.image != data.avatar.image) {
                        jgame.images['avatar'] = null;
                        createImage('avatar', data.avatar.image);
                    }
                    for(var pref_img in data.images)
                        createImage(pref_img, data.images[pref_img]);

                    var tileset_url = "/static/images/tilesets/" + data.tileset;// :
//                                        'http://cdn' + (jgame.cdn++ % 4 + 1) + '.legendofadventure.com/tilesets/' + data.tileset;
                    createImage("tileset", tileset_url);
                    loadutils.complete_task("load");

                    jgutils.comm.register(data["x"], data["y"], data.avatar.x * jgame.tilesize, data.avatar.y * jgame.tilesize);
                }
            );

            jgutils.comm.init();
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

            jgutils.avatars.setAvatarOffset(n_x, n_y)
            jgutils.avatars.reposition(
                moveavatar_x || resize,
                moveavatar_y || resize
            );
        }
    },
    comm : {
        socket : null,
        local_id : guid(),
        registrar : null,
        init : function() {
            if(jgutils.comm.socket && jgutils.comm.socket.readyState == 1) {
                loadutils.complete_task("comm");
                if(jgutils.comm.registrar)
                    jgutils.comm.registrar();
                return;
            }
            jgutils.comm.socket = new WebSocket("ws://" + document.domain + ":" + jgame.port + "/socket");
            jgutils.comm.socket.onopen = function(message) {
                jgutils.comm.socket.onmessage = jgutils.comm.handle_message;
                jgutils.comm.send("reg", jgutils.comm.local_id);
                loadutils.complete_task("comm");
                if(jgutils.comm.registrar)
                    jgutils.comm.registrar();
            };
        },
        handle_message : function(message) {
            console.log("Server message: [" + message.data + "]");
            body = message.data.substr(3);
            switch(message.data.substr(0, 3)) {
                case "pin": // Ping!
                    jgutils.comm.send("pon", "");
                    break;
                case "add": // Add avatar
                    var data = body.split(":");
                    jgutils.avatars.register(
                        data[0],
                        {image: "avatar",
                         facing: "down",
                         sprite: jgutils.avatars.registry["local"].sprite,
                         dirty: true,
                         x: data[1] * 1,
                         y: data[2] * 1},
                        true
                    );
                    jgutils.avatars.reposition(true, true);
                    jgutils.avatars.draw();
                    break;
                case "del": // Remove avatar
                    jgutils.avatars.unregister(body);
                    break;
                case "upa": // Change avatar position and direction
                    var data = body.split(":");
                    var av = jgutils.avatars.registry[data[0]];
                    av.x = data[1] * 1;
                    av.y = data[2] * 1;
                    var position = data[3];
                    if(av.position != position) {
                        av.position = position * 1;
                        jgutils.avatars.draw(data[0]);
                    }
                    if(jgame.follow_avatar == data[0])
                        jgutils.level.setCenterPosition(true);
                    else
                        jgutils.avatars.reposition(false, false);
                    break;
                case "dir": // Change avatar direction
                    var data = body.split(":");
                    var av = jgutils.avatars.registry[data[0]];
                    av.position = data[1] * 1;
                    jgutils.avatars.draw(data[0]);
                    break;
                case "cha": // Chat message
                    chatutils.handleMessage(body.split("\n")[1]);
                    break;
                case "spa": // Spawn object
                    var data = body.split("\n");
                    var jdata = JSON.parse(data[1]);
                    jgutils.objects.create(
                        data[0],
                        jdata,
                        jdata["layer"]
                    );
                    break;
                case "err":
                    if(!!window.console) {
                        console.log("Error: " + body);
                    }
            }
        },
        register : function(x, y, avatar_x, avatar_y) {
            var r = function() {
                jgutils.comm.send("pos", x + ":" + y + ":" + avatar_x + ":" + avatar_y);
                loadutils.complete_task("comm_reg");
            };
            if(jgutils.comm.socket && jgutils.comm.socket.readyState == 1) {
                r();
            } else {
                jgutils.comm.registrar = r;
            }
        },
        send : function(header, body) {
            if(!jgutils.comm.socket)
                return;
            jgutils.comm.socket.send(header + body);
        }
    },
    objects : {
        layers : {},
        registry : {},
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
                child_objects : {},
                updated : false
            });

            return x;
        },
        create : function(id, proto, layer) {
            layer = layer ? layer : 1;
            var lay;
            if(!(layer in jgutils.objects.layers))
                lay = jgutils.objects.createLayer(layer);
            else
                lay = jgutils.objects.layers[layer];
            proto["updated"] = true;
            proto["registry_layer"] = layer;
            proto.x *= jgame.tilesize;
            proto.y *= jgame.tilesize;
            proto["start_x"] = proto.x;
            proto["start_y"] = proto.y;
            lay.child_objects[id] = proto;
            lay.updated = true;
            jgutils.objects.registry[id] = proto;
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

            var updated = proto.updated;
            proto.updated = false;

            var new_image = frameutils.get(proto.image.type,
                                           proto.image,
                                           otick,
                                           0); // TODO : Set this to something useful.
            if(new_image != proto.last_image) {
                updated = true;
                proto.last_image = new_image;
            }

            if(proto.movement.type != "static" &&
               frameutils.changed(proto.movement.type, proto.movement, otick, 0)) {
                updated = true;
                var movement = frameutils.get(proto.movement.type,
                                              proto.movement,
                                              otick,
                                              0); // TODO : Same for this one.
                // TODO : This should take into account animations.
                proto.x = proto.start_x + movement.x;
                proto.y = proto.start_y + movement.y;
            }

            return updated;

        },
        remove : function(id) {
            delete jgutils.objects.registry[id];
            delete jgutils.objects.layers[proto.registry_layer].child_objects[id];
        }
    },
    drawing : {
        init : function() {jgutils.drawing.redrawBackground();},
        forceRecenter : function() {jgutils.level.setCenterPosition(true);},
        redrawBackground : function() {
            var c = document.getElementById('bg_tile').getContext('2d');
            var image;
            var c_levlev = jgame.level.level,
                c_tilesize = jgame.tilesize,
                c_tileset = jgame.images["tileset"],
                c_tiles_w = 80 / 16;

            var yy = 0;
            for(var y = 0; y < jgame.level.h; y++) {
                var xx = 0;
                for(var x = 0; x < jgame.level.w; x++) {

                    var sprite_y = Math.floor(c_levlev[y][x] / c_tiles_w) * 16,
                        sprite_x = (c_levlev[y][x] % c_tiles_w) * 16;

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
        unregister : function(id) {delete jgutils.timing.registers[id];},
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
                    var update_position = function() {
                        jgutils.comm.send("ups", Math.round(avatar.x) + ":" + Math.round(avatar.y) + ":" + avatar.position);
                    };
                    jgutils.timing.every("update_position", update_position, 0.2);
                    jgutils.comm.send("dir", avatar.position + "");
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

                function begin_swap_region(x, y, avx, avy) {
                    avx = Math.floor(avx);
                    avy = Math.floor(avy);
                    jgutils.level.load(x, y, avx, avy);
                }
                if(_y < 0 && avatar.y < jgame.tilesize / 2)
                    begin_swap_region(jgame.level.x, jgame.level.y - 1, avatar.x, avatar.y * -1);
                else if(_y > 0 && avatar.y > (jgame.level.h - 0.5) * jgame.tilesize)
                    begin_swap_region(jgame.level.x, jgame.level.y + 1, avatar.x, avatar.y * -1);
                else if(_x < 0 && avatar.x < jgame.tilesize / 2)
                    begin_swap_region(jgame.level.x - 1, jgame.level.y, avatar.x * -1, avatar.y);
                else if(_x > 0 && avatar.x > (jgame.level.w - 0.5) * jgame.tilesize)
                    begin_swap_region(jgame.level.x + 1, jgame.level.y, avatar.x * -1, avatar.y);



            } else if(avatar.direction[0] || avatar.direction[1]) {
                avatar.position = get_avatar_sprite_direction(avatar.direction)[0].position;
                // So it doesn't make sense to reset the avatar's direction,
                // but it's more of a 'last known velocity' than anything.
                avatar.direction = [0, 0];
                avatar.sprite_cycle = 0;
                avatar.cycle_position = 0;
                avatar.dirty = true;
                jgutils.avatars.draw("local");
                if(jgutils.timing.registers && "update_position" in jgutils.timing.registers) {
                    jgutils.timing.registers["update_position"].callback();
                    jgutils.timing.unregister("update_position");
                }
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
                        var child = layer.child_objects[co],
                            li = child.last_image;
                        if("sprite" in child.last_image)
                            context.drawImage(jgame.images[li.image], li.sprite.x, li.sprite.y,
                                              li.sprite.swidth, li.sprite.sheight,
                                              child.x, child.y,
                                              li.sprite.awidth, li.sprite.aheight);
                        else
                            context.drawImage(jgame.images[li.image], child.x, child.y);
                    }
                    layer.updated = false;
                }
            }

            for(var register in timing.registers) {
                var reg = timing.registers[register];
                if(ticks - reg.last_called > reg.interval * 1000) {
                    reg.callback(ticks);
                    reg.last_called = ticks;
                }
            }

        }
    }
};

var loadutils = {
    active_dependencies : {},
    start_task : function(task, dependencies, callback) {
        loadutils.active_dependencies[task] = {dependencies: dependencies,
                                               callback: callback};
    },
    finish_task : function(task) {
        loadutils.active_dependencies[task].callback();
        delete loadutils.active_dependencies[task];
    },
    complete_task : function(task) {
        console.log("Completed task: " + task)
        if(task in loadutils.active_dependencies) {
            loadutils.finish_task(task);
        } else {
            for(t in loadutils.active_dependencies) {
                var tt = loadutils.active_dependencies[t];
                if(tt.dependencies.indexOf(task) > -1)
                    tt.dependencies = tt.dependencies.filter(function(x) {return x != task;});
                if(!tt.dependencies.length)
                    loadutils.finish_task(t);
            }
        }
    }
};

var chatutils = {
    _tb : null,
    _cb : null,
    started : false,
    handleMessage : function(message) {
        if(chatutils._cb.childNodes.length > 10) {
            chatutils._cb.removeChild(chatutils._cb.childNodes[0]);
        }
        var p = document.createElement("p");
        if(message[0] == "/")
            p.style.color = "#5d6";
        p.innerHTML = message;
        chatutils._cb.appendChild(p);
    },
    startChat : function() {
        chatutils._tb.style.display = "block";
        setTimeout(function() {chatutils._tb.focus();}, 15);
        chatutils._tb.onkeydown = function(e) {
            e.stopPropagation();
            switch(e.keyCode) {
                case 13:
                    var m = chatutils._tb.value;
                    if(m) {
                        jgutils.comm.send("cha", m);
                        chatutils.handleMessage(m);
                    }
                case 27:
                    chatutils.stopChat();
            }
            return true;
        };
        chatutils.started = true;
        document.getElementById("chatbox").style.bottom = "40px";
        return false;
    },
    stopChat : function() {
        chatutils.started = false;
        chatutils._tb.value = "";
        chatutils._tb.style.display = "none";
        document.getElementById("chatbox").style.bottom = "0";
    }
};

var frameutils = {
    changed : function(type, data, ticks, start_tick) {
        if(type == "static")
            return false;
        ticks -= start_ticks;
        switch(type) {
            case "sequence":
                var seconds = "positions" in data ? data["positions"] : 10,
                    duration = "duration" in data ? data["duration"] : 1,
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
                var seconds = "positions" in data ? data["positions"] : 10,
                    duration = "duration" in data ? data["duration"] : 1,
                    otick = Math.floor(ticks / duration) % seconds;
                otick = Math.min(data.sequence.length, seconds);
                return data.sequence[otick];
            case "callback":
                return data.callback(ticks);
        }
    }
};
