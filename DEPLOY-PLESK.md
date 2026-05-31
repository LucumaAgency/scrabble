# Despliegue en Plesk

Guía para desplegar el Scrabble multijugador en Plesk con Git + Node.js (Passenger).

- **Repo:** https://github.com/LucumaAgency/scrabble (público)
- **Dominio de pruebas:** http://scrabble.pruebalucuma.site

---

## 1. Git en Plesk

- **URL del repo:** `https://github.com/LucumaAgency/scrabble.git`
- **Credenciales HTTP:** dejar **en blanco** (el repo es público; no se necesitan).
  - Si algún día se hace privado: usuario `LucumaAgency` + un **Personal Access Token**
    (NO la contraseña de GitHub, que ya no funciona para Git por HTTPS).
- **Rama de despliegue:** `main`
- **Modo de despliegue:** manual al principio (controlas cuándo actualiza).

---

## 2. Configuración de Node.js

| Campo | Valor | Notas |
|---|---|---|
| Versión de Node | `21.7.3` (o `22`) | El CI usa Node 22; 21 funciona igual (ESM, sin `engines`). |
| Package manager | `npm` | El repo usa npm workspaces. |
| Modo de aplicación | `production` | |
| **Archivo de inicio** | **`app.cjs`** | ⚠️ NO es `app.js` ni `server/src/server.js`. Passenger carga el entry con `require()`, incompatible con ESM; `app.cjs` es un shim CommonJS que arranca el server ESM con `import()` dinámico. |
| Raíz de la aplicación | `/scrabble.pruebalucuma.site` | Donde se clona el repo. |
| Raíz del documento | `/scrabble.pruebalucuma.site` (raíz de la app) | NO usar `public/`: Express sirve el cliente y `/socket.io` por sí mismo; todo pasa por Node. |

### Variables de entorno personalizadas

```
NODE_ENV = production
```

- **No** definir `PORT`: Plesk/Passenger lo inyecta y el código ya lee `process.env.PORT`.
- No hace falta `CORS_ORIGIN` (default `*`) ni `DICCIONARIO_PATH` (usa `dictionary.es.txt`, 635k palabras).

---

## 3. Pasos de despliegue (en orden)

1. Establecer **Archivo de inicio** → `app.cjs` y guardar.
2. Pulsar **NPM install** (instala dependencias de los workspaces server + client).
3. Ejecutar el build del cliente: botón **Run script** → `build` (corre `npm run build`,
   genera `client/dist`).
   - `client/dist` ya está versionado en el repo, así que arranca aunque no se buildee,
     pero conviene buildear para tener la versión fresca.
4. **Reiniciar** la aplicación (Restart).

### Acciones de despliegue automáticas (opcional, para el Git de Plesk)

Tras cada `git pull` ejecutar:

```bash
npm ci
npm run build
```

Y reiniciar la app Node desde el panel.

---

## 4. Verificación

- Abrir `http://scrabble.pruebalucuma.site/health`
  - Debe responder: `{"ok":true,"words":635090}` → Node arrancó y cargó el diccionario.
- Abrir la home en dos navegadores (o una ventana de incógnito) para simular 2 jugadores:
  crear sala en uno, unirse con el código en el otro.

---

## 5. Pendiente / a verificar

- **WebSockets de Socket.IO:** Passenger los soporta. Si la conexión WS falla, Socket.IO
  cae a long-polling (funciona igual, más lento). Verificar en la consola del navegador
  (pestaña Network → `socket.io`) que la conexión se establece. Si hace falta, afinar el
  proxy de WebSockets en la configuración nginx/Apache del dominio (pasar headers
  `Upgrade`/`Connection` y enrutar `/socket.io`).
