define('sheep', ['peaceful'], function() {

    var MIN_BLEAT = 8;
    var MAX_BLEAT = 20;

    var moving = false;

    function getSize() {
        return 50;
    }

    function scheduleBleat() {
        trigger('schedule', function() {
            sendEvent('snd', 'bleat:' + trigger('getX') + ':' + trigger('getY'));
            scheduleBleat();
        }, (Math.random() * (MAX_BLEAT - MIN_BLEAT) + MIN_BLEAT) * 1000);
    }

    return {
        setup: function(sup) {
            sup();
            scheduleBleat();
            trigger('schedule', function() {
                trigger('wander');
            }, 100);
        },

        getData: function(sup) {
            var data = sup();
            data.proto = 'animal';
            data.type = 'sheep';
            data.image = 'sheep';
            data.width = data.height = getSize();
            data.maxHealth = 8;
            data.speed = 0.00275;
            data.nametag = 'Innocent Sheep';
            if (moving) data.movement = 'sheep_bounce';
            return data;
        },
        getDrops: function() {
            // Drops a piece of meat
            return ['f5'];
        },
        getWidth: getSize,
        getHeight: getSize,
        startMoving: function(sup) {
            moving = true;
            return sup();
        },
        stopMoving: function(sup) {
            moving = false;
            return sup();
        },

        getLocationUpdate: function(sup) {
            var data = sup();
            return '{"movement":' + (moving ? '"sheep_bounce"' : 'null') + ',' + data.substr(1);
        }
    };
});
