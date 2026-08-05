import Deferred from "./deferred.ts";
import EventTarget from "./events.ts";

const commEventsRaw = new EventTarget<{
  connected: [WebSocket];
}>();
const commMessages = new EventTarget<{
  add: [string];
  cha: [string];
  del: [string];
  efc: [string];
  efx: [string];
  epu: [string, string];
  evt: [string, string];
  err: [string];
  flv: [string];
  hea: [string];
  inv: [string];
  lev: [string];
  par: [string];
  pma: [string];
  snd: [string];
}>();

const readyPromise = new Deferred<void>();

// The websocket server shares the HTTP server, so the page's own host is
// always the right endpoint.
const wsProtocol = location.protocol === "https:" ? "wss" : "ws";
var socket = new WebSocket(`${wsProtocol}://${location.host}/socket`);

socket.onopen = function () {
  commEventsRaw.fire("connected", socket);
  readyPromise.resolve();
};
socket.onmessage = function (message) {
  const header = message.data.substr(0, 3);
  const subheader = message.data.substr(3, 3);
  let body;
  if (subheader === "evt") {
    var linebreak = message.data.indexOf("\n");
    const origin = message.data.substr(7, linebreak - 7);
    body = message.data.substr(linebreak + 1);
    commMessages.fire(header, body, origin);
  } else {
    body = message.data.substr(3);
    commMessages.fire(header, body);
  }
};

// Error
commMessages.on("err", (body) => {
  console.error("Server error: " + body);
});

export function send(header: string, body: string) {
  socket.send(`${header}\n${body}`);
}
export async function register(position: string) {
  send("lev", position);
  return commMessages.waitFor("lev");
}

export const messages = commMessages;
export const ready = readyPromise.promise;
