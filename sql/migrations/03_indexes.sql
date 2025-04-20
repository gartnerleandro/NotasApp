-- Migración: 03_indexes
-- Descripción: Crear índices para optimizar consultas

-- Crear índice para búsquedas eficientes por ID de usuario en perfiles
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles(id);

-- Crear índice para búsquedas eficientes por ID de usuario en notas
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON public.notes(user_id);

-- Crear índice para búsquedas eficientes de notas compartidas
CREATE INDEX IF NOT EXISTS note_shares_shared_with_idx ON public.note_shares(shared_with_id);
CREATE INDEX IF NOT EXISTS note_shares_note_id_idx ON public.note_shares(note_id); 