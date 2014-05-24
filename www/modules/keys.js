define('keys', ['events'], function(events) {
    var keyUpHandler = new events.EventTarget();
    var keyDownHandler = new events.EventTarget();

    var keys = {
        left: false,
        up: false,
        right: false,
        down: false
    };

    function keypress(e, set) {
        switch(e.keyCode) {
            case 37: // Left
            case 65: // A
                keys.left = set;
                break;
            case 38: // Up
            case 87: // W
                keys.up = set;
                break;
            case 39: // Right
            case 68: // D
                keys.right = set;
                break;
            case 40: // Down
            case 83: // S
                keys.down = set;
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

    return {
        up: keyUpHandler,
        down: keyDownHandler
    };
});
