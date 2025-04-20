-- Migración: 04_row_level_security
-- Descripción: Habilitar Row Level Security (RLS) para las tablas

-- Habilitar Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_shares ENABLE ROW LEVEL SECURITY; 