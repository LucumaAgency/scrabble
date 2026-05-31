// Punto de entrada para Phusion Passenger (Plesk).
//
// Passenger carga el archivo de inicio con require(), y este proyecto usa ES
// Modules ("type": "module" + import), que require() no puede cargar
// directamente (ERR_REQUIRE_ESM). Este shim CommonJS usa import() dinámico
// —permitido desde CJS— para arrancar el servidor ESM sin tocar el resto.
import('./server/src/server.js').catch((err) => {
  console.error('No se pudo iniciar el servidor:', err);
  process.exit(1);
});
