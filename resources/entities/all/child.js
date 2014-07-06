define('bully', ['peaceful'], function() {

    var names = [
        'Susie',
        'Elton',
        'Mavis',
        'Sam',
        'Little Billy'
    ];

    var name = names[Math.random() * names.length | 0];

    var image = 'child' + (Math.random() * 2 + 1 | 0);

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
        getLocationUpdate: function(sup) {
            return '{"type":"child",' + sup().substr(1);
        },

        getData: function(sup) {
            var data = sup();
            data.proto = 'avatar';
            data.type = 'child';
            data.image = image;
            data.width = data.height = getSize();
            data.maxHealth = 100;
            data.speed = 0.004;
            data.nametag = name;
            return data;
        },
        getWidth: getSize,
        getHeight: getSize,

        seenEntity: function(sup, id, body, dist) {
            sup();
            if (body.type == 'bully') trigger('flee', id);
        }
    };
});
