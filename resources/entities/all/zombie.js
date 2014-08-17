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
            data.speed = 0.005;
            return data;
        },
        getWidth: getSize,
        getHeight: getSize,
        getHealth: getHealth,

        // TODO: Convert this to `seenEntity` to free up resources
        chase: function(sup, id) {
            var type = getType(id);
            if (type === 'zombie' || type === 'death_waker') {
                return;
            }
            sup();
        },

        type: function() {
            return 'zombie';
        },

        attacked: function(sup, from) {
            if (getType(from) === 'zombie') return;
            sup();
        },

        bloodSpatter: function() {
            sendEvent('pma',  '0.5 0 zombiesquish 5 ' + ID);
        }
    };
});
