require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Obtener credenciales de Supabase desde las variables de entorno
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Esta clave debe tener permisos de administrador

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Las variables de entorno EXPO_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas.');
  process.exit(1);
}

// Crear cliente de Supabase con la clave de servicio
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorage() {
  try {
    console.log('Configurando almacenamiento para notas de voz...');
    
    // Crear un bucket para almacenar archivos de audio si no existe
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      throw bucketsError;
    }
    
    // Verificar si ya existe el bucket
    const bucketName = 'audio-notes';
    const bucketExists = buckets.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      // Crear bucket para archivos de audio
      console.log(`Creando bucket "${bucketName}"...`);
      const { error: createBucketError } = await supabase.storage.createBucket(bucketName, {
        public: true, // Hacer el bucket público para que se puedan acceder a los archivos directamente
        fileSizeLimit: 50 * 1024 * 1024, // Limitar tamaño a 50MB
      });
      
      if (createBucketError) {
        throw createBucketError;
      }
      
      console.log(`Bucket "${bucketName}" creado exitosamente.`);
    } else {
      console.log(`El bucket "${bucketName}" ya existe.`);
      
      // Actualizar configuración del bucket para asegurarnos que es público
      const { error: updateBucketError } = await supabase.storage.updateBucket(bucketName, {
        public: true,
        fileSizeLimit: 50 * 1024 * 1024,
      });
      
      if (updateBucketError) {
        throw updateBucketError;
      }
      
      console.log(`Configuración del bucket "${bucketName}" actualizada.`);
    }
    
    // Configurar política de seguridad para permitir acceso a archivos
    console.log('Configurando política de acceso a archivos...');
    
    // Permitir leer archivos públicamente
    const readPolicyName = 'Allow public read';
    const { error: policyError } = await supabase.storage.from(bucketName).createPolicy(
      readPolicyName,
      {
        type: 'READ',
        definition: {
          role: 'authenticated',
          permission: 'TRUE',
        },
      }
    );
    
    if (policyError && !policyError.message.includes('already exists')) {
      throw policyError;
    }
    
    console.log('Configuración de almacenamiento completada.');
    
  } catch (error) {
    console.error('Error al configurar el almacenamiento:', error);
  }
}

// Ejecutar configuración
setupStorage(); 