# Documentación Técnica: Sistema de Notas Compartidas

Esta documentación detalla la implementación del sistema de notas compartidas en NotasApp, una característica que permite a los usuarios compartir notas entre sí con diferentes niveles de permisos.

## Estructura de Base de Datos

### Tabla `note_shares`

La tabla `note_shares` es el componente central para gestionar los permisos de compartición:

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

#### Índices para optimización

```sql
CREATE INDEX note_shares_note_id_idx ON note_shares(note_id);
CREATE INDEX note_shares_shared_with_id_idx ON note_shares(shared_with_id);
```

## Políticas de Row Level Security (RLS)

Las siguientes políticas RLS se han implementado para garantizar la seguridad:

### En la tabla `note_shares`

```sql
-- Propietarios pueden gestionar sus propios permisos
CREATE POLICY "Los propietarios pueden gestionar los permisos de sus notas"
  ON note_shares
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id);

-- Usuarios pueden ver los permisos de notas compartidas con ellos
CREATE POLICY "Los usuarios pueden ver los permisos de notas compartidas con ellos"
  ON note_shares
  FOR SELECT
  TO authenticated
  USING (auth.uid() = shared_with_id);
```

### En la tabla `notes`

```sql
-- Permitir que los usuarios vean notas compartidas con ellos
CREATE POLICY "Los usuarios pueden ver notas compartidas con ellos"
  ON notes
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM note_shares
      WHERE note_shares.note_id = notes.id
      AND note_shares.shared_with_id = auth.uid()
    )
  );

-- Permitir actualización solo con permiso de escritura
CREATE POLICY "Los usuarios pueden actualizar notas compartidas con permiso de escritura"
  ON notes
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM note_shares
      WHERE note_shares.note_id = notes.id
      AND note_shares.shared_with_id = auth.uid()
      AND note_shares.permission = 'write'
    )
  );
```

## Interfaces y Tipos de Datos

### Modelos principales

```typescript
// Modelo de Nota
interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  shared?: boolean; // Indica si la nota es compartida
}

// Modelo de Compartición de Nota
interface NoteShare {
  id: string;
  note_id: string;
  owner_id: string;
  shared_with_id: string;
  permission: 'read' | 'write';
  created_at: string;
}

// Modelo de Usuario para búsqueda
interface User {
  id: string;
  email?: string;
  username?: string;
}
```

## Contexto de Notas (NotesContext)

El contexto de notas se ha ampliado para soportar la funcionalidad de compartición:

```typescript
// Nuevas propiedades y métodos
interface NotesContextType {
  // Propiedades existentes
  notes: Note[];
  // Nuevas propiedades
  sharedNotes: Note[];
  isLoadingShared: boolean;
  // Nuevos métodos
  shareNote: (noteId: string, userId: string, permission: 'read' | 'write') => Promise<boolean>;
  removeNoteShare: (noteId: string, userId: string) => Promise<boolean>;
  getNoteShares: (noteId: string) => Promise<NoteShare[]>;
  searchUsers: (query: string) => Promise<User[]>;
}
```

### Funciones Clave

#### Cargar Notas Compartidas

```typescript
const loadSharedNotes = async () => {
  if (!session?.user) return;
  
  try {
    setIsLoadingShared(true);
    
    // Primero obtenemos los IDs de las notas compartidas con el usuario
    const { data: shareData, error: shareError } = await supabase
      .from('note_shares')
      .select('note_id')
      .eq('shared_with_id', session.user.id);
    
    if (shareError) {
      throw shareError;
    }
    
    if (shareData && shareData.length > 0) {
      const noteIds = shareData.map(share => share.note_id);
      
      // Luego obtenemos las notas correspondientes
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .in('id', noteIds)
        .order('created_at', { ascending: false });
      
      if (notesError) {
        throw notesError;
      }
      
      if (notesData) {
        // Marcar estas notas como compartidas
        const markedNotes = notesData.map(note => ({
          ...note,
          shared: true
        }));
        setSharedNotes(markedNotes as Note[]);
      }
    } else {
      setSharedNotes([]);
    }
  } catch (error) {
    console.error('Error al cargar notas compartidas:', error);
  } finally {
    setIsLoadingShared(false);
  }
};
```

#### Compartir Nota

```typescript
const shareNote = async (noteId: string, userId: string, permission: 'read' | 'write') => {
  if (!session?.user) return false;
  
  try {
    // Verificar que la nota pertenece al usuario
    const { data: noteData, error: noteError } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .eq('user_id', session.user.id)
      .single();
    
    if (noteError || !noteData) {
      throw new Error('No tienes permiso para compartir esta nota');
    }
    
    const newShare = {
      note_id: noteId,
      owner_id: session.user.id,
      shared_with_id: userId,
      permission: permission
    };
    
    const { error } = await supabase
      .from('note_shares')
      .insert(newShare);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error al compartir nota:', error);
    return false;
  }
};
```

## Componentes de UI

### Modal de Compartir

El componente `ShareModal` permite a los usuarios:
- Buscar otros usuarios
- Seleccionar niveles de permiso
- Ver y gestionar los permisos actuales

```jsx
<ShareModal 
  visible={shareModalVisible} 
  onDismiss={() => setShareModalVisible(false)} 
  noteId={id}
  noteName={title} 
/>
```

### Pantalla Principal

La pantalla principal muestra las notas propias y compartidas en secciones separadas:

```jsx
<View style={styles.notesContainer}>
  <Text style={[styles.sectionTitle, { color: colors.text }]}>Mis Notas</Text>
  {/* Notas propias */}
  
  {/* Sección para notas compartidas */}
  {isLoadingShared ? (
    <ActivityIndicator />
  ) : sharedNotes && sharedNotes.length > 0 ? (
    <>
      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>
        Notas Compartidas Conmigo
      </Text>
      {/* Lista de notas compartidas */}
    </>
  ) : null}
</View>
```

## Consideraciones de Seguridad

1. **Verificación de propiedad**: Antes de compartir una nota, verificamos que el usuario sea el propietario.
2. **Políticas RLS**: Garantizan que los usuarios solo puedan acceder a las notas permitidas.
3. **Validación de permisos**: El sistema verifica los permisos antes de permitir operaciones de lectura/escritura.

## Posibles Mejoras Futuras

1. **Notificaciones**: Alertar a los usuarios cuando se comparte una nota con ellos.
2. **Historial de cambios**: Seguimiento de quién hizo qué cambios en notas compartidas.
3. **Compartir con grupos**: Permitir compartir con grupos de usuarios en lugar de individualmente.
4. **Niveles de permiso adicionales**: Implementar permisos más granulares (comentar, sugerir cambios, etc.). 