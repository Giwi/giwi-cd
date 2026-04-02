const WebSocket = require('ws');

class WebSocketManager {
  constructor() {
    this.clients = new Set();
    this.wss = null;
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ server, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      console.log(`[WS] New client connected from ${req.socket.remoteAddress}`);
      this.clients.add(ws);

      ws.send(JSON.stringify({ type: 'connected', message: 'Connected to GiwiCD WebSocket' }));

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this._handleMessage(ws, data);
        } catch (e) {
          console.error('[WS] Invalid message:', e.message);
        }
      });

      ws.on('close', () => {
        console.log('[WS] Client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (err) => {
        console.error('[WS] Client error:', err.message);
        this.clients.delete(ws);
      });
    });

    console.log('[WS] WebSocket server initialized');
  }

  _handleMessage(ws, data) {
    switch (data.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        break;
      case 'subscribe':
        ws.buildId = data.buildId;
        break;
      default:
        break;
    }
  }

  broadcast(data) {
    console.log('[WS] Broadcasting:', data.type, 'to', this.clients.size, 'clients');
    const message = JSON.stringify(data);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          if (!data.buildId || !client.buildId || client.buildId === data.buildId) {
            client.send(message);
          }
        } catch (err) {
          // Client disconnected, remove from list
          this.clients.delete(client);
        }
      } else if (client.readyState !== WebSocket.CONNECTING) {
        this.clients.delete(client);
      }
    });
  }

  sendToBuild(buildId, data) {
    const message = JSON.stringify(data);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client.buildId === buildId) {
        try {
          client.send(message);
        } catch (err) {
          this.clients.delete(client);
        }
      } else if (client.readyState !== WebSocket.CONNECTING && client.buildId === buildId) {
        this.clients.delete(client);
      }
    });
  }

  getConnectedClients() {
    return this.clients.size;
  }
}

module.exports = new WebSocketManager();
