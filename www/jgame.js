function S4() {return (((1+Math.random())*0x10000)|0).toString(16).substring(1);}
// Simplified GUID function
function guid() {return S4()+S4()+S4()+S4();}

String.prototype.explode = function(value, count) {
    var split = this.split(value);
    if(!count || count >= split.length)
        return split;
    var last_segment = split.slice(count);
    split = split.slice(0, count);
    split.push(last_segment.join(value));
    return split;
};

var mozSmoothing = !(typeof $.browser.mozilla == "undefined");

var lockImages = false;
function toggleImageLock() {
    lockImages = !lockImages;
    if(!lockImages && jgame.images_loaded == jgame.images_added)
        loadutils.complete_task("images");
}
function createImage(id, url) {
    if(jgame.images[id]) {
        // Refresh the tileset when requested, but not anything else.
        if(id == "tileset" && url != jgame.images["tileset"].attributes[0].value)
            delete jgame.images[id];
        else {
            if(jgame.images_loaded == jgame.images_added)
                loadutils.complete_task("images");
            return;
        }
    }
    var i = new Image();
    jgame.images_added++;
    i.onload = function() {
        jgame.images_loaded++;
        if(!lockImages && jgame.images_loaded == jgame.images_added)
            loadutils.complete_task("images");
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

        chatutils._tb = document.getElementById("talkbar");
        chatutils._cb = document.getElementById("chatbox");

        // Setup key handlers
        function keypress(e, set) {
            switch(e.keyCode) {
                case 37: // Left
                case 65: // A
                    jgame.keys.left = set;
                    break;
                case 38: // Up
                case 87: // W
                    jgame.keys.up = set;
                    break;
                case 39: // Right
                case 68: // D
                    jgame.keys.right = set;
                    break;
                case 40: // Down
                case 83: // S
                    jgame.keys.down = set;
                    break;
                case 74: // J
                    if(set)
                        jgutils.inventory.cycle_back();
                    break;
                case 75: // K
                    if(set)
                        jgutils.inventory.cycle_forward();
                    break;
                case 76: // L
                case 32: // Space
                    if(set)
                        jgutils.comm.send("use", 0);
                    break;
                case 81: // Q
                case 85: // U
                    if(set)
                        jgutils.comm.send("dro", 0);
                    break;
                default:
                    var kb;
                    if(kb = jgame.keys.bindings[e.keyCode]) {
                        if(typeof kb == 'function')
                            kb();
                        else
                            for(var i=0, keys = jgame.keys.bindings[e.keyCode].length; i < keys; i++)
                                return (jgame.keys.bindings[e.keyCode][i])(set);
                    }
            }
        }
        $(window).keydown(function(e) {
            keypress(e, true);
        }).keyup(function(e) {
            keypress(e, false);
        });

        var ci = $("#canvas_inventory");
        ci.mouseleave(jgutils.inventory._unhover).mousemove(jgutils.inventory._hover);
        // TODO: Move these into jgutils.inventory.
        ci.mousedown(function() {jgutils.inventory.selected = true;
                                 jgutils.inventory._redraw();});
        ci.mouseup(function() {jgutils.inventory.activate_selected();
                               jgutils.inventory.selected = false;
                               jgutils.inventory._redraw();});

        // Setup the jgame instance
        jgame["images"] = {};
        jgame["images_added"] = 0;
        jgame["images_loaded"] = 0;
        jgame["level"] = {};
        jgame["follow_avatar"] = "local";
        jgame["keys"] = {
            up : false,
            down : false,
            left : false,
            right : false,
            bindings : {}
        };
        jgame["offset"] = {
            x : 0,
            y : 0,
            w : document.body.offsetWidth,
            h : document.body.offsetHeight
        };
        jgame["location_id"] = "";
        jgame["canvases"] = {
            output: document.getElementById("output_full"),
            terrain: document.createElement("canvas"),
            objects: document.createElement("canvas"),
            avatars: document.createElement("canvas")
        };

        jgame["show_fps"] = false;
        jgame["show_epu"] = false;
        jgame["filter_console"] = false;

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
            if(jgutils.drawing._drawing) {
                jgutils.drawing.callback(true); // Force a re-render
            }
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
    hitmapping : {
        generate_x : function(map, x, y_orig) { // All hitmapes are assumed to be one tile space in size.
            var ts = jgame.tilesize,
                x = x / ts | 0,
                y = y_orig / ts | 0,
                y2 = (y_orig - 1) / ts | 0 + 1;

            var x_min = -1 * ts,
                x_max = (map[y].length + 1) * ts;
            for(var i = x - 1; i >= 0; i--) {
                if(map[y][i] || map[y2][i]) {
                    x_min = (i + 1) * ts;
                    break;
                }
            }
            for(var i = x + 1, rowlen = map[y].length; i < rowlen; i++) {
                if(map[y][i] || map[y2][i]) {
                    x_max = i * ts;
                    break;
                }
            }
            //console.log("(result_translated): " + (x_min / jgame.tilesize) + ", " + (x_max / jgame.tilesize));
            return [x_min, x_max];
        },
        generate_y : function(map, x_orig, y) {
            var ts = jgame.tilesize,
                x = (x_orig / ts) | 0,
                x2 = (((x_orig - 1) / ts) | 0) + 1,
                y = ((y / ts) - 1) | 0;
            //console.log("RM Y: " + x + ", " + y);
            var y_min = 0, y_max = map.length * jgame.tilesize;
            for(var i = y; i >= 0; i--) {
                if(map[i][x] || map[i][x2]) {
                    y_min = (i + 2) * ts;
                    break;
                }
            }
            for(var i = y + 1, maplen = map.length; i < maplen; i++) {
                if(map[i][x] || map[i][x2]) {
                    y_max = (i + 1) * ts;
                    break;
                }
            }
            //console.log("(result_translated): " + (y_min / jgame.tilesize) + ", " + (y_max / jgame.tilesize));
            return [y_min, y_max];
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
            for(var avatar in jgutils.avatars.registry) {
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
            jgutils.drawing.changed.avatars = true;
            for(var i = 0; i < avatars.length; i++) {
                var avatar = avatars[i];
                ctx.drawImage(avatar.canvas, avatar.x - 7, avatar.y - jgame.avatar.h);
            }
        },
        get_avatar_sprite_direction : function(direction) {
            if(direction[0] < 0)
                return jgame.avatar.sprite.left;
            else if(direction[0] > 0)
                return jgame.avatar.sprite.right;
            else if(direction[1] < 0)
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
            jgutils.inventory._redraw();
            jgutils.objects.redrawLayers()
            jgutils.avatars.redrawAvatars();

            // Start everything back up
            jgutils.drawing.init();
            jgutils.level.setCenterPosition(true);
            jgutils.timing.start();

        },
        load : function(x, y, av_x, av_y) {
            jgutils.level.preprepare();
            loadutils.start_task(
                "level_init",
                ["images", "load", "comm", "comm_reg"],
                jgutils.level.init
            );

            // "T" for chat
            jgutils.keys.addBinding(84, chatutils.startChat, false);
            // ESC for chat
            jgutils.keys.addBinding(27, chatutils.stopChat, true);

            jgutils.comm.register(
                x + ":" + y,  // + ":" + av_x + ":" + av_y,
                jgutils.level.prepare()
            );
        },
        expect : function(level) {
            jgutils.level.preprepare();
            loadutils.start_task(
                "level_init",
                ["images", "load", "comm_reg"],
                jgutils.level.init
            );
            var callback = jgutils.level.prepare(level);
            jgutils.comm._level_callback = function(data) {
                loadutils.complete_task("comm_reg");
                callback(data);
                jgutils.comm._level_callback = null;
            };
        },
        preprepare : function() {
            // Remove everything level-specific
            jgutils.timing.stop();
            chatutils.stopChat();

            for (var av in jgutils.avatars.registry)
                if(av != "local")
                    jgutils.avatars.unregister(av);
            if (jgame.follow_avatar != "local")
                jgame.follow_avatar = "local";
            if (!lockImages)
                toggleImageLock();
        },
        prepare : function() {
            return function(data) {
                jgame.level = data;

                jgutils.objects.registry = {};
                for(var i in jgutils.objects.layers) {
                    var layer = jgutils.objects.layers[i];
                    layer.child_objects = {};
                    layer.updated = true;
                }

                var avatar = jgutils.avatars.registry.local;
                // avatar.x = data.avatar.x * jgame.tilesize;
                // avatar.y = data.avatar.y * jgame.tilesize;
                avatar.x = jgame.level.w / 2 * jgame.tilesize;
                avatar.y = jgame.level.h / 2 * jgame.tilesize;
                if(data.hitmap) {
                    var x_map = jgutils.hitmapping.generate_x(data.hitmap, avatar.x * jgame.tilesize, avatar.y * jgame.tilesize),
                        y_map = jgutils.hitmapping.generate_y(data.hitmap, avatar.x * jgame.tilesize, avatar.y * jgame.tilesize);
                    avatar.hitmap = [y_map[0], x_map[1], y_map[1], x_map[0]];
                }

                var tileset_url = '/static/images/tilesets/' + data.tileset + '.png';
                createImage('tileset', tileset_url);
                toggleImageLock(); // Release the image lock.
                jgutils.inventory.set_health(data.health);
                loadutils.complete_task('load');
            };
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
                //jgutils.drawing.redrawBackground();
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

                jgame.offset.x = jgame.offset.x | 0;

            } else if(resize)
                jgame.offset.x = ((c_offsetw / 2 - c_levelw * c_tilesize / 2) | 0) * -1;


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

                jgame.offset.y = jgame.offset.y | 0;

            } else if(resize)
                jgame.offset.y = Math.floor(c_offseth / 2 - c_levelh * c_tilesize / 2) * -1;


            var n_x = jgame.offset.x * -1,
                n_y = jgame.offset.y * -1;

            var output = jgame.canvases.output,
                terrain = jgame.canvases.terrain;

            jgutils.drawing.state = [
                Math.max(jgame.offset.x, 0), Math.max(jgame.offset.y, 0),
                Math.min(output.clientWidth, terrain.width), Math.min(output.clientHeight, terrain.height),
                Math.max(n_x, 0), Math.max(n_y, 0),
                Math.min(output.clientWidth, terrain.width), Math.min(output.clientHeight, terrain.height)
            ];

            jgutils.avatars.setAvatarOffset(n_x, n_y)
        }
    },
    inventory : {
        slots : [null, null, null, null, null],
        health : 100,
        hovering : -1,
        selected : false,
        special : -1,
        health_dwindle : null,
        activate_selected : function() {
            if(jgutils.inventory.hovering == -1)
                return;
            jgutils.comm.send("use", jgutils.inventory.hovering);
        },
        set : function(slot, item) {
            jgutils.inventory.slots[slot] = item;
            jgutils.inventory._redraw();
        },
        clear : function(slot) {
            jgutils.inventory.slots[slot] = null;
            jgutils.inventory._redraw();
        },
        cycle_forward : function() {jgutils.comm.send("cyc", "f")},
        cycle_back : function() {jgutils.comm.send("cyc", "b")},
        set_health : function(health) {
            jgutils.inventory.health = health;
            jgutils.inventory._redraw();
            if(health < 30)
                if(!jgutils.inventory.health_dwindle)
                    jgutils.inventory.health_dwindle = setInterval(jgutils.inventory._redraw, 100);
            else if(jgutils.inventory.health_dwindle) {
                clearInterval(jgutils.inventory.health_dwindle);
                jgutils.inventory.health_dwindle = null;
            }
        },
        _redraw : function() {
            var inventory = document.getElementById("canvas_inventory"),
                ctx = inventory.getContext("2d"),
                ii = jgame.images["inventory"],
                it = jgame.images["items"],
                sl = jgutils.inventory.slots,
                h = jgutils.inventory.hovering,
                s = jgutils.inventory.special,
                sel = jgutils.inventory.selected;
            if(!ii)
                return
            if(mozSmoothing)
                ctx.mozImageSmoothingEnabled = false;
            ctx.clearRect(0, 0, 374, 85);
            function draw_item(x, y, h, w, code) {
                var sy = 0, sx = 0;
                if(code[0] == "w") {
                    attributes = code.substr(1).split(".");
                    sx = jgassets.weapon_prefixes_order.indexOf(attributes[1]) * 24 + 5 * 24;
                    sy = jgassets.weapon_order.indexOf(attributes[0]) * 24;
                } else {
                    var c = parseInt(code.substr(1));
                    sx = c % 5 * 24;
                    sy = Math.floor(c / 5) * 24;
                }
                ctx.drawImage(it, sx, sy, 24, 24,
                              x, y, w, h);
            }
            for(var i = 0; i < 5; i++) {
                if(i == 0) {
                    var sx = 0;
                    if(h == i)
                        sx = sel ? 240 : 160;
                    else if(s == i)
                        sx = 80;
                    ctx.drawImage(ii, sx, 0, 80, 80,
                                  0, 0, 80, 80);
                    if(sl[i])
                        draw_item(10, 10, 60, 60, sl[i]);
                } else {
                    var sx = 0;
                    if(h == i)
                        sx = sel ? 192 : 128;
                    else if(s == i)
                        sx = 64;
                    ctx.drawImage(ii, sx + (i > 1 ? 32 : 0), 80, 16, 64,
                                  26 + i * 64, 14, 16, 64);
                    ctx.drawImage(ii, sx + (i < 4 ? 16 : 48), 80, 16, 64,
                                  74 + i * 64, 14, 16, 64);
                    if(sl[i])
                        draw_item(34 + i * 64, 22, 48, 48, sl[i]);
                }
            }

            // Redraw the health bar.
            var health = jgutils.inventory.health / 10 * 14,
                health_x = 0,
                health_low = health < 3 * 14;
            function get_y() {
                if(!health_low)
                    return 2;
                return Math.random() * 10 < 3 ? Math.random() * 4 - 2 : 2;
            }
            while(health - 14 > 0) {
                ctx.drawImage(ii, 65, 144, 13, 13,
                              84 + health_x, get_y(), 13, 13);
                health_x += 14;
                health -= 14;
            }
            ctx.drawImage(ii, 65, 144, health, 13,
                          84 + health_x, get_y(), health, 13);
        },
        _hover : function(e) {
            var oh = jgutils.inventory.hovering;
            var x = e.clientX,
                y = window.innerHeight - e.pageY;
            if(x < 80) {
                jgutils.inventory.hovering = 0;
            } else if(y > 14) {
                jgutils.inventory.hovering = ((x - 26) / 64) | 0;
            } else {
                jgutils.inventory.hovering = -1;
            }
            if(oh == jgutils.inventory.hovering)
                return;
            jgutils.inventory._redraw();
        },
        _unhover : function() {
            jgutils.inventory.hovering = -1;
            jgutils.inventory._redraw();
        }
    },
    comm : {
        socket : null,
        local_id : "",
        registrar : null,
        _level_callback : null,
        init : function() {
            if(jgutils.comm.socket && jgutils.comm.socket.readyState == 1) {
                loadutils.complete_task("comm");
                return;
            }
            jgutils.comm.socket = new WebSocket("ws://" + document.domain + ":" + jgame.port + "/socket");
            jgutils.comm.socket.onopen = function(message) {
                jgutils.comm.socket.onmessage = jgutils.comm.handle_message;
                if(jgutils.comm.registrar) {
                    jgutils.comm.registrar();
                    jgutils.comm.registrar = null;
                }
            };
        },
        handle_message : function(message) {
            if(jgame.show_epu || message.data.substr(0, 3) != "epu")
                if(!jgame.filter_console || message.data.indexOf(jgame.filter_console) > -1)
                    console.log("Server message: [" + message.data + "]");
            body = message.data.substr(3);
            switch(message.data.substr(0, 3)) {
                case "add": // Add avatar
                    var data = body.split(":");
                    jgutils.avatars.register(
                        data[0],
                        {image: "avatar",
                         facing: "down",
                         direction: [0, 0],
                         sprite: jgutils.avatars.registry["local"].sprite,
                         dirty: true,
                         x: data[1] * 1,
                         y: data[2] * 1},
                        true
                    );
                    jgutils.avatars.draw(data[0]);
                    break;
                case "del": // Remove avatar
                    jgutils.avatars.unregister(body) || jgutils.objects.remove(body);
                    break;
                case "snd": // Play sound
                    var data = body.split(":"),
                        s_x = parseFloat(data[1]),
                        s_y = parseFloat(data[2]);
                    var follow_av = jgutils.avatars.registry[jgame.follow_avatar],
                        dist = Math.sqrt(Math.pow(s_x - follow_av.x, 2) + Math.pow(s_y - follow_av.y, 2));
                    dist /= jgame.tilesize;
                    soundutils.playSound(data[0], dist);
                    break;
                case "loc": // Change avatar position and direction
                    var data = body.split(":");
                    var av = jgutils.avatars.registry[data[0]];
                    av.x = parseInt(data[1]);
                    av.y = parseInt(data[2]);
                    var new_direction = [data[3] * 1, data[4] * 1];
                    if(jgame.follow_avatar == data[0])
                        jgutils.level.setCenterPosition(true);

                    if((new_direction[0] == 0 && new_direction[1] == 0) && (av.direction[0] || av.direction[1])) {
                        var sp_dir = jgutils.avatars.get_avatar_sprite_direction(av.direction);
                        av.dirty = true;
                        av.position = sp_dir[0].position;
                        av.cycle_position = 0;
                        av.sprite_cycle = 0;
                    } else if(new_direction != av.direction) {
                        av.dirty = true;
                        var sp_dir = jgutils.avatars.get_avatar_sprite_direction(new_direction);
                        av.position = sp_dir[1].position;
                        av.cycle_position = 0;
                        av.sprite_cycle = 0;
                    }
                    av.direction = new_direction;
                    jgutils.avatars.draw(data[0]);
                    jgutils.avatars.redrawAvatars();
                    break;
                case "cha": // Chat message
                    var data = body.split("\n"),
                        metadata = data[0].split(":");
                    chatutils.handleMessage(data[1]);
                    break;
                case "spa": // Spawn object
                    var data = body.split("\n");
                    if(data[0] in jgutils.objects.registry)
                        break;
                    var jdata = JSON.parse(data[1]);
                    jgutils.objects.create(
                        data[0],
                        jdata,
                        jdata["layer"]
                    );
                    break;
                case "flv":
                    jgutils.level.expect(body);
                    break;
                case "lev":
                    jgutils.comm._level_callback(JSON.parse(body))
                    break;
                case "epu":
                    var body = body.explode(":", 1),
                        data = body[1].split("\n"),
                        entity = jgutils.objects.registry[body[0]];
                    if(!entity)
                        break;
                    for(var i = 0; i < data.length; i++) {
                        var line = data[i].explode("=", 2),
                            key = line[0],
                            value = JSON.parse(line[1]);
                        if(key == "x" || key == "y")
                            entity[key] = value * jgame.tilesize;
                        else
                            entity[key] = value;
                    }
                    break;
                case "hea":
                    var h = parseInt(body);
                    jgutils.inventory.set_health(h);
                    break;
                case "inv":
                    var data = body.split("\n");
                    for(var i = 0; i < data.length; i++) {
                        // position:item_code
                        var lined = data[i].split(":");
                        lined[0] = parseInt(lined[0]);
                        if(lined[1] == "")
                            jgutils.inventory.clear(lined[0]);
                        else
                            jgutils.inventory.set(lined[0], lined[1]);
                    }
                    break;
                case "err":
                    if(!!window.console) {
                        console.log("Error: " + body);
                    }
            }
        },
        register : function(position, callback) {
            var r = function() {
                jgutils.comm._level_callback = function(data) {
                    loadutils.complete_task("comm_reg");
                    callback(data);
                    jgutils.comm._level_callback = null;
                };
                jgutils.comm.local_id = guid()
                jgutils.comm.send("lev", position);
                loadutils.complete_task("comm");
            };
            if(jgutils.comm.socket && jgutils.comm.socket.readyState == 1) {
                r();
            } else {
                jgutils.comm.registrar = r;
                jgutils.comm.init();
            }
        },
        send : function(header, body) {
            if(!jgutils.comm.socket)
                return;
            jgutils.comm.socket.send(header + "\n" + body);
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
            for(var l in layers) {
                var layer = layers[l];
                if(l > 2 || layer.updated) {
                    updated = true;
                    var context = layer.obj.getContext('2d');
                    context.clearRect(0, 0, layer.obj.width, layer.obj.height);

                    var sorted_cos = Object.keys(layer.child_objects).sort(function(a, b) {
                        return jgutils.objects.registry[a].y - jgutils.objects.registry[b].y;
                    });
                    for(var co = 0; co < sorted_cos.length; co++) {
                        var child = layer.child_objects[sorted_cos[co]],
                            li = child.last_view;
                        if(!li)
                            continue;
                        var ii = child.image,
                            base_x = child.x + child.offset.x,
                            base_y = child.y + child.offset.y;
                        if(!(ii in jgame.images))
                            continue

                        if("movement" in child && child.movement) {
                            var movement_offset = frameutils.get(child.movement.type, child.movement,
                                                                 jgutils.timing.last % 3000, 0);
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
            jgutils.drawing.changed.objects = true;
            for(var layer_id in layers) {
                var layer = layers[layer_id].obj;
                c.drawImage(layer, 0, 0);
            }
        },
        create : function(id, proto, layer) {
            var lay;
            if(!(layer in jgutils.objects.layers))
                lay = jgutils.objects.createLayer(layer);
            else
                lay = jgutils.objects.layers[layer];
            proto["updated"] = true;
            proto["movement_prerender"] = [];
            proto["registry_layer"] = layer;
            proto.x *= jgame.tilesize;
            proto.y *= jgame.tilesize;
            proto["start_x"] = proto.x;
            proto["start_y"] = proto.y;
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
    },
    drawing : {
        _drawing : false,
        init : function() {jgutils.drawing.redrawBackground();},
        forceRecenter : function() {jgutils.level.setCenterPosition(true);},
        order : ["terrain", "objects", "avatars"],
        state : null,
        last_draw : 0,
        changed : {
            terrain: false,
            objects: false,
            avatars: false
        },
        callback : null,
        start : function() {
            jgutils.drawing._drawing = true;
            var reqAnimFrame;
            if("requestAnimationFrame" in window)
                reqAnimFrame = window.requestAnimationFrame;
            else if("mozRequestAnimationFrame" in window)
                reqAnimFrame = window.mozRequestAnimationFrame;
            else if("webkitRequestAnimationFrame" in window)
                reqAnimFrame = window.webkitRequestAnimationFrame;
            else if("oRequestAnimationFrame" in window)
                reqAnimFrame = window.oRequestAnimationFrame;
            else
                reqAnimFrame = function(callback) {setTimeout(1000 / 30, callback);};

            var draw_callback = function(forced, foo) {
                var now = (new Date()).getTime(),
                    draw_order = jgutils.drawing.order,
                    output = jgame.canvases.output.getContext("2d"),
                    state = jgutils.drawing.state,
                    changed = jgutils.drawing.changed;
                if(state && (changed.terrain || changed.objects || changed.avatars)) {
                    for(var i = 0; i < draw_order.length; i++) {
                        output.drawImage(
                            jgame.canvases[draw_order[i]],
                            state[0], state[1], state[2], state[3],
                            state[4], state[5], state[6], state[7]
                        );
                        changed[draw_order[i]] = false;
                    }
                }
                if(jgame.show_fps)
                    output.fillText((1000 / (now - jgutils.drawing.last_draw)) | 0 + "", 0, 20);
                jgutils.drawing.last_draw = now;
                if(jgutils.drawing._drawing && typeof forced == "number")
                    reqAnimFrame(draw_callback);
            };
            jgutils.drawing.callback = draw_callback;
            reqAnimFrame(draw_callback);
        },
        stop : function() {
            jgutils.drawing._drawing = false;
            jgutils.drawing.callback = null;
        },
        redrawBackground : function() {
            var output = jgame.canvases.terrain,
                c_tilesize = jgame.tilesize,
                c_tileset = jgame.images["tileset"];

            if(!c_tileset)
                return;
            var c = output.getContext("2d"),
                c_levlev = jgame.level.level,
                c_tiles_w = 5,
                c_tile_w = c_tileset.width / c_tiles_w;

            if(mozSmoothing)
                c.mozImageSmoothingEnabled = false;

            var yy = 0;
            for(var y = 0; y < jgame.level.h; y++) {
                var xx = 0;
                for(var x = 0; x < jgame.level.w; x++) {

                    var sprite_y = Math.floor(c_levlev[y][x] / c_tiles_w) * c_tile_w,
                        sprite_x = (c_levlev[y][x] % c_tiles_w) * c_tile_w;

                    c.drawImage(c_tileset,
                                sprite_x, sprite_y,
                                c_tile_w, c_tile_w,
                                xx, yy,
                                c_tilesize, c_tilesize)
                    //c.fillText(x + "," + y, xx, yy);
                    xx += c_tilesize;
                }
                yy += c_tilesize;
            }
            jgutils.drawing.changed.terrain = true;
        }
    },
    timing : {
        registers : {},
        timer : null,
        last : 0,
        start : function() {
            jgutils.timing.tick();
            jgutils.drawing.start();
            jgutils.timing.timer = setInterval(jgutils.timing.tick, jgame.fps);
        },
        stop : function() {
            if(typeof jgutils.timing.timer == 'undefined')
                return;
            clearTimeout(jgutils.timing.timer);
            jgutils.timing.last = 0;
            jgutils.drawing.stop();
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
            }
            var ms = ticks - timing.last;
            timing.last = ticks;

            // Move Avatar
            var _x = 0,
                _y = 0,
                _val = jgame.speed * ms,
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

            var avatar = jgutils.avatars.registry["local"],
                do_setcenter = false;
            function update_location() {
                jgutils.comm.send("loc", (avatar.x|0) + ":" + (avatar.y|0) + ":" + direction[0] + ":" + direction[1]);
            }

            var player_moving = _x || _y,
                // Prevent the avatar from moving at speeds > _val
                adjusted_direction = adjust_diagonal(direction),
                // Calculate the distance that the player has tried to move.
                adjusted_increment_x = adjusted_direction[0] * _val,
                adjusted_increment_y = adjusted_direction[1] * _val,
                do_redraw_avs = false;

            if(player_moving) {
                // Perform hit mapping against the terrain.
                var hitmap = avatar.hitmap;
                if(_x) {
                    // Are we hitting the right hitmap?
                    if(_x > 0 && avatar.x + adjusted_increment_x + jgame.avatar.w > hitmap[1])
                        adjusted_increment_x = hitmap[1] - avatar.x - jgame.avatar.w;
                    // What about the left hitmap?
                    else if(_x < 0 && avatar.x + adjusted_increment_x < hitmap[3])
                        adjusted_increment_x = hitmap[3] - avatar.x;

                    // Mark that we aren't moving if we've adjusted the hitmap not to move.
                    if(!adjusted_increment_x)  // Perhaps faster to have it out here? IDK.
                        _x = 0;
                }

                if(_y) {
                    // Are we hitting the bottom hitmap?
                    if(_y > 0 && avatar.y + adjusted_increment_y + jgame.avatar.h > hitmap[2])
                        adjusted_increment_y = hitmap[2] - avatar.y - jgame.avatar.h;
                    // What about the top hitmap?
                    else if(_y < 0 && avatar.y + adjusted_increment_y < hitmap[0])
                        adjusted_increment_y = hitmap[0] - avatar.y;

                    if(!adjusted_increment_y)
                        _y = 0;
                }

                // Recompute whether the player is actually moving. Useful for when we're backed
                // into a corner or something; this will make the player stop walking. :)
                player_moving = _x || _y;
                direction = [_x, _y];
            }

            if(player_moving) {
                // Perform all the fun calculations.
                var adjusted_x = avatar.x + adjusted_increment_x,
                    adjusted_y = avatar.y + adjusted_increment_y;

                function update_y_hitmap() {
                    var y_hitmap = jgutils.hitmapping.generate_y(jgame.level.hitmap, avatar.x + 7.5, avatar.y - jgame.tilesize);
                    avatar.hitmap[0] = y_hitmap[0];
                    avatar.hitmap[2] = y_hitmap[1] + 15;
                }
                function update_x_hitmap() {
                    var x_hitmap = jgutils.hitmapping.generate_x(jgame.level.hitmap, avatar.x + 7.5, avatar.y - jgame.tilesize);
                    avatar.hitmap[1] = x_hitmap[1] + 7.5;
                    avatar.hitmap[3] = x_hitmap[0] - 7.5;
                }

                // Update the location of the avatar.
                avatar.x = adjusted_x;
                avatar.y = adjusted_y;

                if(_x)
                    update_y_hitmap();
                if(_y)
                    update_x_hitmap();

                var sprite_direction = jgutils.avatars.get_avatar_sprite_direction(direction)
                if(direction[0] != avatar.direction[0] || direction[1] != avatar.direction[1]) {
                    avatar.dirty = true;
                    avatar.direction = direction;
                    avatar.position = sprite_direction[1].position;
                    avatar.cycle_position = 0;
                    avatar.sprite_cycle = 0;
                    jgutils.avatars.draw("local");
                    do_redraw_avs = true;
                    update_location()
                }
                do_setcenter = true;

                // Handle what happens when the user moves to a new region
                function begin_swap_region(x, y, avx, avy) {
                    avx = Math.floor(avx);
                    avy = Math.floor(avy);
                    jgutils.level.load(x, y, avx, avy);
                }
                if(jgame.level.can_slide) {
                    if(_y < 0 && avatar.y < jgame.tilesize / 2)
                        begin_swap_region(jgame.level.x, jgame.level.y - 1, avatar.x, avatar.y);
                    else if(_y > 0 && avatar.y >= (jgame.level.h - 1) * jgame.tilesize)
                        begin_swap_region(jgame.level.x, jgame.level.y + 1, avatar.x, avatar.y);
                    else if(_x < 0 && avatar.x < jgame.tilesize / 2)
                        begin_swap_region(jgame.level.x - 1, jgame.level.y, avatar.x, avatar.y);
                    else if(_x > 0 && avatar.x >= (jgame.level.w - 1) * jgame.tilesize)
                        begin_swap_region(jgame.level.x + 1, jgame.level.y, avatar.x, avatar.y);
                }
            } else if(avatar.direction[0] || avatar.direction[1]) {
                avatar.position = jgutils.avatars.get_avatar_sprite_direction(avatar.direction)[0].position;
                // So it doesn't make sense to reset the avatar's direction,
                // but it's more of a 'last known velocity' than anything.
                avatar.direction = [0, 0];
                avatar.sprite_cycle = 0;
                avatar.cycle_position = 0;
                avatar.dirty = true;
                jgutils.avatars.draw("local");
                do_redraw_avs = true;
                update_location();
            }

            for(var av in jgutils.avatars.registry) {
                var a = jgutils.avatars.registry[av];
                if(a.direction[0] || a.direction[1]) {
                    if(av != "local") {
                        var adjusted_dir = adjust_diagonal(a.direction);
                        a.x += adjusted_dir[0] * _val;
                        a.y += adjusted_dir[1] * _val;
                    }
                    var sp_dir = jgutils.avatars.get_avatar_sprite_direction(a.direction);
                    if(a.sprite_cycle++ == sp_dir[avatar.cycle_position].duration) {
                        a.dirty = true;
                        a.sprite_cycle = 0;
                        a.cycle_position = a.cycle_position + 1 == 3 ? 1 : 2;
                        a.position = sp_dir[a.cycle_position].position;

                        jgutils.avatars.draw(av);
                    }
                    do_redraw_avs = true;
                }
            }
            if(do_setcenter)
                jgutils.level.setCenterPosition();
            if(do_redraw_avs)
                jgutils.avatars.redrawAvatars();

            // Update Objects
            var objects = jgutils.objects,
                object_registry = jgutils.objects.registry;
            for(var objid in jgutils.objects.registry) {
                var obj = object_registry[objid];

                var mod_sec = (obj.mod_seconds ? obj.mod_seconds : 1000),
                    mod_dur = (obj.mod_duration ? obj.mod_duration : 1),
                    otick = ticks / mod_dur % mod_sec;

                // Outsourced for easy update as well as setup.
                if(jgutils.objects.update(obj, otick, _val))
                    jgutils.objects.layers[obj.registry_layer].updated = true;
            }

            jgutils.objects.redrawLayers();

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
        document.getElementById("chatbox").style.bottom = "130px";
        return false;
    },
    stopChat : function() {
        chatutils.started = false;
        chatutils._tb.value = "";
        chatutils._tb.style.display = "none";
        document.getElementById("chatbox").style.bottom = "100px";
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
                var duration = "duration" in data ? data["duration"] : 1,
                    otick = Math.floor(ticks / duration) % data.sequence.length;
                return data.sequence[otick];
            case "callback":
                if((typeof data.callback) == "string")
                    return jgassets[data.callback](ticks, data);
                else
                    return data.callback(ticks);
        }
    }
};

var soundutils = {
    loops : {},
    sounds : {},
    playing_loop : null,
    loadLoop : function(name, url) {
        if(name in soundutils.loops)
            return;
        soundutils.loops[name] = new buzz.sound(
            url,
            {formats: ["ogg", "mp3"],
             preload: true,
             autoload: true,
             loop: true}
        );
    },
    playLoop : function(name) {
        if(soundutils.playing_loop == name)
            return;

        if(!soundutils.playing_loop) {
            soundutils.loops[name].play().setVolume(0).fadeTo(10, 1000);
            soundutils.playing_loop = name;
            return;
        }

        soundutils.loops[soundutils.playing_loop].fadeOut(2000, function() {
            soundutils.playing_loop = name;
            // FIXME: Bad things might happen if playLoop is called again
            // within four seconds of it being called once.
            soundutils.loops[name].play().setVolume(0).fadeTo(20, 2000);
        });
    },
    loadSound : function(name, url) {
        soundutils.sounds[name] = new buzz.sound(
            url,
            {formats: ["ogg", "mp3"],
             preload: true,
             autoload: true,
             loop: false}
        );
    },
    playSound : function(name, distance) {
        if(!(name in soundutils.sounds))
            return;
        if(distance > 25)
            return;
        var sound = soundutils.sounds[name];
        var sc = sound.getStateCode();
        if(sc >= 2) {
            distance /= 2.5;
            // TODO : Make this a constant somewhere.
            sound.setVolume(100 - distance * distance);
            sound.play();
        }
    }
};
