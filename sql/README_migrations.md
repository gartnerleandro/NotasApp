# Migraciones SQL para NotasApp

Este directorio contiene todas las migraciones SQL necesarias para configurar una nueva instancia de la base de datos de NotasApp en Supabase.

## Estructura de migraciones

Las migraciones están ordenadas numéricamente y deben aplicarse en secuencia:

1. **01_extensions.sql**: Configura las extensiones necesarias.
2. **02_tables.sql**: Crea las tablas principales del esquema.
3. **03_indexes.sql**: Configura índices para optimizar consultas.
4. **04_row_level_security.sql**: Habilita Row Level Security (RLS).
5. **05_policies.sql**: Define las políticas de seguridad.
6. **06_triggers.sql**: Configura triggers y funciones automáticas.
7. **07_sample_data.sql**: (Opcional) Inserta datos de ejemplo para desarrollo.

## Cómo aplicar las migraciones

### Opción 1: Aplicar desde el dashboard de Supabase

1. Inicia sesión en tu proyecto de Supabase
2. Ve a la sección "SQL Editor"
3. Crea una nueva consulta
4. Copia y pega el contenido de cada archivo de migración, respetando el orden
5. Ejecuta cada script

### Opción 2: Usar la CLI de Supabase

Si tienes la CLI de Supabase instalada:

```bash
# Autenticarse
supabase login

# Aplicar las migraciones en orden
for file in sql/migrations/*.sql; do
  supabase db execute --project-ref TU_REFERENCIA_DE_PROYECTO -f "$file"
done
```

### Opción 3: Usar la API HTTP de Supabase

También puedes aplicar estas migraciones usando la API REST de Supabase con la clave de servicio (service_role):

```javascript
async function aplicarMigracion(url, apiKey, sql) {
  const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ query: sql })
  });
  return response.json();
}
```

## Notas importantes

- **Entornos de producción**: Ejecuta solo las migraciones 01-06 en producción.
- **Datos de ejemplo**: La migración 07 es opcional y solo para desarrollo.
- **Orden**: Respeta siempre el orden numérico de las migraciones.
- **Idempotencia**: Las migraciones están diseñadas para ser idempotentes (pueden ejecutarse varias veces sin efectos secundarios).

## Verificación

Para verificar que las migraciones se han aplicado correctamente, puedes ejecutar:

```sql
-- Verificar tablas creadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Verificar políticas RLS
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';
```

## Solución de problemas

Si encuentras algún error al aplicar las migraciones:

1. Verifica que tienes los permisos necesarios
2. Asegúrate de estar ejecutando las migraciones en el orden correcto
3. Revisa los registros para identificar el error específico
4. Si es necesario, restaura una copia de seguridad antes de volver a intentarlo 