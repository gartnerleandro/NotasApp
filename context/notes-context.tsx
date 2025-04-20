import { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './auth-context';
import { Json, TablesInsert, TablesUpdate } from '../lib/database.types';

interface ChecklistItem {
  text: string;
  checked: boolean;
}

interface NoteMetadata {
  type: 'text' | 'checklist' | 'voice';
  checklistItems?: ChecklistItem[];
  recordingUri?: string;
}

interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  shared?: boolean; // Indica si la nota es compartida
  type?: 'text' | 'checklist' | 'voice'; // Tipo de nota
  checklistItems?: ChecklistItem[]; // Para notas tipo checklist
  recordingUri?: string; // Para notas de voz
  metadata?: NoteMetadata; // Para almacenar datos adicionales
}

interface NoteShare {
  id: string;
  note_id: string;
  owner_id: string;
  shared_with_id: string;
  permission: 'read' | 'write';
  created_at: string;
}

interface User {
  id: string;
  email?: string;
  username?: string;
}

interface NotesContextType {
  notes: Note[];
  sharedNotes: Note[];
  isLoading: boolean;
  isLoadingShared: boolean;
  addNote: (note: Partial<Note>) => Promise<Note | null>;
  updateNote: (id: string, updatedNote: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  refreshNotes: () => Promise<void>;
  shareNote: (noteId: string, userId: string, permission: 'read' | 'write') => Promise<boolean>;
  removeNoteShare: (noteId: string, userId: string) => Promise<boolean>;
  getNoteShares: (noteId: string) => Promise<NoteShare[]>;
  searchUsers: (query: string) => Promise<User[]>;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export const useNotes = () => {
  const context = useContext(NotesContext);
  if (context === undefined) {
    throw new Error('useNotes debe ser usado dentro de un NotesProvider');
  }
  return context;
};

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [sharedNotes, setSharedNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingShared, setIsLoadingShared] = useState(true);
  const { session } = useAuth();

  useEffect(() => {
    if (session?.user) {
      loadNotes();
      loadSharedNotes();
    } else {
      setNotes([]);
      setSharedNotes([]);
      setIsLoading(false);
      setIsLoadingShared(false);
    }
  }, [session]);

  const processNotesWithMetadata = (notesData: any[]): Note[] => {
    return notesData.map((note: any) => ({
      ...note,
      type: note.metadata?.type || 'text',
      checklistItems: note.metadata?.checklistItems || [],
      recordingUri: note.metadata?.recordingUri || '',
    }));
  };

  const loadNotes = async () => {
    if (!session?.user) return;
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      if (data) {
        const processedNotes = processNotesWithMetadata(data);
        setNotes(processedNotes as Note[]);
      }
    } catch (error) {
      console.error('Error al cargar notas:', error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

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
          // Procesar metadata y marcar como compartidas
          const processedNotes = processNotesWithMetadata(notesData);
          const markedNotes = processedNotes.map(note => ({
            ...note,
            shared: true
          }));
          setSharedNotes(markedNotes as Note[]);
        }
      } else {
        setSharedNotes([]);
      }
    } catch (error) {
      console.error('Error al cargar notas compartidas:', error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoadingShared(false);
    }
  };

  const addNote = async (note: Partial<Note>) => {
    if (!session?.user) return null;
    
    try {
      // Crear objeto de metadata en el formato correcto
      const noteMetadata = { 
        type: note.type || 'text',
        checklistItems: note.type === 'checklist' ? note.checklistItems || [] : [],
        recordingUri: note.type === 'voice' ? note.recordingUri || '' : '',
      };
      
      // Definir una nota nueva con el formato esperado por Supabase
      const newNote: TablesInsert<'notes'> = {
        user_id: session.user.id,
        title: note.title || 'Sin título',
        content: note.content || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Convertir explícitamente a Json para satisfacer el tipado
        metadata: noteMetadata as unknown as Json
      };
      
      const { data, error } = await supabase
        .from('notes')
        .insert(newNote)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // Procesar los datos para incluir la metadata en el objeto principal
      const processedData = {
        ...data,
        type: (data.metadata as any)?.type || 'text',
        checklistItems: (data.metadata as any)?.checklistItems || [],
        recordingUri: (data.metadata as any)?.recordingUri || '',
      } as unknown as Note;
      
      setNotes(prevNotes => [processedData, ...prevNotes]);
      return processedData;
    } catch (error) {
      console.error('Error al agregar nota:', error instanceof Error ? error.message : 'Error desconocido');
      return null;
    }
  };

