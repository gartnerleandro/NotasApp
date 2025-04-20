import { supabase } from './supabase';
import { User, Session } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Obtiene el usuario actual
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('Error al obtener el usuario actual:', error);
    return null;
  }
}

/**
 * Obtiene la sesión actual
 */
export async function getCurrentSession(): Promise<Session | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch (error) {
    console.error('Error al obtener la sesión actual:', error);
    return null;
  }
}

/**
 * Inicia sesión con email y contraseña
 */
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return { user: data.user, session: data.session };
}

/**
 * Registra un nuevo usuario con email y contraseña
 */
export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return { user: data.user, session: data.session };
}

/**
 * Cierra la sesión del usuario actual
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

/**
 * Envía un enlace para restablecer la contraseña
 */
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'notasapp://reset-password',
  });

  if (error) {
    throw error;
  }
}

/**
 * Actualiza la contraseña del usuario actual
 */
export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    throw error;
  }
}

/**
 * Actualiza los datos del usuario
 */
export async function updateUserData(userData: { 
  email?: string;
  data?: { [key: string]: any };
}) {
  const { data, error } = await supabase.auth.updateUser(userData);

  if (error) {
    throw error;
  }

  return { user: data.user };
}

/**
 * Refresca el token de autenticación
 */
export async function refreshSession() {
  const { data, error } = await supabase.auth.refreshSession();
  
  if (error) {
    throw error;
  }
  
  return { user: data.user, session: data.session };
}

/**
 * Escucha los cambios en la autenticación
 */
export function onAuthStateChange(callback: (event: any, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(callback);
} 