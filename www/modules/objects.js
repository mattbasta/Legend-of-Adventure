define('objects',
    ['comm', 'drawing', 'frames', 'game', 'images', 'settings'],
    function(comm, drawing, frames, game, images, settings) {

    var layers = {};
    var registry = {};

    // Spawn object
    comm.messages.on('spa', function(body) {
        var data = body.split("\n");
        if(data[0] in registry) return;
        var jdata = JSON.parse(data[1]);
        create(
            data[0],
            jdata,
            jdata.layer
        );
    });

    // Entity position update
    comm.messages.on('epu', function(body) {
        body = body.explode(":", 1);
        var entity = registry[body[0]];
        if(!entity) return;

        var data = body[1].split("\n");
        for(var i = 0; i < data.length; i++) {
            var line = data[i].explode("=", 2);
            var key = line[0];
            var value = JSON.parse(line[1]);
            if(key === "x" || key === "y")
                entity[key] = value * settings.tilesize;
            else
                entity[key] = value;
        }
    });

    // Delete entity
    comm.messages.on('del', function(body) {
        if (!(body in registry)) return;
        var proto = registry[body];
        delete registry[body];
        delete layers[proto.registry_layer].child_objects[body];
        layers[proto.registry_layer].updated = true;
        redrawLayers();
    });


    function create(id, props, layer) {
        var lay = layers[layer] || createLayer(layer);
        props.updated = true;
        props.movement_prerender = [];
        props.registry_layer = layer;
        props.x *= game.tilesize;
        props.y *= game.tilesize;
        props.start_x = props.x;
        props.start_y = props.y;
        lay.child_objects[id] = props;
        lay.updated = true;

        registry[id] = props;
    }

    function update(props, otick, speed) {
        // Speed is denoted in pixels per tick.

        otick = otick || 0;

        var updated = props.updated;
        props.updated = false;

        if (!props.view) return;

        if (typeof props.view == "string")
            props.view = jgassets[props.view];

        var new_view = frames.get(
            props.view.type,
            props.view,
            otick,
            0 // TODO : Set this to something useful.
        );

        if (new_view !== props.last_view) {
            updated = true;
            props.last_view = new_view;
        }

        var velX = props.x_vel;
        var velY = props.y_vel;
        if (velX || velY) {
            updated = true;

            if (velX && velY) {
                velX *= Math.SQRT1_2;
                velY *= Math.SQRT1_2;
            }
            props.x += velX * speed * props.speed;
            props.y += velY * speed * props.speed;
        }

        return updated;
    }

    function createLayer(name) {
        var layer = document.createElement('canvas');
        layer.height = game.canvases.objects.height;
        layer.width = game.canvases.objects.width;
        return layers[name] = {
            obj: layer,
            child_objects: {},
            updated: false
        };
    }

    function redrawLayers() {
        var layers = layers;
        var updated = false;

        var sortFunc = function(a, b) {
            return registry[a].y - registry[b].y;
        };

        var layer;
        for(var l in layers) {
            layer = layers[l];
            if(l > 2 || layer.updated) {
                updated = true;
                var context = layer.obj.getContext('2d');
                context.clearRect(0, 0, layer.obj.width, layer.obj.height);

                var sortedChildren = Object.keys(layer.child_objects).sort(sortFunc);
                for(var co = 0; co < sortedChildren.length; co++) {
                    var child = layer.child_objects[sortedChildren[co]];
                    var li = child.last_view;
                    if(!li) continue;
                    var ii = child.image;
                    var base_x = child.x + child.offset.x;
                    var base_y = child.y + child.offset.y;

                    if("movement" in child && child.movement) {
                        var movement_offset = frames.get(
                            child.movement.type,
                            child.movement,
                            require('timing').getLastTick() % 3000,
                            0
                        );
                        base_x += movement_offset[0];
                        base_y += movement_offset[1];
                    }

                    if("sprite" in li)
                        images.waitFor(child.image).done(function(sprite) {
                            context.drawImage(sprite, li.sprite.x, li.sprite.y,
                                              li.sprite.swidth, li.sprite.sheight,
                                              base_x, base_y,
                                              child.height, child.width);
                        });
                    else
                        images.waitFor(li.image).done(function(sprite) {
                            context.drawImage(sprite, child.x + child.offset.x, child.y.offset.y);
                        });
                }
                layer.updated = false;
            }
        }
        if(!updated) return;

        var layer_canvas = jgame.canvases.objects;
        var c = layer_canvas.getContext("2d");
        c.clearRect(0, 0, layer_canvas.width, layer_canvas.height);
        drawing.setChanged('objects');
        for(var layer_id in layers) {
            layer = layers[layer_id].obj;
            c.drawImage(layer, 0, 0);
        }
    }

    return {
        redrawLayers: redrawLayers,
        clear: function() {
            registry = {};
            for(var i in layers) {
                layers[i].child_objects = {};
                layers[i].updated = true;
            }
        },
        setLayerSizes: function(width, height) {
            for(var i in layers) {
                layers[i].obj.width = width;
                layers[i].obj.height = height;
            }
        },
        tick: function(ticks, speed) {
            var obj;
            var modSec;
            var modDur;
            var objTick;
            for (var objID in registry) {
                obj = registry[objID];
                modSec = obj.mod_seconds || 1000;
                modDur = obj.mod_duration || 1;
                objTick = ticks / modDur % modSec;

                if (update(obj, objTick, speed)) {
                    layers[obj.registry_layer].updated = true;
                }
            }

            redrawLayers();
        }
    };
});
