define('frames', [], function() {

    return {
        get: function(type, data, ticks, startTicks) {
            ticks -= startTicks;

            switch (type) {
                case "static":
                    return data;

                case "sequence":
                    var duration = "duration" in data ? data.duration : 1;
                    var otick = Math.floor(ticks / duration) % data.sequence.length;
                    return data.sequence[otick];

                case "callback":
                    if (typeof data.callback === "string")
                        return jgassets[data.callback](ticks, data);
                    else
                        return data.callback(ticks);

            }
        }
    };
});
