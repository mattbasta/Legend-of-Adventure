const fs = require('fs');
const http = require('http');
const path = require('path');

const websocket = require('ws');

const player = require('./src/player');


const PORT = process.env.PORT || 8080;


const server = http.createServer((request, response) => {
    // console.log((new Date()) + ' Received request for ' + request.url);

    if (request.url === '/') {
      response.write(fs.readFileSync('www/index.html', 'utf-8').replace('%(port)s', PORT));
      response.end();
      return;
    }

    const url = path.normalize(request.url.slice(1));
    if (url.indexOf('..') > -1) {
      response.writeHead(404);
      response.end();
      return;
    }

    if (url.slice(0, 7) === 'static/') {
      const wwwPath = 'www/' + url.slice(7);
      if (!fs.existsSync(wwwPath)) {
        response.writeHead(404);
      } else {
        response.write(fs.readFileSync(wwwPath));
      }
      response.end();
      return;
    }

    response.writeHead(404);
    response.end();

});


const wsServer = new websocket.Server({
  server,
});

wsServer.on('connection', ws => {
  console.log('Got socket request');
  new player.Player(ws);
});

server.listen(PORT, () => {
    console.log((new Date()) + ' Server is listening on port 8080');
});
