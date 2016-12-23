const events = require('./events');


function sayToPlayer(message, player) {
  player.onEvent(
    new events.Event(events.CHAT, `0 0\n${message}`, null)
  );
}

exports.handleCheat = function(message, player) {
  throw new Error('not implemented');
};
