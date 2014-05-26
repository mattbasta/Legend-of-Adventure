define('canvases', [], function() {

    var canvases = {};
    var contexts = {};

    var sets = {};

    var defaultWidth = 0;
    var defaultHeight = 0;

    function create(name, canvasSet, contextSet) {
        var canvas;
        if (canvasSet === canvases && name === 'output') {
            canvas = document.getElementById('output_full');
        } else {
            canvas = document.createElement('canvas');
            canvas.height = defaultHeight;
            canvas.width = defaultWidth;
        }
        (canvases || canvasSet)[name] = canvas;
        (contexts || contextSet)[name] = canvas.getContext('2d');
    }

    return {
        getCanvas: function(name, setName) {
            var canvasSet = canvases;
            var contextSet;
            if (setName) {
                if (!sets[setName]) sets[setName] = {canvases: {}, contexts: {}};
                canvasSet = sets[setName].canvases;
                contextSet = sets[setName].contexts;
            }
            if (!(name in canvasSet)) create(name, canvasSet, contextSet);
            return canvasSet[name];
        },
        getContext: function(name, setName) {
            var canvasSet;
            var contextSet = contexts;
            if (setName) {
                if (!sets[setName]) sets[setName] = {canvases: {}, contexts: {}};
                canvasSet = sets[setName].canvases;
                contextSet = sets[setName].contexts;
            }
            if (!(name in contextSet)) create(name, canvasSet, contextSet);

            var context = contextSet[name];
            context.imageSmoothingEnabled = false;
            context.mozImageSmoothingEnabled = false;
            context.webkitImageSmoothingEnabled = false;

            return context;
        },
        setSizes: function(width, height) {
            defaultWidth = width;
            defaultHeight = height;
            for (var c in canvases) {
                if (c === 'terrain') continue;  // Don't scale terrain
                canvases[c].height = height;
                canvases[c].width = width;
            }
        }
    };
});
