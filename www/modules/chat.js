define('chat', ['comm', 'entities', 'keys', 'level'], function(comm, entities, keys, level) {
    'use strict';

    var CHAT_DISTANCE = 10;

    var started = false;

    var chatbox = document.getElementById('chatbox');
    var textbox = document.getElementById('talkbar');

    function handleMessage(message) {
        if(chatbox.childNodes.length > 10) {
            chatbox.removeChild(chatbox.childNodes[0]);
        }
        var p = document.createElement('p');
        if(message[0] == '/')
            p.style.color = '#5d6';
        p.innerHTML = message;
        chatbox.appendChild(p);
    }

    comm.messages.on('cha', function(body) {
        var breakIdx = body.indexOf('\n');

        // Ignore chat messages that come from too far away.
        var coords = body.substr(0, breakIdx).split(' ');
        var local = entities.getLocal();
        var dist = Math.sqrt(
            Math.pow(local.x - coords[0], 2) +
            Math.pow(local.y - coords[1], 2)
        );
        if (dist > CHAT_DISTANCE) return;

        handleMessage(body.substr(breakIdx + 1))
    });

    function stopChat() {
        started = false;
        textbox.value = '';
        textbox.style.display = 'none';
        chatbox.style.bottom = '100px';
    }

    level.on('pause', stopChat);

    var ret = {
        startChat : function() {
            textbox.style.display = 'block';
            setTimeout(function() {textbox.focus();}, 0);
            textbox.onkeydown = function(e) {
                e.stopPropagation();
                switch(e.keyCode) {
                    case 13:
                        var m = textbox.value;
                        if(m) {
                            comm.send('cha', m);
                            handleMessage(m);
                        }
                    case 27:
                        ret.stopChat();
                }
            };
            // This stops keyup events from mucking with the game.
            textbox.onkeyup = function(e) {
                e.stopPropagation();
            };
            started = true;
            chatbox.style.bottom = '130px';
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
