#!/bin/bash
# package_lambdas.sh — Compila y empaqueta las lambdas de TypeScript en archivos .zip

set -e

FORCE=false
[ "${1:-}" = "--force" ] && FORCE=true

# Obtener directorios absolutos
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
LAMBDAS_DIR="$ROOT_DIR/lambdas"
DIST_DIR="$LAMBDAS_DIR/dist"
BUILD_ROOT="$ROOT_DIR/infra/build"
CACHE_DIR="$BUILD_ROOT/cache"
PACKAGES_DIR="$ROOT_DIR/packages"

echo "═══════════════════════════════════════"
echo "  Package Lambdas"
echo "═══════════════════════════════════════"
echo ""

mkdir -p "$PACKAGES_DIR" "$BUILD_ROOT" "$CACHE_DIR"

# Verificar que lambdas exista
if [ ! -d "$LAMBDAS_DIR" ]; then
    echo " Error: No se encontró $LAMBDAS_DIR"
    exit 1
fi

if [ ! -f "$LAMBDAS_DIR/package.json" ]; then
    echo " Error: No se encontró $LAMBDAS_DIR/package.json"
    exit 1
fi

# ---------------------------------------------------------------------------
# Paso 0: Instalar dependencias de desarrollo en lambdas/
# ---------------------------------------------------------------------------
echo "Paso 0: Instalando dependencias de desarrollo..."
cd "$LAMBDAS_DIR"

if [ ! -d "node_modules" ]; then
    echo "  node_modules no existe. Instalando..."
    npm install > /dev/null 2>&1 || {
        echo " Error en npm install"
        exit 1
    }
else
    echo "  ✓ node_modules existe"
fi

echo "✓ Dependencias de desarrollo listas"
echo ""
cd "$ROOT_DIR"

# ---------------------------------------------------------------------------
# Paso 1: Compilar TypeScript
# ---------------------------------------------------------------------------
echo "Paso 1: Compilando TypeScript..."
cd "$LAMBDAS_DIR"

npm run build > /dev/null 2>&1 || {
    echo " Error en npm run build"
    exit 1
}

cd "$ROOT_DIR"
echo "✓ TypeScript compilado"
echo ""

# ---------------------------------------------------------------------------
# Paso 2: Cachear dependencias de producción
# ---------------------------------------------------------------------------
echo "Paso 2: Preparando dependencias de producción..."

HASH_FILE="$CACHE_DIR/package.hash"

# Calcular hash
if [ -f "$LAMBDAS_DIR/package-lock.json" ]; then
    NEW_HASH=$(cat "$LAMBDAS_DIR/package.json" "$LAMBDAS_DIR/package-lock.json" | sha256sum | awk '{print $1}')
else
    NEW_HASH=$(cat "$LAMBDAS_DIR/package.json" | sha256sum | awk '{print $1}')
fi

OLD_HASH=""
[ -f "$HASH_FILE" ] && OLD_HASH=$(cat "$HASH_FILE")

if [ "$NEW_HASH" != "$OLD_HASH" ] || [ ! -d "$CACHE_DIR/node_modules" ] || $FORCE; then
    echo "  Reinstalando dependencias de producción..."
    rm -rf "$CACHE_DIR/node_modules"
    
    cp "$LAMBDAS_DIR/package.json" "$CACHE_DIR/" 2>/dev/null || true
    [ -f "$LAMBDAS_DIR/package-lock.json" ] && cp "$LAMBDAS_DIR/package-lock.json" "$CACHE_DIR/" 2>/dev/null || true
    
    cd "$CACHE_DIR"
    npm install --omit=dev > /dev/null 2>&1 || {
        echo " Error instalando dependencias"
        exit 1
    }
    cd "$ROOT_DIR"
    
    echo "$NEW_HASH" > "$HASH_FILE"
    echo "  ✓ Dependencias de producción instaladas"
else
    echo "  ✓ Usando dependencias en caché"
fi

echo ""

# ---------------------------------------------------------------------------
# Paso 3: Empaquetar lambdas
# ---------------------------------------------------------------------------
echo "Paso 3: Empaquetando lambdas..."
echo ""

STAGING_DIR="$BUILD_ROOT/staging"
PACKAGED=0

# Limpieza inicial
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"

