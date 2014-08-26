define('images', ['promise'], function(promise) {
    'use strict';

    function loadImage(src) {
        return promise(function(resolve, reject) {
            var img = new Image();
            img.src = src;
            img.onload = function() {
                resolve(img);
            };
            img.onerror = reject;
        });
    }

    var images = {
        'tileset_default': loadImage('/static/images/tilesets/default.png'),
        'tileset_dungeons': loadImage('/static/images/tilesets/dungeons.png'),
        'tileset_interiors': loadImage('/static/images/tilesets/interiors.png'),
        'inventory': loadImage('/static/images/inventory.png'),
        'avatar': loadImage('/static/images/avatar.png'),
        'items': loadImage('/static/images/items.png'),
        'chest': loadImage('/static/images/chest.png'),
        'old_woman1': loadImage('static/images/old_woman1.png'),
        'old_woman2': loadImage('static/images/old_woman2.png'),
        'homely1': loadImage('static/images/homely1.png'),
        'homely2': loadImage('static/images/homely2.png'),
        'homely3': loadImage('static/images/homely3.png'),
        'child1': loadImage('static/images/child1.png'),
        'child2': loadImage('static/images/child2.png'),
        'soldier1': loadImage('static/images/soldier1.png'),
        'soldier2': loadImage('static/images/soldier2.png'),
        'soldier3': loadImage('static/images/soldier3.png'),
        'npc': loadImage('static/images/npc.png'),
        'bully': loadImage('static/images/bully.png'),
        'sheep': loadImage('static/images/sheep.png'),
        'wolf': loadImage('static/images/wolf.png'),
        'zombie': loadImage('static/images/zombie.png'),
        'death_waker': loadImage('static/images/death_waker.png'),
        'fallen_angel': loadImage('static/images/fallen_angel.png')
    };

    return {
        waitFor: function() {
            var deps = Array.prototype.slice.call(arguments, 0);
            return promise.when.apply(null, deps.map(function(dep) {
                return images[dep];
            }));
        },
        isLoaded: function(image) {
            return images[image].state() !== 'pending';
        }
    };

});
