import * as comm from "./comm.ts";

import * as entities from "./entities.ts";
import * as keys from "./keys.ts";
import * as level from "./level.ts";
import { sanitizeToFragment } from "./sanitize.ts";

const CHAT_DISTANCE = 10;

const chatbox = document.getElementById("chatbox") as HTMLDivElement;
const textbox = document.getElementById("talkbar") as HTMLInputElement;

// Chat is relayed from other players, so it is untrusted. NPC speech does
// legitimately carry a `<span class="nametag">` prefix, so the message is
// sanitized against an allowlist rather than escaped wholesale.
function handleMessage(message: string) {
  if (chatbox.childNodes.length > 10) {
    chatbox.removeChild(chatbox.childNodes[0]!);
  }
  const p = document.createElement("p");
  if (message[0] == "/") p.style.color = "#5d6";
  p.appendChild(sanitizeToFragment(message));
  chatbox.appendChild(p);
}

comm.messages.on("cha", function (body) {
  var breakIdx = body.indexOf("\n");

  // Ignore chat messages that come from too far away.
  var coords = body.slice(0, breakIdx).split(" ") as [string, string];
  var local = entities.getLocal();
  var dist = Math.sqrt(
    Math.pow(local.x - parseFloat(coords[0]), 2) +
      Math.pow(local.y - parseFloat(coords[1]), 2),
  );
  if (dist > CHAT_DISTANCE) return;

  handleMessage(body.slice(breakIdx + 1));
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
    switch (e.code) {
      case "Enter":
        var m = textbox.value;
        if (m) {
          comm.send("cha", m);
          handleMessage(m);
        }
        stopChat();
        break;
      case "Escape":
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
  keys.up.on("KeyT", startChat);
  keys.up.on("Escape", stopChat);
});
