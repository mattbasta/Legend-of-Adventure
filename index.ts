import * as fs from 'fs';
import * as http from 'http';

import * as websocket from 'ws';

import * as player from './src/player';


const PORT = Number(process.env.PORT) || 8080;


const server = http.createServer((request, response) => {
    // console.log((new Date()) + ' Received request for ' + request.url);

    if (request.url === '/') {
      response.write(fs.readFileSync('www/index.html', 'utf-8').replace('%(port)s', String(PORT)));
      response.end();
      return;
    }

    const url = new URL(request.url!).pathname;

    if (url.startsWith('static/')) {
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
