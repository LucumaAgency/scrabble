import { io } from 'socket.io-client';

// En dev el server vive en :3001; en produccion el mismo origen (Express sirve el build).
const URL =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

export const socket = io(URL, { transports: ['websocket'], autoConnect: true });

// Emit con promesa, usando el ack del servidor.
export function emit(event, payload) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

// playerId persistente para reconexion tras un refresh.
export function getPlayerId() {
  let id = localStorage.getItem('scrabble:playerId');
  if (!id) {
    id = 'p_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('scrabble:playerId', id);
  }
  return id;
}

export const getSavedName = () => localStorage.getItem('scrabble:name') || '';
export const saveName = (n) => localStorage.setItem('scrabble:name', n || '');
export const getSavedCode = () => localStorage.getItem('scrabble:code') || '';
export const saveCode = (c) => localStorage.setItem('scrabble:code', c || '');
