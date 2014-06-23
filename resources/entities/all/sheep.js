define('sheep', ['animat', 'peaceful'], function() {

    var MIN_BLEAT = 8;
    var MAX_BLEAT = 20;

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
            data.movement = 'sheep_bounce';
            data.width = data.height = getSize();
            data.speed = 0.6;
            data.maxHealth = 8;
            data.nametag = 'Innocent Sheep';
            return data;
        },
        getDrops: function() {
            // Drops a piece of meat
            return ['f5'];
        },
        getWidth: getSize,
        getHeight: getSize
    };
});
