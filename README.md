# Scrabble multijugador (MVP casero)

Scrabble en español por turnos, multijugador por salas, sin registro. Node + React.

## Estructura

```
scrabble/
├── server/                 # Backend Node (motor de juego + Socket.IO*)
│   ├── src/engine/         # Motor PURO (sin sockets, sin UI): testeable y aislado
│   │   ├── tiles.js        # Fichas, bolsa, distribución oficial española (digrafos + Ñ)
│   │   ├── board.js        # Tablero 15x15 y casillas premium
│   │   ├── words.js        # Lectura de palabras en el tablero
│   │   ├── placement.js    # Validación estructural de una jugada
│   │   ├── score.js        # Puntuación (multiplicadores + bingo)
│   │   ├── dictionary.js   # Carga y consulta del diccionario
│   │   ├── normalize.js    # Normalización (tildes fuera, Ñ dentro)
│   │   └── game.js         # Máquina de estados de la partida
│   └── test/               # Tests del motor (vitest)
├── client/                 # Frontend React (pendiente)
└── .github/workflows/      # CI

* Socket.IO y salas: siguiente paso.
```

## Decisiones del MVP

- **Español con dígrafos**: CH, LL, RR y Ñ son fichas propias (un token cada una). Las
  palabras se forman concatenando tokens y se validan como string contra el diccionario.
- **Estado en memoria**: una partida = un objeto. Sin Redis, un solo proceso.
- **Sin registro**: código de sala + nombre al unirse. `playerId` en localStorage para
  reconexión.
- **Server-authoritative**: toda validación y reparto ocurre en el servidor; el cliente
  solo dibuja y nunca ve el atril rival (ver `publicState`).

## Desarrollo

```bash
npm install        # instala dependencias del workspace
npm test           # corre los tests del motor
```

## Diccionario

`server/src/engine/data/dictionary.sample.txt` es solo una muestra para los tests. En
producción se reemplaza por una lista completa en español (p. ej. derivada de FISE),
una palabra por línea. `loadDictionary(path)` la normaliza al cargar.

## Despliegue (Plesk) — pendiente de afinar

Plan: GitHub Actions valida (tests + build), y Plesk hace `git pull` + acciones de
despliegue (`npm ci`, build del cliente, reinicio de la app Node). Los WebSockets de
Socket.IO requieren configuración de proxy en nginx/Apache del dominio (lo afinamos al
montar el servidor).
