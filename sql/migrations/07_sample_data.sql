-- Migración: 07_sample_data
-- Descripción: Insertar datos de ejemplo (opcional para desarrollo)

/*
NOTA: Este script es opcional y solo se recomienda para entornos de desarrollo.
Las inserciones directas en la tabla auth.users son para fines de demostración.
En un entorno real, se deben usar los endpoints de autenticación de Supabase.
*/

-- Función para insertar usuarios de prueba de forma segura
CREATE OR REPLACE FUNCTION insert_demo_data()
RETURNS void AS $$
DECLARE
  user1_id UUID;
  user2_id UUID;
  note1_id UUID;
  note2_id UUID;
  note3_id UUID;
BEGIN
  -- Solo ejecutar en desarrollo
  IF current_setting('app.environment', true) = 'production' THEN
    RAISE NOTICE 'No se insertarán datos de muestra en producción';
    RETURN;
  END IF;

  -- Insertar usuarios de prueba (esto normalmente se haría a través de la API de autenticación)
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), 'usuario1@ejemplo.com', crypt('contraseña123', gen_salt('bf')), NOW(), NOW(), NOW()),
    (gen_random_uuid(), 'usuario2@ejemplo.com', crypt('contraseña123', gen_salt('bf')), NOW(), NOW(), NOW())
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO user1_id;
  
  -- Obtener IDs
  SELECT id INTO user1_id FROM auth.users WHERE email = 'usuario1@ejemplo.com' LIMIT 1;
  SELECT id INTO user2_id FROM auth.users WHERE email = 'usuario2@ejemplo.com' LIMIT 1;
  
  -- Insertar notas de ejemplo
  INSERT INTO public.notes (id, user_id, title, content, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), user1_id, 'Mi primera nota', 'Contenido de ejemplo para la primera nota', NOW(), NOW()),
    (gen_random_uuid(), user1_id, 'Recordatorios', 'Lista de tareas pendientes', NOW(), NOW()),
    (gen_random_uuid(), user2_id, 'Ideas de proyecto', 'Brainstorming para nuevo proyecto', NOW(), NOW())
  RETURNING id INTO note1_id;
  
  -- Obtener IDs de las notas
  SELECT id INTO note1_id FROM public.notes WHERE user_id = user1_id AND title = 'Mi primera nota' LIMIT 1;
  SELECT id INTO note2_id FROM public.notes WHERE user_id = user1_id AND title = 'Recordatorios' LIMIT 1;
  SELECT id INTO note3_id FROM public.notes WHERE user_id = user2_id LIMIT 1;
  
  -- Compartir una nota
  INSERT INTO public.note_shares (note_id, owner_id, shared_with_id, permission, created_at)
  VALUES 
    (note1_id, user1_id, user2_id, 'read', NOW());

  RAISE NOTICE 'Datos de demostración insertados correctamente';
END;
$$ LANGUAGE plpgsql;

-- Comentar/descomentar la siguiente línea para ejecutar la inserción de datos de ejemplo
-- SELECT insert_demo_data(); 