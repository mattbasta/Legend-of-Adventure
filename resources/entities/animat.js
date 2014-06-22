define('animat', [], function() {
    var x = 0;
    var y = 0;
    return {
        setPosition: function(sup, newX, newY) {
            x = newX;
            y = newY;
        },
        getX: function() {
            return x;
        },
        getY: function() {
            return y;
        },
        getData: function(sup) {
            var data = sup() || {};
            data.x = x;
            data.y = y;
            return data;
        }
    };
});
