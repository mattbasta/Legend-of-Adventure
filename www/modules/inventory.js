define('inventory', ['comm', 'keys'], function(comm, keys) {
    'use strict';

    var slots = [null, null, null, null, null];
    var count = [0, 0, 0, 0, 0];
    var selected = 0;

    // Inventory update
    comm.messages.on('inv', function(body) {
        body.split("\n").forEach(function(item) {
            var lined = item.split(':');
            var position = parseInt(lined[0], 10);
            slots[position] = lined[1] || null;
            count[position] = lined[2] | 0;
        });
    });

    function incrSel(incr) {
        selected += incr;
        selected %= slots.length;
    }

    keys.up.on(75, function() {  // K
        comm.send('cyc', 'f');
        incrSel(1);
    });
    keys.up.on(74, function() {  // J
        comm.send('cyc', 'b');
        incrSel(-1);
    });

    function useSelected() {comm.send('use', 0);}
    keys.up.on(76, useSelected);  // L
    keys.up.on(32, useSelected);  // Space

    function dropSelected() {comm.send('dro', 0);}
    keys.up.on(81, dropSelected);  // Q
    keys.up.on(85, dropSelected);  // U

    return {
        activateSelected: function() {
            if (!slots[selected]) return;
            comm.send('use', selected);
        },
        getSelected: function() {return selected;},
        setSelected: function(sel) {selected = sel;},
        getContents: function() {
            // Return a copy so the player can't cheat.
            return Array.apply(null, slots);
        },
        getCount: function(i) {
            return count[i];
        }
    };
});
