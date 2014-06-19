define('sheep', ['animat', 'peaceful'], function() {
    return {
        getData: function(super) {
            return {
                proto: 'sheep',
                image: 'sheep',
                movement: 'sheep_bounce',
                width: 65,
                height: 65,
                speed: 0.6,
                maxHealth: 8
            };
        },
        getDrops: function() {
            // Drops a piece of meat
            return ['f5'];
        }
    };
});
