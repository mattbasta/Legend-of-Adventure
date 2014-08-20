define('effects', ['comm', 'settings'], function(comm, settings) {

    var outputCanvas = document.getElementById('output_full');


    // Effects
    comm.messages.on('efx', function(body) {
        outputCanvas.style.transform = '';
        outputCanvas.style.webkitTransform = '';
        settings.effect = body;

        if (body === 'flip') {
            outputCanvas.style.transform = 'scale(1, -1)';
            outputCanvas.style.webkitTransform = 'scale(1, -1)';
        }
    });
    // Clear Effects
    comm.messages.on('efc', function(body) {
        settings.effect = null;
        outputCanvas.style.transform = '';
        outputCanvas.style.webkitTransform = '';
    });
});
