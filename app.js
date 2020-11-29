
const express = require('express');
const cors = require('cors')
const http = require('http');
const WebSocket = require('ws');
const url = require('url');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({server: server, path: '/broadcast'});

const port = process.env.PORT || 3001;

app.use(
  cors(),
);

// e.data instanceof ArrayBuffer
// e.data instanceof Blob
// typeof e.data === "string"
// Wss://localhost:3000/broadcast/?id=123&role=broadcaster
// Wss://localhost:3000/broadcast/?id=124&role=listener&sessionId=100

let sessions = {}

wss.on("connection", function(ws, req){
  const params = url.parse(req.url, true).query  
  ws.sessionId = params.sessionId
  ws.role = params.role
  let session

  if(ws.role === 'broadcaster'){

    sessions[ws.sessionId] = {
      broadcaster: ws,
      listeners: []
    }

    ws.on('message', function incoming(data) {
      session = sessions[ws.sessionId]
      if(!session) return 
      session.listeners.forEach(function each(listener) {
        if (listener !== ws && listener.readyState === WebSocket.OPEN) {
          listener.send(data);
        }
      });
    });
  }

  if(ws.role === 'listener'){
    ws.sessionId = params.sessionId
    ws.listenerId = params.listenerId
    session = sessions[ws.sessionId]
    if(!session) return 
    session.listeners.push(ws)
    session.broadcaster.send(
      JSON.stringify(session.listeners
    ))
  }

  ws.on('close', function(event, other){
   // if listener, remove from listeners and send message to broadcaster that they left
   // if broadcaster, tell listeners that broadcast has ended and then remove from sessions, and close listeners
    session = sessions[ws.sessionId]

    if(!session){
      return
    }

    if(ws.role === 'listener'){
      const idx = session.listeners.findIndex(l => l.listenerId === ws.listenerId)
      session.listeners.splice(idx, 1)
      session.broadcaster.send(JSON.stringify(session.listeners))
      session.listeners.forEach((l) => {
        l.send(JSON.stringify(session.listeners))
      })
    } else if(ws.role === 'broadcaster'){
      session.listeners.forEach((l) => {
        l.send('Broadcast has ended')
      })
      delete sessions[ws.sessionId]
    }

  })

  wss.clients.forEach(function each(client) {
      // console.log('Client.ID: ' + client.sessionId);
      // console.log('Client.Role: ' + client.role);
  });

});

app.get('/sessions', function (req, res) {
  res.send(Object.keys(sessions))
})

//start our server
server.listen(port, () => {
    console.log(`Server started on port ${server.address().port} :)`);
});