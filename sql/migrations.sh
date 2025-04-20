#!/bin/bash

# Script para aplicar migraciones SQL a Supabase utilizando la CLI oficial
# Requisitos: Tener instalada la CLI de Supabase (https://supabase.com/docs/guides/cli)

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Comprobar si se ha proporcionado la referencia del proyecto
if [ -z "$1" ]; then
  echo -e "${RED}Error: Debes proporcionar la referencia del proyecto de Supabase${NC}"
  echo "Uso: ./migrations.sh <referencia-del-proyecto> [--include-sample-data]"
  exit 1
fi

PROJECT_REF="$1"
INCLUDE_SAMPLE_DATA=false

# Comprobar opciones adicionales
if [ "$2" = "--include-sample-data" ]; then
  INCLUDE_SAMPLE_DATA=true
fi

# Comprobar si supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
  echo -e "${RED}Error: La CLI de Supabase no está instalada${NC}"
  echo "Por favor, instálala siguiendo las instrucciones en: https://supabase.com/docs/guides/cli"
  exit 1
fi

# Directorio de migraciones
MIGRATIONS_DIR="$(dirname "$0")/migrations"

# Comprobar si existe el directorio de migraciones
if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo -e "${RED}Error: No se encuentra el directorio de migraciones: $MIGRATIONS_DIR${NC}"
  exit 1
fi

echo -e "${YELLOW}Iniciando proceso de migración para el proyecto: $PROJECT_REF${NC}"

# Verificar la autenticación con Supabase
echo "Verificando autenticación con Supabase..."
supabase projects list > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo -e "${RED}Error: No autenticado con Supabase${NC}"
  echo "Por favor, ejecuta 'supabase login' primero"
  exit 1
fi

# Aplicar migraciones en orden
echo "Aplicando migraciones..."

# Obtener la lista de archivos de migración
files=($(ls -1 "$MIGRATIONS_DIR"/*.sql | sort))

# Filtrar datos de ejemplo si no se ha solicitado
if [ "$INCLUDE_SAMPLE_DATA" = false ]; then
  filtered_files=()
  for file in "${files[@]}"; do
    if [[ ! "$file" =~ "sample_data" ]]; then
      filtered_files+=("$file")
    fi
  done
  files=("${filtered_files[@]}")
fi

echo "Se aplicarán ${#files[@]} archivos de migración"

# Aplicar cada migración
for file in "${files[@]}"; do
  filename=$(basename "$file")
  echo -e "${YELLOW}Aplicando migración: $filename...${NC}"
  
  supabase db execute --project-ref "$PROJECT_REF" -f "$file"
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migración $filename aplicada correctamente${NC}"
  else
    echo -e "${RED}✗ Error al aplicar la migración $filename${NC}"
    echo "El proceso de migración se ha detenido"
    exit 1
  fi
done

echo -e "${GREEN}✓ Todas las migraciones se han aplicado correctamente${NC}"

# Verificación opcional
echo -e "${YELLOW}¿Quieres verificar las tablas y políticas creadas? (s/n)${NC}"
read -n 1 -r
echo ""
if [[ $REPLY =~ ^[Ss]$ ]]; then
  echo "Verificando tablas creadas..."
  supabase db execute --project-ref "$PROJECT_REF" -f - << EOF
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
EOF

  echo "Verificando políticas RLS..."
  supabase db execute --project-ref "$PROJECT_REF" -f - << EOF
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
EOF
fi

echo -e "${GREEN}Proceso de migración completado${NC}" 