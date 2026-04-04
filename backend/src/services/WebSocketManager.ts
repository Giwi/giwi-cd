import WebSocket from 'ws';
import type http from 'http';

interface WSMessage {
  type: string;
  buildId?: string;
  pipelineId?: string;
  message?: string;
  timestamp?: string;
  [key: string]: unknown;
}

interface ExtendedWebSocket extends WebSocket {
  buildId?: string;
}

class WebSocketManager {
  private clients: Set<ExtendedWebSocket>;
  private wss: WebSocket.Server | null;

  constructor() {
    this.clients = new Set();
    this.wss = null;
  }

  initialize(server: http.Server): void {
    this.wss = new WebSocket.Server({ server, path: '/ws' });

    this.wss.on('connection', (ws: ExtendedWebSocket, req: http.IncomingMessage) => {
      console.log(`[WS] New client connected from ${req.socket.remoteAddress}`);
      this.clients.add(ws);

      ws.send(JSON.stringify({ type: 'connected', message: 'Connected to GiwiCD WebSocket' }));

      ws.on('message', (message: WebSocket.Data) => {
        try {
          const data = JSON.parse(message.toString());
          this._handleMessage(ws, data);
        } catch (e) {
          console.error('[WS] Invalid message:', (e as Error).message);
        }
      });

      ws.on('close', () => {
        console.log('[WS] Client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (err: Error) => {
        console.error('[WS] Client error:', err.message);
        this.clients.delete(ws);
      });
    });

    console.log('[WS] WebSocket server initialized');
  }

  private _handleMessage(ws: ExtendedWebSocket, data: WSMessage): void {
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

  broadcast(data: WSMessage): void {
    console.log('[WS] Broadcasting:', data.type, 'to', this.clients.size, 'clients');
    const message = JSON.stringify(data);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          if (!data.buildId || !client.buildId || client.buildId === data.buildId) {
            client.send(message);
          }
        } catch {
          this.clients.delete(client);
        }
      } else if (client.readyState !== WebSocket.CONNECTING) {
        this.clients.delete(client);
      }
    });
  }

  sendToBuild(buildId: string, data: WSMessage): void {
    const message = JSON.stringify(data);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client.buildId === buildId) {
        try {
          client.send(message);
        } catch {
          this.clients.delete(client);
        }
      } else if (client.readyState !== WebSocket.CONNECTING && client.buildId === buildId) {
        this.clients.delete(client);
      }
    });
  }

  getConnectedClients(): number {
    return this.clients.size;
  }
}

export default new WebSocketManager();
