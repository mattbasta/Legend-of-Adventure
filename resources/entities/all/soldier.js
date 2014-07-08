define('soldier', ['neutral'], function() {

    var image = 'soldier' + (Math.random() * 3 + 1 | 0);

    function getSize() {
        return 50;
    }

    function getHealth() {
        return 125;
    }

    return {
        setup: function(sup) {
            sup();
        },

        getData: function(sup) {
            var data = sup();
            data.proto = 'avatar';
            data.type = 'soldier';
            data.image = image;
            data.width = data.height = getSize();
            data.maxHealth = getHealth();
            data.speed = 0.005;
            return data;
        },
        getWidth: getSize,
        getHeight: getSize,
        getHealth: getHealth,

        // noop
        wander: function() {},

        seenAttack: function(sup, from) {
            sup();
            // TODO: check if `from` is another soldier
            var dist = getDistance(from);
            if (dist === null || dist > 35) return;

            trigger('chase', from);
        }
    };
});
