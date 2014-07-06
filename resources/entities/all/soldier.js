define('soldier', ['sentient'], function() {

    var image = 'soldier' + (Math.random() * 3 + 1 | 0);

    function getSize() {
        return 50;
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
            data.maxHealth = 125;
            data.speed = 0.001;
            return data;
        },
        getWidth: getSize,
        getHeight: getSize,

        wander: function() {
            // noop
        }
    };
});
