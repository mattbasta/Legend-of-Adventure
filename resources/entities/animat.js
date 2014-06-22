define('animat', [], function() {
    var x = 0;
    var y = 0;
    var velX = 0;
    var velY = 0;
    var dirX = 0;
    var dirY = 1;

    var speed = 0.2;
    var targetRate = 250 / (1000 / 30);

    var lastCalculation = Date.now();
    function calculateLocation() {
        var now = Date.now();
        var delta = now - lastCalculation;

        if (!velX && !velY) return;

        var vX = velX;
        var vY = velY;
        if (vX && vY) {
            vX *= Math.SQRT1_2;
            vY *= Math.SQRT1_2;
        }
        x += vX * speed * targetRate;
        y += vY * speed * targetRate;

        lastCalculation = now;
    }

    return {
        setup: function(sup) {
            sup();
            var data = trigger('getData');
            if (!data) return;
            speed = data.speed || speed;
        },


        setPosition: function(sup, newX, newY) {
            x = newX;
            y = newY;
            lastCalculation = Date.now();
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
        },

        getLocationUpdate: function() {
            var trimmedData = {
                x: x,
                y: y,
                velocity: [velX, velY],
                direction: [dirX, dirY]
            };
            return JSON.stringify(trimmedData);
        },
        startMoving: function(sup, newDirX, newDirY) {
            sup();
            velX = dirX = newDirX;
            velY = dirY = newDirY;
            sendEvent(
                'epu',
                trigger('getLocationUpdate')
            );
        }
    };
});
