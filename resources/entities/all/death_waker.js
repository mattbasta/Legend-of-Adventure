define('death_waker', ['peaceful'], function() {

    function getSize() {
        return 50;
    }

    function getHealth() {
        return 140;
    }

    function scheduleWake() {
        trigger('schedule', wake, Math.random() * 10000 | 0);
    }

    var shaking = false;

    function wake() {
        shaking = true;
        trigger('stopWandering');
        sendEvent('epu', '{"movement":"shake"}');
        trigger('schedule', function() {
            var numEnts = Math.random() * 3 + 1 | 0;
            for (var i = 0; i < numEnts; i++) {
                spawn('zombie', 5);
            }

            shaking = false;
            sendEvent('epu', '{"movement":null}');
            trigger('wander');
            scheduleWake();
        }, 2500);
    }

    return {
        setup: function(sup) {
            sup();
            trigger('schedule', function() {
                trigger('wander');
            }, 100);

            scheduleWake();
        },

        wander: function(sup) {
            if (shaking) return;
            sup();
        },

        getData: function(sup) {
            var data = sup();
            data.proto = 'avatar';
            data.image = 'death_waker';
            data.width = data.height = getSize();
            data.speed = 0.0035;
            return data;
        },
        getWidth: getSize,
        getHeight: getSize,
        getHealth: getHealth,

        type: function() {
            return 'death_waker';
        }
    };
});
