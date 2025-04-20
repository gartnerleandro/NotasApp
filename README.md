# NotasApp

NotasApp es una aplicación móvil completa para la gestión de notas con autenticación de usuarios y almacenamiento en la nube mediante Supabase. Diseñada para ser intuitiva y potente, permite organizar tus ideas, tareas y recordatorios de forma segura y accesible desde cualquier dispositivo.

## ¿En qué consiste NotasApp?

NotasApp ha sido desarrollada para facilitar la organización personal y profesional mediante un sistema de notas digitales con las siguientes ventajas:

- **Acceso seguro**: Sistema de autenticación robusto que protege tus datos personales
- **Disponibilidad constante**: Sincronización en la nube que permite acceder a tus notas desde cualquier dispositivo
- **Interfaz adaptable**: Diseño que se ajusta perfectamente a móviles, tablets y ordenadores
- **Personalización**: Modo claro/oscuro para adaptar la interfaz a tus preferencias

## Guía de usuario (español de España)

### Registro e inicio de sesión

1. Abre la aplicación NotasApp en tu móvil o tablet
2. Selecciona "Crear cuenta" e introduce tu correo electrónico y contraseña
3. Verifica tu correo electrónico haciendo clic en el enlace recibido
4. Vuelve a la aplicación e inicia sesión con tus credenciales

### Crear y gestionar notas

1. Pulsa el botón "+" en la pantalla principal para crear una nueva nota
2. Introduce un título descriptivo y el contenido de tu nota
3. La nota se guardará automáticamente mientras escribes
4. Para editar una nota existente, simplemente púlsala en la lista
5. Para eliminar una nota, desliza hacia la izquierda sobre ella en la lista y pulsa "Eliminar"

### Búsqueda de notas

1. Utiliza la barra de búsqueda en la parte superior de la pantalla principal
2. Escribe palabras clave relacionadas con el contenido o título de tus notas
3. Los resultados se mostrarán instantáneamente mientras escribes

### Personalización de la interfaz

1. Accede a la configuración desde el menú de perfil
2. Selecciona "Apariencia" para cambiar entre modo claro y oscuro
3. Ajusta el tamaño de texto según tus preferencias visuales

## Compartir Notas

NotasApp permite compartir tus notas con otros usuarios registrados en la aplicación, facilitando la colaboración y el intercambio de información.

### Características principales

- **Permisos personalizables**: Comparte notas con permisos de solo lectura o lectura/escritura
- **Gestión de colaboradores**: Añade o elimina usuarios con acceso a tus notas
- **Interfaz intuitiva**: Busca usuarios y gestiona permisos desde una interfaz sencilla
- **Organización clara**: Visualiza las notas que otros han compartido contigo en una sección específica

### Cómo compartir una nota

1. Abre una nota que hayas creado
2. Pulsa el icono de compartir en la esquina superior derecha
3. Busca usuarios por nombre de usuario
4. Selecciona el permiso que deseas otorgar (lectura o escritura)
5. Pulsa "Compartir" para confirmar

### Gestión de permisos

Para gestionar quién tiene acceso a tus notas:
- Abre una nota y pulsa el icono de compartir
- Verás la lista de usuarios con acceso a la nota
- Puedes eliminar usuarios pulsando el icono X junto a su nombre

### Notas compartidas contigo

Las notas que otros usuarios han compartido contigo aparecen en una sección independiente en la pantalla principal. Estas notas están identificadas con un borde de color y un icono distintivo.

- Si tienes permisos de solo lectura, podrás visualizar pero no modificar la nota
- Si tienes permisos de lectura/escritura, podrás editar la nota libremente

## Solución de problemas comunes

### La aplicación no se sincroniza correctamente

1. Comprueba tu conexión a Internet
2. Cierra la aplicación completamente y vuelve a abrirla
3. Verifica que has iniciado sesión correctamente

### No puedo acceder a mi cuenta

1. Asegúrate de estar utilizando el correo electrónico correcto
2. Utiliza la opción "He olvidado mi contraseña" para restablecerla
3. Comprueba tu bandeja de entrada y carpeta de spam para el correo de restablecimiento

### Las notas compartidas no aparecen

1. Pide al usuario que ha compartido la nota que verifique los permisos
2. Actualiza la lista deslizando hacia abajo en la pantalla principal
3. Cierra sesión y vuelve a iniciar sesión si el problema persiste

## Detalles técnicos

### Estructura de datos

La funcionalidad de compartir notas se basa en:

```sql
CREATE TABLE note_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission VARCHAR(20) NOT NULL CHECK (permission IN ('read', 'write')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(note_id, shared_with_id)
);
```

### Seguridad

La aplicación utiliza Row Level Security (RLS) para garantizar que los usuarios solo puedan:
- Ver notas que les pertenecen o que han sido compartidas con ellos
- Editar notas propias o compartidas con permisos de escritura
- Compartir únicamente notas de su propiedad

## Tecnologías utilizadas

- React Native con Expo
- TypeScript/JavaScript
- Supabase para autenticación y base de datos
- Expo Router para navegación
- React Native Paper para componentes de interfaz

## Requisitos previos

- Node.js (versión 14 o superior)
- npm o yarn
- Cuenta en Supabase (gratuita)
- Expo CLI (`npm install -g expo-cli`)

## Configuración para desarrolladores

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/notasapp.git
cd notasapp
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Supabase

1. Crea una cuenta en [Supabase](https://supabase.com/) si aún no dispones de una
2. Crea un nuevo proyecto
3. Obtén la URL del proyecto y la clave anónima (Anon Key) desde la sección de configuración de API
4. Sustituye las credenciales en el archivo `.env.local`:

```
EXPO_PUBLIC_SUPABASE_URL=TU_URL_DE_SUPABASE
EXPO_PUBLIC_SUPABASE_ANON_KEY=TU_CLAVE_ANON_DE_SUPABASE
```

### 4. Configurar la base de datos

1. Ve a la sección SQL Editor en el panel de control de Supabase
2. Ejecuta el script SQL que se encuentra en `sql/init.sql`
   - Este script creará las tablas necesarias y configurará las políticas de seguridad

### 5. Configurar la autenticación en Supabase

1. Ve a la sección Authentication > Settings en el panel de control de Supabase
2. Asegúrate de tener habilitado el proveedor de Email
3. Configura la URL de redirección para deep linking: `notasapp://`
4. Opcional: Desactiva temporalmente la confirmación de email para pruebas (no recomendado para entornos de producción)

## Ejecutar la aplicación

### En Windows:
```bash
npm run start:win
```

### En macOS/Linux:
```bash
npm start
```

Sigue las instrucciones en la terminal para abrir la aplicación en:
- Simulador iOS (pulsa i)
- Simulador Android (pulsa a)
- Navegador web (pulsa w)
- Tu dispositivo físico escaneando el código QR con la aplicación Expo Go

## Estructura del proyecto

- `app/` - Rutas de la aplicación usando Expo Router
- `components/` - Componentes reutilizables
  - `auth/` - Componentes relacionados con autenticación
  - `ui/` - Componentes de interfaz de usuario
- `constants/` - Constantes como colores y temas
- `lib/` - Utilidades y configuración
  - `supabase.ts` - Cliente de Supabase
- `sql/` - Scripts SQL para configurar la base de datos

## Soporte y contacto

Si tienes problemas o sugerencias para mejorar NotasApp, puedes:
- Abrir un issue en el repositorio de GitHub
- Contactar con el equipo de desarrollo en soporte@notasapp.com

## Licencia

MIT
