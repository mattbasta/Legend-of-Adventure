import * as comm from "./comm";

import * as entities from "./entities";
import * as keys from "./keys";
import * as level from "./level";

const CHAT_DISTANCE = 10;

const chatbox = document.getElementById("chatbox") as HTMLDivElement;
const textbox = document.getElementById("talkbar") as HTMLInputElement;

function handleMessage(message: string) {
  if (chatbox.childNodes.length > 10) {
    chatbox.removeChild(chatbox.childNodes[0]);
  }
  var p = document.createElement("p");
  if (message[0] == "/") p.style.color = "#5d6";
  p.innerHTML = message;
  chatbox.appendChild(p);
}

comm.messages.on("cha", function (body) {
  var breakIdx = body.indexOf("\n");

  // Ignore chat messages that come from too far away.
  var coords = body.substr(0, breakIdx).split(" ") as [string, string];
  var local = entities.getLocal();
  var dist = Math.sqrt(
    Math.pow(local.x - parseFloat(coords[0]), 2) +
      Math.pow(local.y - parseFloat(coords[1]), 2)
  );
  if (dist > CHAT_DISTANCE) return;

  handleMessage(body.substr(breakIdx + 1));
});

export function stopChat() {
  textbox.value = "";
  textbox.style.display = "none";
  chatbox.style.bottom = "100px";
}

level.on("pause", stopChat);

export function startChat() {
  textbox.style.display = "block";
  setTimeout(function () {
    textbox.focus();
  }, 0);
  textbox.onkeydown = function (e) {
    e.stopPropagation();
    switch (e.keyCode) {
      case 13:
        var m = textbox.value;
        if (m) {
          comm.send("cha", m);
          handleMessage(m);
        }
      case 27:
        stopChat();
    }
  };
  // This stops keyup events from mucking with the game.
  textbox.onkeyup = function (e) {
    e.stopPropagation();
  };
  chatbox.style.bottom = "130px";
  return false;
}

comm.ready.then(() => {
  keys.up.on(84, startChat);
  keys.up.on(27, stopChat);
});
