log('Loading sheep module');
define('sheep', ['animat', 'peaceful'], function() {

    function getSize() {
        return 50;
    }

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
