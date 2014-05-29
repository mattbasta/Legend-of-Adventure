define('chat', ['comm', 'keys', 'level'], function(comm, keys, level) {

    var started = false;

    var chatbox = document.getElementById("chatbox");
    var textbox = document.getElementById('talkbar');

    function handleMessage(message) {
        if(chatbox.childNodes.length > 10) {
            chatbox.removeChild(chatbox.childNodes[0]);
        }
        var p = document.createElement("p");
        if(message[0] == "/")
            p.style.color = "#5d6";
        p.innerHTML = message;
        chatbox.appendChild(p);
    }

    comm.messages.on('cha', function(body) {
        // TODO: Make this handle the X and Y coords.
        handleMessage(body.substr(body.indexOf('\n') + 1))
    });

    function stopChat() {
        started = false;
        textbox.value = "";
        textbox.style.display = "none";
        chatbox.style.bottom = "100px";
    }

    level.on('pause', stopChat);

    var ret = {
        startChat : function() {
            textbox.style.display = "block";
            setTimeout(function() {textbox.focus();}, 15);
            textbox.onkeydown = function(e) {
                e.stopPropagation();
                switch(e.keyCode) {
                    case 13:
                        var m = textbox.value;
                        if(m) {
                            comm.send("cha", m);
                            handleMessage(m);
                        }
                    case 27:
                        ret.stopChat();
                }
                return true;
            };
            started = true;
            chatbox.style.bottom = "130px";
            return false;
        },
        stopChat: stopChat
    };

    comm.ready.done(function() {
        keys.up.on(84, ret.startChat);
        keys.up.on(27, ret.stopChat);
    });

    return ret;
});
