import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import * as auth from '../lib/auth';
import { saveSecurely, getSecurely, removeSecurely, STORAGE_KEYS } from '../lib/secure-storage';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Inicializa y verifica la sesión del usuario cuando el componente se monta
    async function loadUserSession() {
      try {
        setIsLoading(true);
        const currentSession = await auth.getCurrentSession();
        const currentUser = await auth.getCurrentUser();
        
        setSession(currentSession);
        setUser(currentUser);
        
        if (currentUser) {
          // Guardar información del usuario en el almacenamiento seguro
          await saveSecurely(STORAGE_KEYS.USER_ID, currentUser.id);
          await saveSecurely(STORAGE_KEYS.USER_EMAIL, currentUser.email || '');
          if (currentSession?.access_token) {
            await saveSecurely(STORAGE_KEYS.AUTH_TOKEN, currentSession.access_token);
          }
        }
      } catch (error) {
        console.error('Error al cargar la sesión del usuario:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadUserSession();
  }, []);

  // Función para iniciar sesión
  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { user: newUser, session: newSession } = await auth.signInWithEmail(email, password);
      setUser(newUser);
      setSession(newSession);
      
      if (newUser) {
        await saveSecurely(STORAGE_KEYS.USER_ID, newUser.id);
        await saveSecurely(STORAGE_KEYS.USER_EMAIL, newUser.email || '');
        if (newSession?.access_token) {
          await saveSecurely(STORAGE_KEYS.AUTH_TOKEN, newSession.access_token);
        }
      }
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Función para registrarse
  const signUp = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { user: newUser, session: newSession } = await auth.signUpWithEmail(email, password);
      setUser(newUser);
      setSession(newSession);
      
      if (newUser) {
        await saveSecurely(STORAGE_KEYS.USER_ID, newUser.id);
        await saveSecurely(STORAGE_KEYS.USER_EMAIL, newUser.email || '');
        if (newSession?.access_token) {
          await saveSecurely(STORAGE_KEYS.AUTH_TOKEN, newSession.access_token);
        }
      }
    } catch (error) {
      console.error('Error al registrarse:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Función para cerrar sesión
  const signOut = async () => {
    try {
      setIsLoading(true);
      await auth.signOut();
      setUser(null);
      setSession(null);
      
      // Limpiar datos de usuario del almacenamiento seguro
      await removeSecurely(STORAGE_KEYS.USER_ID);
      await removeSecurely(STORAGE_KEYS.USER_EMAIL);
      await removeSecurely(STORAGE_KEYS.AUTH_TOKEN);
      await removeSecurely(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Función para restablecer contraseña
  const resetPassword = async (email: string) => {
    try {
      setIsLoading(true);
      await auth.resetPassword(email);
    } catch (error) {
      console.error('Error al restablecer contraseña:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Función para actualizar contraseña
  const updatePassword = async (password: string) => {
    try {
      setIsLoading(true);
      await auth.updatePassword(password);
      // Recuperamos la sesión actualizada
      const currentSession = await auth.getCurrentSession();
      setSession(currentSession);
    } catch (error) {
      console.error('Error al actualizar contraseña:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}

export default AuthContext; 