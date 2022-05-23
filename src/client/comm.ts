import Deferred from "./deferred";
import EventTarget from "./events";

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

var socket = new WebSocket(
  `ws://${document.domain}:${document.currentScript?.getAttribute(
    "data-port"
  )}/socket`
);

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
