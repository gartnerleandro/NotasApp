const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

// Leer el archivo .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

// Parsear las variables de entorno
const envVars = {};
envContent.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim();
    }
  }
});

// Configurar el proceso con las variables de entorno
const env = { ...process.env, ...envVars };
console.log('Iniciando Expo con las siguientes variables de entorno:');
Object.keys(envVars).forEach(key => {
  console.log(`${key}=${envVars[key]}`);
});

// Ejecutar expo start
const expo = spawn('npx', ['expo', 'start', '--clear'], { 
  env,
  stdio: 'inherit', 
  shell: true 
});

expo.on('error', (error) => {
  console.error('Error al iniciar Expo:', error);
});

expo.on('close', (code) => {
  console.log(`Expo se cerró con código: ${code}`);
}); 