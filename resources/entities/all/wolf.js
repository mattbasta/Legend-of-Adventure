define('wolf', ['hostile'], function() {

    function getSize() {
        return 50;
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
            data.proto = 'animal';
            data.type = 'wolf';
            data.image = 'wolf';
            data.width = data.height = getSize();
            data.maxHealth = 5;
            data.speed = 0.003;
            data.nametag = 'Big Bad Wolf';
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
