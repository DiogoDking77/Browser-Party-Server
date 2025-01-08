const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const handleConnection = require('./socketHandlers/connectionHandler');

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'https://browser-party-client.onrender.com',
  },
});

app.use(cors());

io.on('connection', (socket) => {
  handleConnection(io, socket);
});

server.listen(3000, () => {
  console.log(`Servidor a correr, ligado a ${process.env.CLIENT_URL}`);
});
