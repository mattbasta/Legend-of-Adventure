define('images', ['promise'], function(promise) {
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
        'inventory': loadImage('/static/images/inventory.png'),
        'avatar': loadImage('/static/images/avatar.png'),
        'items': loadImage('/static/images/items.png')
    };

    return {
        waitFor: function() {
            var deps = Array.prototype.slice.call(arguments, 0);
            return promise.when.apply(null, deps.map(function(dep) {
                return images[dep];
            }));
        }
    };

});
