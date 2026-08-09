#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Despliega el frontend al SERVIDOR DE TEST (base EEUU).
#
#   npm run deploy:test
#
# Compila con `build:us` (que activa VITE_ENV_TARGET=test desde .env.us) y sube
# el resultado por SSH. NO toca producción: producción se despliega aparte,
# reconstruyendo la imagen Docker con `npm run build` (que siempre apunta a prod).
#
# Requisitos: acceso SSH al servidor (llave o password).
# Configurable por variables de entorno:
#   TEST_HOST   destino ssh/scp        (default: root@194.26.100.138)
#   TEST_PATH   carpeta en el servidor (default: /var/www/samap-test)
# ---------------------------------------------------------------------------
set -euo pipefail

HOST="${TEST_HOST:-root@194.26.100.138}"
DEST="${TEST_PATH:-/var/www/samap-test}"
TARBALL="samap-test-dist.tgz"

echo "==> Compilando para TEST (base EEUU)..."
npm run build:us

# --- Chequeo de seguridad: el build NO debe apuntar a producción -------------
echo "==> Verificando a qué base apunta el build..."
PROD_REF="ejiycfqxgtrzaysgpzmx"
TEST_REF="ykducvvcjzdpoojxlsig"

if ! grep -rqs "$TEST_REF" dist/assets/; then
  echo "ABORTADO: el build NO contiene la base de test ($TEST_REF)." >&2
  echo "Revisá que .env.us tenga VITE_ENV_TARGET=test y VITE_SUPABASE_URL." >&2
  exit 1
fi
echo "    OK: build apunta a la base de test."

if [ -f dist/build-version.json ]; then
  echo "==> Version a desplegar:"; cat dist/build-version.json
fi

echo "==> Empaquetando y subiendo a $HOST:$DEST ..."
tar --force-local -czf "/tmp/$TARBALL" -C dist .
scp "/tmp/$TARBALL" "$HOST:/tmp/$TARBALL"

# Backup de la version anterior por si hay que volver atras, y reemplazo atomico
ssh "$HOST" "
  set -e
  rm -rf '$DEST.bak'
  cp -r '$DEST' '$DEST.bak' 2>/dev/null || true
  rm -rf '$DEST'/*
  tar -xzf '/tmp/$TARBALL' -C '$DEST'
  rm -f '/tmp/$TARBALL'
"
rm -f "/tmp/$TARBALL"

echo "==> Listo. Demo actualizado."
echo "    http://194.26.100.138:9292"
echo "    Verificar: http://194.26.100.138:9292/build-version.json"
echo "    Rollback:  ssh $HOST 'rm -rf $DEST/* && cp -r $DEST.bak/* $DEST/'"
