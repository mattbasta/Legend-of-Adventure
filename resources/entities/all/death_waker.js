define('death_waker', ['peaceful'], function() {

    function getSize() {
        return 50;
    }

    function getHealth() {
        return 140;
    }

    return {
        setup: function(sup) {
            sup();
            trigger('schedule', function() {
                trigger('wander');
            }, 100);
        },

        getData: function(sup) {
            var data = sup();
            data.proto = 'avatar';
            data.image = 'death_waker';
            data.width = data.height = getSize();
            data.maxHealth = getHealth();
            data.speed = 0.005;
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
