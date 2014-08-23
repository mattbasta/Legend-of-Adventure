define('test', ['npc', 'peaceful'], function() {

    function getSize() {
        return 1;
    }

    function getHealth() {
        return 100000;
    }

    var chasing;

    return {
        getData: function(sup) {
            var data = sup();
            data.proto = 'avatar';
            data.image = 'avatar';
            data.width = data.height = getSize();
            data.speed = 0.006;
            data.nametag = 'Test Player';
            return data;
        },
        nametag: function() {
            return 'Test Player';
        },
        getWidth: getSize,
        getHeight: getSize,
        getHealth: getHealth,

        type: function() {
            return 'test player';
        },

        getDirectionToBestTile: function(sup, wandering) {
            sendEvent(
                'par',
                trigger('getX') + ' ' +
                trigger('getY') + ' ' +
                'blue ' +
                '10 ' +
                '100'
            );
            if (wandering) {
                return getDirectionToBestTile();
            } else {
                return pathToBestTile();
            }
        },

        seenEntity: function(sup, id) {
            if (getType(id) === 'player' && !chasing) {
                trigger('chase', id);
            }
        },

        chase: function(sup, id) {
            sup();
            chasing = id;
        },

        forget: function(sup, id) {
            sup();
            if (id === chasing) {
                trigger('stopMoving');
                chasing = null;
            }
        },

        stopChasing: function(sup) {
            sup();
            trigger('forget', chasing);
        },

        // noop wander
        wander: function() {}
    };
});
