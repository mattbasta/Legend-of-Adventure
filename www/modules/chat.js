define('chat', ['comm', 'keys'], function(comm, keys) {

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

    comm.messages.on('cha', handleMessage);

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
        stopChat : function() {
            started = false;
            textbox.value = "";
            textbox.style.display = "none";
            chatbox.style.bottom = "100px";
        }
    };

    comm.ready.done(function() {
        keys.up.on(84, ret.startChat);
        keys.up.on(27, ret.stopChat);
    });

    return ret;
});
