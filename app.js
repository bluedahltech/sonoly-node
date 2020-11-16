
const express = require('express');
const cors = require('cors')
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({server: server, path: '/broadcast'});

const port = process.env.PORT || 3001;

let sessions = []

app.use(
  cors({
    origin: 'http://localhost:5000',
    optionsSuccessStatus: 200,
  }),
);

wss.on("connection", function(ws){
  ws.on('message', function incoming(data) {
    if(typeof data === 'string'){
      ws.send(data);
    } else {
      wss.clients.forEach(function each(client) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      });
    }
  });
});

//start our server
server.listen(port, () => {
    console.log(`Server started on port ${server.address().port} :)`);
});