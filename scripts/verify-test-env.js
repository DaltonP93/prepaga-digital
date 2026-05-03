#!/usr/bin/env node
/**
 * SAMAP Environment Verification Script
 * Aborta SIEMPRE si detecta conexión a Brasil (Producción)
 *
 * Uso: node scripts/verify-test-env.js
 * Se puede integrar en predev: "node scripts/verify-test-env.js && vite"
 */

const PROD_PROJECT_ID = 'ejiycfqxgtrzaysgpzmx';
const PROD_URL = 'ejiycfqxgtrzaysgpzmx.supabase.co';

const envUrl = process.env.VITE_SUPABASE_URL || '';
const envProjectId = process.env.VITE_SUPABASE_PROJECT_ID || '';

function isProductionEnv() {
  return (
    envUrl.includes(PROD_URL) ||
    envProjectId === PROD_PROJECT_ID
  );
}

if (isProductionEnv()) {
  console.error('\n🚨 ERROR CRÍTICO: El archivo .env apunta a BRASIL (PRODUCCIÓN).');
  console.error('   Desarrollo local DEBE usar EEUU (TEST).');
  console.error('   Si necesitas apuntar a Brasil, usa: npm run dev:br');
  console.error('   Y confirma explícitamente que deseas conectarte a producción.\n');
  process.exit(1);
}

console.log('✅ Verificación de entorno: OK (EEUU/Test)\n');
