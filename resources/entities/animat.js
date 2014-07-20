define('animat', [], function() {
    var x = 0;
    var y = 0;
    var velX = 0;
    var velY = 0;
    var dirX = 0;
    var dirY = 1;

    var levWidth;
    var levHeight;

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

        // TODO: make these use real dimensions
        x = Math.min(levWidth - 2, Math.max(x, 1));
        y = Math.min(levHeight - 1, Math.max(y, 2));

    }

    function getLocationUpdate() {
        return {
            x: x,
            y: y,
            velocity: [velX, velY],
            direction: [dirX, dirY]
        };
    }

    var schedule = [];

    return {
        setup: function(sup) {
            sup();
            var data = trigger('getData');
            if (!data) return;
            speed = data.speed || speed;
            levHeight = getLevHeight();
            levWidth = getLevWidth();
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
        getData: getLocationUpdate,
        getLocationUpdate: function() {
            return JSON.stringify(getLocationUpdate());
        },
        startMoving: function(sup, newDirX, newDirY) {
            calculateLocation();
            if (newDirX === velX && newDirY === velY) {
                return;
            }
            velX = dirX = newDirX;
            velY = dirY = newDirY;
            sendEvent('epu', trigger('getLocationUpdate'));
        },
        stopMoving: function(sup) {
            calculateLocation();
            if (!velX && !velY) {
                return;
            }
            velX = 0;
            velY = 0;
            sendEvent('epu', trigger('getLocationUpdate'));
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
            calculateLocation();
        }

    };
});
