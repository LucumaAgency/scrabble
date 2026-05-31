import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 10000, // margen para el handshake de Socket.IO en los tests de integracion
  },
});
