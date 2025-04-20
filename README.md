# NotasApp

Aplicación de notas con autenticación y almacenamiento en la nube usando Supabase.

## Características

- Autenticación de usuarios con email y contraseña
- Gestión de perfil de usuario
- Creación, edición y eliminación de notas
- Búsqueda de notas
- Modo claro/oscuro
- Almacenamiento en la nube

## Compartir Notas

NotasApp permite a los usuarios compartir sus notas con otros usuarios registrados en la aplicación. Esta funcionalidad facilita la colaboración y el intercambio de información.

### Características principales

- **Permisos de acceso**: Puedes compartir notas con permisos de solo lectura o lectura/escritura
- **Gestión de permisos**: Añadir o eliminar usuarios con acceso a tus notas
- **Interfaz intuitiva**: Buscar usuarios y gestionar permisos desde una interfaz sencilla
- **Sección dedicada**: Ver las notas que otros han compartido contigo en una sección separada

### Cómo compartir una nota

1. Abre una nota que hayas creado
2. Toca el icono de compartir en la esquina superior derecha
3. Busca usuarios por nombre de usuario
4. Selecciona el permiso que deseas otorgar (lectura o escritura)
5. Toca "Compartir" para confirmar

### Gestión de permisos

Para gestionar quién tiene acceso a tus notas:
- Abre una nota y toca el icono de compartir
- Verás la lista de usuarios con acceso a la nota
- Puedes eliminar usuarios tocando el icono X junto a su nombre

### Notas compartidas contigo

Las notas que otros usuarios han compartido contigo aparecen en una sección separada en la pantalla principal. Estas notas están marcadas con un borde de color y un icono para distinguirlas.

- Si tienes permisos de solo lectura, podrás ver pero no editar la nota
- Si tienes permisos de lectura/escritura, podrás editar la nota

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

La funcionalidad utiliza Row Level Security (RLS) para garantizar que los usuarios solo puedan:
- Ver notas que les pertenecen o que han sido compartidas con ellos
- Editar notas propias o compartidas con permisos de escritura
- Compartir solo notas de su propiedad

## Tecnologías

- React Native con Expo
- TypeScript/JavaScript
- Supabase para autenticación y base de datos
- Expo Router para navegación
- React Native Paper para componentes de UI

## Requisitos previos

- Node.js (v14 o superior)
- npm o yarn
- Cuenta en Supabase (gratuita)
- Expo CLI (`npm install -g expo-cli`)

## Configuración

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

1. Crear una cuenta en [Supabase](https://supabase.com/) si aún no tienes una
2. Crear un nuevo proyecto
3. Obtener la URL del proyecto y la clave anónima (Anon Key) desde la sección de configuración de API
4. Reemplazar las credenciales en `lib/supabase.ts`:

```typescript
const supabaseUrl = 'TU_URL_DE_SUPABASE';
const supabaseAnonKey = 'TU_CLAVE_ANON_DE_SUPABASE';
```

### 4. Configurar la base de datos

1. Ve a la sección SQL Editor en el dashboard de Supabase
2. Ejecuta el script SQL que se encuentra en `sql/init.sql`
   - Este script creará las tablas necesarias y configurará las políticas de seguridad

### 5. Configurar la autenticación en Supabase

1. Ve a la sección Authentication > Settings en el dashboard de Supabase
2. Asegúrate de tener habilitado el proveedor de Email
3. Configura la URL de redirección para deep linking: `notasapp://`
4. Opcional: Deshabilitar temporalmente la confirmación de email para pruebas (no recomendado para producción)

## Ejecutar la aplicación

```bash
npm start
```

Sigue las instrucciones en la terminal para abrir la aplicación en:
- Simulador iOS (presiona i)
- Simulador Android (presiona a)
- Web (presiona w)
- Tu dispositivo físico escaneando el código QR con la app Expo Go

## Estructura del proyecto

- `app/` - Rutas de la aplicación usando Expo Router
- `components/` - Componentes reutilizables
  - `auth/` - Componentes relacionados con autenticación
  - `ui/` - Componentes de interfaz de usuario
- `constants/` - Constantes como colores y temas
- `lib/` - Utilidades y configuración
  - `supabase.ts` - Cliente de Supabase
- `sql/` - Scripts SQL para configurar la base de datos

## Licencia

MIT
