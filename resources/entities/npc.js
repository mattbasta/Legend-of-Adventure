define('npc', [], function() {


    function clearPath(sup) {
        sup();
        clearStagedPath();
    }

    return {
        // getDirectionToBestTile: function(sup, wandering) {
        //     if (wandering)
        //         return getDirectionToBestTile();
        //     else
        //         return pathToBestTile();
        // },
        chase: clearPath,
        stopChasing: clearPath,
        flee: clearPath,
        forget: clearPath  // TODO: We might not want this one.
    };
});
