define('wolf', ['hostile'], function() {

    var MIN_HOWL = 15;
    var MAX_HOWL = 30;

    var chasing;

    function getSize() {
        return 1;
    }

    function getHealth() {
        return 10;
    }

    function scheduleHowl() {
        trigger('schedule', function() {
            if (chasing) {
                scheduleHowl();
                return;
            }
            trigger('stopWandering');
            sendEvent('snd', 'wolf_howl:' + getX() + ':' + getY());
            trigger('schedule', function() {
                scheduleHowl();
                trigger('wander');
            }, 4000);
        }, (Math.random() * (MAX_HOWL - MIN_HOWL) + MIN_HOWL) * 1000);
    }

    return {
        setup: function(sup) {
            sup();
            scheduleHowl();
            trigger('wander');
        },

        getData: function(sup) {
            var data = sup();
            data.proto = 'animal';
            data.image = 'wolf';
            data.width = data.height = getSize();
            data.speed = 0.003;
            data.nametag = 'Big Bad Wolf';
            return data;
        },
        getDrops: function() {
            // Drops a piece of meat
            return 'f5';
        },
        getWidth: getSize,
        getHeight: getSize,
        getHealth: getHealth,
        chase: function(sup, id) {
            chasing = id;
            sup();
        },
        forget: function(sup, id) {
            if (chasing === id) {
                chasing = false;
            }
            sup();
        }
    };
});
