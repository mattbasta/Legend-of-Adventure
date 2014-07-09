define('zombie', ['hostile'], function() {

    function getSize() {
        return 50;
    }

    function getHealth() {
        return 75;
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
            data.image = 'zombie';
            data.width = data.height = getSize();
            data.maxHealth = getHealth();
            data.speed = 0.005;
            return data;
        },
        getWidth: getSize,
        getHeight: getSize,
        getHealth: getHealth,

        seenEntity: function(sup, id) {
            var type = getType(id);
            if (type === 'zombie' || type === 'death_waker') {
                return;
            }
            sup();
        },

        type: function() {
            return 'zombie';
        }
    };
});
