define('keys', ['events'], function(events) {
    'use strict';

    var keyUpHandler = new events.EventTarget();
    var keyDownHandler = new events.EventTarget();

    var keys = {
        leftArrow: false,
        upArrow: false,
        rightArrow: false,
        downArrow: false
    };

    function keypress(e, set) {
        switch(e.keyCode) {
            case 37: // Left
            case 65: // A
                keys.leftArrow = set;
                break;
            case 38: // Up
            case 87: // W
                keys.upArrow = set;
                break;
            case 39: // Right
            case 68: // D
                keys.rightArrow = set;
                break;
            case 40: // Down
            case 83: // S
                keys.downArrow = set;
                break;

            default:
                (set ? keyDownHandler: keyUpHandler).fire(e.keyCode);
        }
    }
    window.addEventListener('keydown', function(e) {
        keypress(e, true);
    });
    window.addEventListener('keyup', function(e) {
        keypress(e, false);
    });

    keys.up = keyUpHandler;
    keys.down = keyDownHandler;

    return keys;
});
