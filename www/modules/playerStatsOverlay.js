define('playerStatsOverlay',
    ['comm', 'images', 'inventory', 'player'],
    function(comm, images, inventory, player) {

    var canvas = document.getElementById('canvas_inventory');
    var ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;

    var selected = false;
    var hovering = -1;

    canvas.addEventListener('mouseleave', function(e) {
        hovering = -1;
        redraw();
    });
    canvas.addEventListener('mousemove', function(e) {
        var oldHover = hovering;
        var x = e.clientX,
            y = window.innerHeight - e.pageY;
        if(x < 80) {
            hovering = 0;
        } else if(y > 14) {
            hovering = ((x - 26) / 64) | 0;
        } else {
            hovering = -1;
        }
        if (hovering === oldHover)
            return;
        if (hovering !== -1)
            inventory.setSelected(hovering);
        redraw();
    });

    canvas.addEventListener('mousedown', function() {
        selected = true;
        redraw();
    });
    canvas.addEventListener('mouseup', function() {
        inventory.activateSelected();
        selected = false;
        redraw();
    });

    comm.messages.on('inv', function() {
        redraw();
    });

    function doRedraw(inventoryImg, itemsImg) {
        ctx.clearRect(0, 0, 374, 85);

        function draw_item(x, y, h, w, code) {
            var sy = 0, sx = 0;
            if(code[0] == "w") {  // Weapons have special codes to allow modifiers
                attributes = code.substr(1).split(".");
                sx = jgassets.weapon_prefixes_order.indexOf(attributes[1]) * 24 + 5 * 24;
                sy = jgassets.weapon_order.indexOf(attributes[0]) * 24;
            } else {
                var c = parseInt(code.substr(1), 10);
                sx = c % 5 * 24;
                sy = Math.floor(c / 5) * 24;
            }
            ctx.drawImage(itemsImg, sx, sy, 24, 24, x, y, w, h);
        }

        var slots = inventory.getContents();

        var i;
        var sx;
        for(i = 0; i < 5; i++) {
            sx = 0;
            if(!i) {
                if(hovering === i)
                    sx = selected ? 240 : 160;
                else if(s == i)
                    sx = 80;
                ctx.drawImage(inventoryImg, sx, 0, 80, 80,
                              0, 0, 80, 80);
                if(slots[i])
                    draw_item(10, 10, 60, 60, slots[i]);
            } else {
                if(hovering === i)
                    sx = selected ? 192 : 128;
                else if(s == i)
                    sx = 64;
                ctx.drawImage(inventoryImg, sx + (i > 1 ? 32 : 0), 80, 16, 64,
                              26 + i * 64, 14, 16, 64);
                ctx.drawImage(inventoryImg, sx + (i < 4 ? 16 : 48), 80, 16, 64,
                              74 + i * 64, 14, 16, 64);
                if(slots[i])
                    draw_item(34 + i * 64, 22, 48, 48, slots[i]);
            }
        }

        // Redraw the health bar.
        var health = player.getHealth() / 10 * 14;
        var health_x = 0;
        function get_y() {
            if(!player.healthIsLow())
                return 2;
            return Math.random() * 10 < 3 ? Math.random() * 4 - 2 : 2;
        }
        while(health - 14 > 0) {
            ctx.drawImage(inventoryImg, 65, 144, 13, 13, 84 + health_x, get_y(), 13, 13);
            health_x += 14;
            health -= 14;
        }
        ctx.drawImage(inventoryImg, 65, 144, health, 13, 84 + health_x, get_y(), health, 13);
    }

    var waiting = false;
    var redraw = function() {
        if (waiting) return;
        waiting = true;
        return images.waitFor('inventory', 'items').done(function(inventoryImg, itemsImg) {
            var inventory = inventoryImg[0];
            var items = itemsImg[0];
            redraw = function() {
                doRedraw(inventory, items);
            };
            redraw();
        });
    }

    redraw();

    return {
        redraw: redraw
    };
});
