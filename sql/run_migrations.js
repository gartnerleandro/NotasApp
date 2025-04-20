/**
 * Script para aplicar migraciones SQL a un proyecto Supabase
 * 
 * Uso:
 * 1. Configura las variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 * 2. Ejecuta: node run_migrations.js
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Configuración
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MIGRATIONS_PATH = path.join(__dirname, 'migrations');
const INCLUDE_SAMPLE_DATA = process.env.INCLUDE_SAMPLE_DATA === 'true';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: Se requieren las variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

/**
 * Aplica una migración SQL
 * @param {string} sql - Contenido SQL para ejecutar
 * @param {string} fileName - Nombre del archivo para logs
 */
async function aplicarMigracion(sql, fileName) {
  console.log(`Aplicando migración: ${fileName}...`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({ query: sql })
    });
    
    const data = await response.json();
    
    if (response.status >= 400) {
      console.error(`Error al aplicar ${fileName}:`, data);
      return false;
    }
    
    console.log(`✅ Migración ${fileName} aplicada correctamente`);
    return true;
  } catch (error) {
    console.error(`❌ Error al aplicar ${fileName}:`, error.message);
    return false;
  }
}

/**
 * Ejecuta todas las migraciones en orden
 */
async function ejecutarMigraciones() {
  console.log('Iniciando proceso de migración...');
  
  try {
    // Leer todos los archivos de migración
    const files = fs.readdirSync(MIGRATIONS_PATH)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    if (!INCLUDE_SAMPLE_DATA) {
      // Filtrar el archivo de datos de ejemplo si no está habilitado
      files = files.filter(file => !file.includes('sample_data'));
    }
    
    console.log(`Encontrados ${files.length} archivos de migración`);
    
    // Aplicar cada migración en secuencia
    for (const file of files) {
      const filePath = path.join(MIGRATIONS_PATH, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      const success = await aplicarMigracion(sql, file);
      
      if (!success) {
        console.error(`❌ Proceso de migración interrumpido en ${file}`);
        process.exit(1);
      }
    }
    
    console.log('✅ Todas las migraciones aplicadas correctamente');
  } catch (error) {
    console.error('Error durante el proceso de migración:', error);
    process.exit(1);
  }
}

// Ejecutar migraciones
ejecutarMigraciones(); 