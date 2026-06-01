import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { loadDictionary } from './engine/index.js';
import { createRoomManager } from './rooms.js';
import { attachSockets } from './socket.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

// Diccionario: DICCIONARIO_PATH > lista completa es.txt > muestra.
const fullDict = join(__dirname, 'engine/data/dictionary.es.txt');
const dictPath =
  process.env.DICCIONARIO_PATH ||
  (existsSync(fullDict) ? fullDict : join(__dirname, 'engine/data/dictionary.sample.txt'));
const dictionary = loadDictionary(dictPath);
console.log(`Diccionario cargado: ${dictionary.size} palabras (${dictPath})`);

const app = express();
app.get('/health', (_req, res) => res.json({ ok: true, words: dictionary.size }));

// Servir el cliente compilado (client/dist) si existe, con fallback a index.html (SPA).
const clientDist = join(__dirname, '../../client/dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/socket.io')) {
      res.sendFile(join(clientDist, 'index.html'));
    } else {
      next();
    }
  });
  console.log(`Sirviendo cliente desde ${clientDist}`);
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN || '*' },
});

// Estado persistido en disco: la partida sobrevive a reinicios (deploy en Plesk).
const statePath = process.env.STATE_PATH || join(__dirname, '../.data/rooms.json');
const manager = createRoomManager({ dictionary, storePath: statePath });
attachSockets(io, manager);

// Al apagar (Plesk reinicia con SIGTERM), guardamos el estado de inmediato.
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    manager.flush();
    process.exit(0);
  });
}

httpServer.listen(PORT, () => console.log(`Servidor escuchando en :${PORT}`));
