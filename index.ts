import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';

import {WebSocketServer} from 'ws';

import * as player from './src/player';


const PORT = Number(process.env.PORT) || 8080;


const server = http.createServer((request, response) => {
    // console.log((new Date()) + ' Received request for ' + request.url);

    if (request.url === '/') {
      response.write(fs.readFileSync('www/index.html', 'utf-8').replace('%(port)s', String(PORT)));
      response.end();
      return;
    }

    const url = new URL('http://foo' + request.url!).pathname;

    if (url.startsWith('/static/')) {
      const wwwPath = path.normalize(__dirname + '/../www/' + url.slice(8));
      if (!fs.existsSync(wwwPath)) {
        console.log(`Could not find ${wwwPath} relative to ${__dirname}`);
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


const wsServer = new WebSocketServer({
  server,
});

wsServer.on('connection', ws => {
  console.log('Got socket request');
  new player.Player(ws);
});

server.listen(PORT, () => {
    console.log((new Date()) + ' Server is listening on port 8080');
});
