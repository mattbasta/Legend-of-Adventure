define('animat', [], function() {
    var x = 0;
    var y = 0;
    var velX = 0;
    var velY = 0;
    var dirX = 0;
    var dirY = 1;

    var speed = 0.0075;  // This is player speed.

    var lastCalculation = Date.now();
    function calculateLocation() {
        var now = Date.now();
        var delta = now - lastCalculation;
        lastCalculation = now;

        if (!velX && !velY) return;

        var vX = velX;
        var vY = velY;
        if (vX && vY) {
            vX *= Math.SQRT1_2;
            vY *= Math.SQRT1_2;
        }
        x += vX * speed * delta;
        y += vY * speed * delta;

    }

    var schedule = [];

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
            calculateLocation();
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
            sendEvent('epu', trigger('getLocationUpdate'));
        },
        stopMoving: function(sup) {
            sup();
            velX = 0;
            velY = 0;
            sendEvent('epu', trigger('getLocationUpdate'));
        },

        _updatedPosition: function(sup, velocity) {
            var now = Date.now();
            var delta = now - lastCalculation;
            var targetRate = delta / (1000 / 30);

            if (!velocity[0] && !velocity[1]) return [x, y];

            var vX = velocity[0];
            var vY = velocity[1];
            if (vX && vY) {
                vX *= Math.SQRT1_2;
                vY *= Math.SQRT1_2;
            }
            return [
                x + vX * speed * targetRate,
                y + vY * speed * targetRate
            ];
        },

        schedule: function(sup, callback, when) {
            schedule.push([callback, Date.now() + when]);
        },
        tick: function(sup, now, delta) {
            sup();
            for (var i = schedule.length - 1; i >= 0; i--) {
                if (schedule[i][1] < now) {
                    try {
                        schedule[i][0]();
                        schedule.splice(i, 1);
                    } catch (e) {
                        log('Error running scheduled entity event');
                        log(schedule[i][0].toString());
                        log(e);
                    }
                }
            }
        }

    };
});
