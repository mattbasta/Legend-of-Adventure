define('canvases', ['settings'], function(settings) {
    'use strict';

    var canvases = {};
    var contexts = {};

    var sets = {};

    var defaultWidth = 0;
    var defaultHeight = 0;

    var outputCanvas = document.getElementById('output_full');
    canvases.output = outputCanvas;
    contexts.output = prepareContext(outputCanvas.getContext('2d'));

    function prepareContext(context) {
        context.imageSmoothingEnabled = false;
        context.mozImageSmoothingEnabled = false;
        return context;
    }

    function create(name, canvasSet, contextSet) {
        var canvas = document.createElement('canvas');
        if (canvasSet === canvases) {
            canvas.height = defaultHeight * settings.scales[name];
            canvas.width = defaultWidth * settings.scales[name];
        }
        (canvases || canvasSet)[name] = canvas;
        (contexts || contextSet)[name] = canvas.getContext('2d');
    }

    return {
        getCanvas: function(name, setName) {
            var canvasSet = canvases;
            var contextSet = contexts;
            if (setName) {
                if (!sets[setName]) sets[setName] = {canvases: {}, contexts: {}};
                canvasSet = sets[setName].canvases;
                contextSet = sets[setName].contexts;
            }
            if (!(name in canvasSet)) create(name, canvasSet, contextSet);
            return canvasSet[name];
        },
        getContext: function(name, setName) {
            var canvasSet = canvases;
            var contextSet = contexts;
            if (setName) {
                if (!sets[setName]) sets[setName] = {canvases: {}, contexts: {}};
                canvasSet = sets[setName].canvases;
                contextSet = sets[setName].contexts;
            }
            if (!(name in contextSet)) create(name, canvasSet, contextSet);

            return prepareContext(contextSet[name]);
        },
        setSizes: function(width, height) {
            defaultWidth = width;
            defaultHeight = height;
            for (var c in canvases) {
                if (c === 'output') continue;  // Don't scale output
                canvases[c].height = height * settings.scales[c];
                canvases[c].width = width * settings.scales[c];
            }
        },
        prepareContext: prepareContext
    };
});