# Pre-copiar node_modules UNA SOLA VEZ
cp -r "$CACHE_DIR/node_modules" "$STAGING_DIR/" || {
    echo " Error copiando node_modules"
    exit 1
}

# Obtener lista de lambdas
for func_dir in "$LAMBDAS_DIR"/*/; do
    [ -d "$func_dir" ] || continue
    FUNC_NAME=$(basename "$func_dir")
    
    # Saltar carpetas que no son lambdas
    case "$FUNC_NAME" in 
        shared|node_modules|dist|tests) 
            continue 
        ;; 
    esac

    # Calcular hash del código fuente
    SRC_HASH=$(
        {
            find "$LAMBDAS_DIR/$FUNC_NAME" -type f -name "*.ts" 2>/dev/null | sort
            find "$LAMBDAS_DIR/shared"     -type f -name "*.ts" 2>/dev/null | sort
        } | xargs cat 2>/dev/null | sha256sum | awk '{print $1}' || echo "error"
    )

    SRC_HASH_FILE="$BUILD_ROOT/$FUNC_NAME.hash"
    OLD_SRC_HASH=""
    [ -f "$SRC_HASH_FILE" ] && OLD_SRC_HASH=$(cat "$SRC_HASH_FILE")

    ZIP_FILE="$PACKAGES_DIR/$FUNC_NAME.zip"

    # Verificar si necesita reempaquetar
    if ! $FORCE && [ "$SRC_HASH" = "$OLD_SRC_HASH" ] && [ -f "$ZIP_FILE" ]; then
        echo "  ✓ $FUNC_NAME (sin cambios)"
        continue
    fi

    # Verificar que handler.js existe
    if [ ! -f "$DIST_DIR/$FUNC_NAME/handler.js" ]; then
        echo "    $FUNC_NAME: No se encontró handler.js"
        continue
    fi

    # Crear directorio temporal para esta lambda
    LAMBDA_STAGING="$BUILD_ROOT/staging_$FUNC_NAME"
    rm -rf "$LAMBDA_STAGING"
    mkdir -p "$LAMBDA_STAGING"

    # Copiar handler.js preservando la subcarpeta para que los imports relativos funcionen
    mkdir -p "$LAMBDA_STAGING/$FUNC_NAME"
    cp "$DIST_DIR/$FUNC_NAME/handler.js" "$LAMBDA_STAGING/$FUNC_NAME/"

    # Copiar shared al mismo nivel que la subcarpeta de la lambda
    if [ -d "$DIST_DIR/shared" ]; then
        mkdir -p "$LAMBDA_STAGING/shared"
        cp -r "$DIST_DIR/shared"/* "$LAMBDA_STAGING/shared/" 2>/dev/null || true
    fi

    # Copiar node_modules (symlink para ahorrar espacio)
    ln -s "$(cd "$STAGING_DIR/node_modules" && pwd)" "$LAMBDA_STAGING/node_modules"

    # Crear ZIP
    rm -f "$ZIP_FILE"
    (cd "$LAMBDA_STAGING" && zip -r9 "$ZIP_FILE" . > /dev/null 2>&1) || {
        echo "   $FUNC_NAME: Error creando ZIP"
        rm -rf "$LAMBDA_STAGING"
        continue
    }

    # Limpiar staging temporal
    rm -rf "$LAMBDA_STAGING"

    # Guardar hash
    echo "$SRC_HASH" > "$SRC_HASH_FILE"
    ZIP_SIZE=$(du -sh "$ZIP_FILE" 2>/dev/null | cut -f1)
    echo "   $FUNC_NAME.zip ($ZIP_SIZE)"
    PACKAGED=$((PACKAGED + 1))
done

# Limpiar
rm -rf "$STAGING_DIR"

echo ""
echo "═══════════════════════════════════════"
if [ $PACKAGED -gt 0 ]; then
    echo "  ✓ Empaquetado completado"
    echo "  Total: $PACKAGED lambda(s)"
else
    echo "    No se empaquetó nada (todo sin cambios)"
fi
echo "═══════════════════════════════════════"
echo ""

ls -lh "$PACKAGES_DIR"/*.zip 2>/dev/null | awk '{printf "  %s (%s)\n", $9, $5}' || echo "  (ningún ZIP)"