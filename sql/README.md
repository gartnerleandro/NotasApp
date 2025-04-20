# Configuración de Base de Datos para NotasApp

Este directorio contiene los scripts SQL y utilidades para configurar la base de datos de NotasApp en Supabase.

## Estructura del directorio

- `migrations/`: Contiene los scripts SQL de migración organizados por orden de ejecución
- `init.sql`: Script SQL completo (histórico) para crear la base de datos en un solo paso
- `migrations.sh`: Script para aplicar migraciones a través de la CLI de Supabase
- `run_migrations.js`: Script Node.js para aplicar migraciones a través de la API REST de Supabase
- `README_migrations.md`: Documentación detallada sobre las migraciones

## Nuevo enfoque de migraciones

Hemos dividido el script original `init.sql` en migraciones más pequeñas y manejables para permitir:

1. Mayor control sobre la aplicación de cambios
2. Facilidad para actualizar instalaciones existentes
3. Mejor organización de la estructura de la base de datos
4. Documentación más clara de cada componente

## Opciones para configurar una nueva instancia de NotasApp

### Opción 1: Usar scripts de migración (recomendado)

Las migraciones están divididas en archivos separados por funcionalidad. Para aplicarlas:

```bash
# Usando el script de shell (requiere CLI de Supabase)
./migrations.sh TU_REFERENCIA_DE_PROYECTO

# Incluir datos de ejemplo (solo para desarrollo)
./migrations.sh TU_REFERENCIA_DE_PROYECTO --include-sample-data
```

O mediante el script de Node.js:

```bash
# Instalar dependencias primero
npm install node-fetch

# Configurar variables de entorno
export SUPABASE_URL="https://tu-proyecto.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="tu-clave-service-role"

# Aplicar migraciones
node run_migrations.js

# Incluir datos de ejemplo
export INCLUDE_SAMPLE_DATA=true
node run_migrations.js
```

### Opción 2: Script único (método original)

Si prefieres el enfoque anterior, puedes ejecutar el script completo:

```bash
# Desde la CLI de Supabase
supabase db execute --project-ref TU_REFERENCIA_DE_PROYECTO -f init.sql

# O directamente desde el Editor SQL de Supabase
# Copia el contenido de init.sql y ejecútalo en el Editor SQL
```

## Notas importantes

- **Seguridad**: Nunca compartas tu clave service_role; está pensada solo para uso en entornos de desarrollo seguros
- **Migraciones futuras**: Si necesitas hacer cambios al esquema, crea nuevas migraciones numeradas (08_xxx.sql, etc.)
- **RLS (Row Level Security)**: Todas las tablas tienen RLS habilitado; asegúrate de no deshabilitar estas políticas

## Solución de problemas

Si encuentras errores al aplicar migraciones:

- Verifica que tienes los permisos adecuados (clave service_role)
- Asegúrate de que todas las tablas referenciadas existen
- Comprueba que no hay conflictos con objetos existentes

Para más información, consulta [README_migrations.md](./README_migrations.md). 