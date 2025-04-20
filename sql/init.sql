-- Configurar extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Configurar tabla de perfiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  username TEXT,
  website TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para búsquedas eficientes por ID de usuario
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles(id);

-- Configurar tabla de notas
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  metadata JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para búsquedas eficientes por ID de usuario
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON public.notes(user_id);

-- Habilitar Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Políticas para perfiles de usuario
CREATE POLICY "Los usuarios pueden ver su propio perfil" 
  ON public.profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil" 
  ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Los perfiles se crean automáticamente" 
  ON public.profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas para notas
CREATE POLICY "Los usuarios pueden ver sus propias notas" 
  ON public.notes 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden crear sus propias notas" 
  ON public.notes 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus propias notas" 
  ON public.notes 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar sus propias notas" 
  ON public.notes 
  FOR DELETE USING (auth.uid() = user_id);

-- Función para manejar usuarios nuevos
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url, created_at, updated_at)
  VALUES (NEW.id, NEW.email, null, NOW(), NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear automáticamente un perfil cuando se registra un usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user(); 