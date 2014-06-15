var jgassets = {
    "animat.spr.left": {
        type: "sequence",
        duration: 14, "positions": 2,
        sequence: [
            {sprite: {x: 0, y: 32, swidth: 32, sheight: 32}},
            {sprite: {x: 64, y: 32, swidth: 32, sheight: 32}}
        ]
    },
    "animat.spr.right": {
        type: "sequence",
        duration: 14, "positions": 2,
        sequence: [
            {sprite: {x: 0, y: 64, swidth: 32, sheight: 32}},
            {sprite: {x: 64, y: 64, swidth: 32, sheight: 32}}
        ]
    },
    "animat.spr.down": {
        type: "sequence",
        duration: 14, "positions": 2,
        sequence: [
            {sprite: {x: 0, y: 0, swidth: 32, sheight: 32}},
            {sprite: {x: 64, y: 0, swidth: 32, sheight: 32}}
        ]
    },
    "animat.spr.up": {
        type: "sequence",
        duration: 14, "positions": 2,
        sequence: [
            {sprite: {x: 0, y: 96, swidth: 32, sheight: 32}},
            {sprite: {x: 64, y: 96, swidth: 32, sheight: 32}}
        ]
    },
    "animat.static.left": {type: "static", sprite: {x: 32, y: 32, swidth: 32, sheight: 32}},
    "animat.static.right": {type: "static", sprite: {x: 32, y: 64, swidth: 32, sheight: 32}},
    "animat.static.down": {type: "static", sprite: {x: 32, y: 0, swidth: 32, sheight: 32}},
    "animat.static.up": {type: "static", sprite: {x: 32, y: 96, swidth: 32, sheight: 32}},
    item_hover: function(ticks, data) {
        return [0, (Math.sin(ticks / 1000 * 2 * Math.PI) + 1) / 2 * -10];
    },
    sheep_bounce: function(ticks, data) {
        return [0, Math.abs(Math.sin(ticks / 500 * 2 * Math.PI)) * -5];
    },
    shake: function(ticks, data) {
        return [Math.random() * 10 - 5, Math.random() * 10 - 5];
    }
};
