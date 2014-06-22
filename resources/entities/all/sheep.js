define('sheep', ['animat', 'peaceful'], function() {

    var MIN_BLEAT = 8;
    var MAX_BLEAT = 20;

    function getSize() {
        return 50;
    }

    var scheduledEvent;

    return {
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
        getHeight: getSize,

        tick: function(sup, now, delta) {
            sup();
            if (!scheduledEvent) {
                // Schedule an event!
                scheduledEvent = now + (Math.random() * (MAX_BLEAT - MIN_BLEAT) + MIN_BLEAT) * 1000;
            } else if (scheduledEvent <= now) {
                // Run a previously scheduled event!
                sendEvent('snd', 'bleat:' + trigger('getX') + ':' + trigger('getY'));
                scheduledEvent = null;
            }
        }
    };
});
