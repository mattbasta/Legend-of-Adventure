define('wolf', ['hostile'], function() {

    function getSize() {
        return 50;
    }

    function getHealth() {
        return 10;
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
        getHealth: getHealth
    };
});
