-- Migración: 05_policies
-- Descripción: Crear políticas de seguridad para RLS

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

CREATE POLICY "Los usuarios pueden ver notas compartidas con ellos" 
  ON public.notes 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.note_shares
      WHERE note_shares.note_id = notes.id
      AND note_shares.shared_with_id = auth.uid()
    )
  );

CREATE POLICY "Los usuarios pueden crear sus propias notas" 
  ON public.notes 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus propias notas" 
  ON public.notes 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar notas compartidas con ellos con permisos de escritura" 
  ON public.notes 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.note_shares
      WHERE note_shares.note_id = notes.id
      AND note_shares.shared_with_id = auth.uid()
      AND note_shares.permission = 'write'
    )
  );

CREATE POLICY "Los usuarios pueden eliminar sus propias notas" 
  ON public.notes 
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas para note_shares
CREATE POLICY "Los usuarios pueden ver comparticiones de sus propias notas" 
  ON public.note_shares 
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Los usuarios pueden ver notas compartidas con ellos" 
  ON public.note_shares 
  FOR SELECT USING (auth.uid() = shared_with_id);

CREATE POLICY "Los usuarios pueden compartir sus propias notas" 
  ON public.note_shares 
  FOR INSERT WITH CHECK (
    auth.uid() = owner_id AND
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = note_shares.note_id
      AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Los usuarios pueden eliminar comparticiones de sus propias notas" 
  ON public.note_shares 
  FOR DELETE USING (auth.uid() = owner_id); 