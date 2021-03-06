define('bully', ['npc', 'peaceful'], function() {

    var chasing = null;

    function getSize() {
        return 1;
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

        getData: function(sup) {
            var data = sup();
            data.proto = 'avatar';
            data.image = 'bully';
            data.width = data.height = getSize();
            data.speed = 0.0035;
            data.nametag = trigger('nametag');
            return data;
        },
        nametag: function() {
            return 'Timmy the Bully';
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

        type: function() {
            return 'bully';
        },

        seenEntity: function(sup, id, body, dist) {
            sup();
            if (chasing || getType(id) !== 'child') return;

            trigger('chase', id);
        }
    };
});
