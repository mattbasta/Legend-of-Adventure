define('bully', ['peaceful'], function() {

    var chasing = null;

    function getSize() {
        return 50;
    }

    function getHealth() {
        return 100;
    }

    return {
        setup: function(sup) {
            sup();
            trigger('schedule', function() {
                trigger('wander');
            }, 100);
        },
        getLocationUpdate: function(sup) {
            return '{"type":"bully",' + sup().substr(1);
        },

        getData: function(sup) {
            var data = sup();
            data.proto = 'avatar';
            data.type = 'child';
            data.image = 'bully';
            data.width = data.height = getSize();
            data.maxHealth = getHealth();
            data.speed = 0.0035;
            data.nametag = 'Timmy the Bully';
            return data;
        },
        getWidth: getSize,
        getHeight: getSize,
        getHealth: getHealth,

        stopChasing: function(sup) {
            sup();
            chasing = null;
        },
        chase: function(sup, chase) {
            sup();
            chasing = chase;
        },

        seenEntity: function(sup, id, body, dist) {
            sup();
            if (chasing || body.type !== 'child') return;

            trigger('chase', id);
        }
    };
});