  const updateNote = async (id: string, updatedNote: Partial<Note>) => {
    if (!session?.user) return;
    
    try {
      // Para updates necesitamos construir un objeto con formato compatible con la BD
      const updates: TablesUpdate<'notes'> = {
        title: updatedNote.title,
        content: updatedNote.content,
        updated_at: new Date().toISOString()
      };
      
      // Si incluye campos de tipo metadata, hay que actualizarlos en el campo JSON
      if (updatedNote.type || updatedNote.checklistItems || updatedNote.recordingUri) {
        // Primero obtenemos la nota actual para preservar campos de metadata
        const { data: currentNote } = await supabase
          .from('notes')
          .select('metadata')
          .eq('id', id)
          .single();
          
        const currentMetadata = (currentNote?.metadata as any) || {};
        
        const updatedMetadata = {
          ...currentMetadata,
          type: updatedNote.type || currentMetadata.type || 'text',
          checklistItems: updatedNote.checklistItems || currentMetadata.checklistItems || [],
          recordingUri: updatedNote.recordingUri || currentMetadata.recordingUri || ''
        };
        
        updates.metadata = updatedMetadata as unknown as Json;
      }
      
      const { error } = await supabase
        .from('notes')
        .update(updates)
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      // Actualizar tanto en notas propias como compartidas
      setNotes(prevNotes =>
        prevNotes.map(note =>
          note.id === id ? { ...note, ...updatedNote } : note
        )
      );
      
      setSharedNotes(prevNotes =>
        prevNotes.map(note =>
          note.id === id ? { ...note, ...updatedNote, shared: true } : note
        )
      );
    } catch (error) {
      console.error('Error al actualizar nota:', error instanceof Error ? error.message : 'Error desconocido');
    }
  };

  const deleteNote = async (id: string) => {
    if (!session?.user) return;
    
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id);
      
      if (error) {
        throw error;
      }
      
      setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
      // También eliminar de notas compartidas si existe
      setSharedNotes(prevNotes => prevNotes.filter(note => note.id !== id));
    } catch (error) {
      console.error('Error al eliminar nota:', error instanceof Error ? error.message : 'Error desconocido');
    }
  };

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
      console.error('Error al compartir nota:', error instanceof Error ? error.message : 'Error desconocido');
      return false;
    }
  };

  const removeNoteShare = async (noteId: string, userId: string) => {
    if (!session?.user) return false;
    
    try {
      const { error } = await supabase
        .from('note_shares')
        .delete()
        .eq('note_id', noteId)
        .eq('owner_id', session.user.id)
        .eq('shared_with_id', userId);
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error al eliminar compartición:', error instanceof Error ? error.message : 'Error desconocido');
      return false;
    }
  };

  const getNoteShares = async (noteId: string): Promise<NoteShare[]> => {
    if (!session?.user) return [];
    
    try {
      const { data, error } = await supabase
        .from('note_shares')
        .select('*')
        .eq('note_id', noteId)
        .eq('owner_id', session.user.id);
      
      if (error) {
        throw error;
      }
      
      return data as NoteShare[];
    } catch (error) {
      console.error('Error al obtener comparticiones:', error instanceof Error ? error.message : 'Error desconocido');
      return [];
    }
  };

  const searchUsers = async (query: string): Promise<User[]> => {
    if (!session?.user || query.length < 3) return [];
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, email:username')
        .ilike('username', `%${query}%`)
        .neq('id', session.user.id)
        .limit(5);
      
      if (error) {
        throw error;
      }
      
      return data as User[];
    } catch (error) {
      console.error('Error al buscar usuarios:', error instanceof Error ? error.message : 'Error desconocido');
      return [];
    }
  };

  const value = {
    notes,
    sharedNotes,
    isLoading,
    isLoadingShared,
    addNote,
    updateNote,
    deleteNote,
    refreshNotes: async () => {
      await loadNotes();
      await loadSharedNotes();
    },
    shareNote,
    removeNoteShare,
    getNoteShares,
    searchUsers
  };

  return (
    <NotesContext.Provider value={value}>
      {children}
    </NotesContext.Provider>
  );
}

export default NotesContext; 