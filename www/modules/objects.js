define('objects',
    ['canvases', 'comm', 'frames', 'images', 'level', 'settings'],
    function(canvases, comm, frames, images, level, settings) {

    'use strict';

    var layers = {};
    var registry = {};

    // Spawn object
    comm.messages.on('add', function(body) {
        var data = body.split(" ");
        if (data[0] === 'player') return;
        if (data[1] in registry) return;
        var jdata = JSON.parse(data[2]);
        create(
            data[0],
            jdata,
            jdata.layer
        );
    });

    // Entity position update
    var epuMatcher = /(.*):([\s.]*)/;
    var epuLineSplitter = /(.*)=(.*)/;
    comm.messages.on('epu', function(body) {
        body = body.explode(":", 1);
        var parts = epuMatcher.exec(body);

        var entity = registry[parts[1]];
        if(!entity) return;

        var data = body[2].split('\n');
        for(var i = 0; i < data.length; i++) {
            var line = epuLineSplitter.exec(data[i]);
            var key = line[1];
            var value = JSON.parse(line[2]);
            if(key === 'x' || key === 'y')
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
        props.x *= settings.tilesize;
        props.y *= settings.tilesize;
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
        var layer = canvases.getCanvas(name, 'objects');
        var objects = canvases.getCanvas('objects')
        layer.height = objects.height;
        layer.width = objects.width;
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

        var layer_canvas = canvases.getCanvas('objects'); // TODO: Elimate this extra step
        var c = canvases.getContext('objects');
        c.clearRect(0, 0, layer_canvas.width, layer_canvas.height);
        for(var layer_id in layers) {
            layer = layers[layer_id].obj;
            c.drawImage(layer, 0, 0);
        }
    }

    level.on('newLevel', function(width, height) {
        registry = {};
        for(var i in layers) {
            layers[i].child_objects = {};
            layers[i].updated = true;
            layers[i].obj.width = width;
            layers[i].obj.height = height;
        }
    });

    level.on('redraw', redrawLayers);

    return {
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
