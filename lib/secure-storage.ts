import * as SecureStore from 'expo-secure-store';

// Claves para almacenamiento seguro
export const STORAGE_KEYS = {
  USER_ID: 'user_id',
  USER_EMAIL: 'user_email',
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
};

/**
 * Guarda un valor de forma segura
 * @param key Clave para almacenar el valor
 * @param value Valor a almacenar
 */
export async function saveSecurely(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error(`Error al guardar ${key} en almacenamiento seguro:`, error);
    throw error;
  }
}

/**
 * Obtiene un valor almacenado de forma segura
 * @param key Clave del valor a obtener
 * @returns Valor almacenado o null si no existe
 */
export async function getSecurely(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`Error al obtener ${key} del almacenamiento seguro:`, error);
    return null;
  }
}

/**
 * Elimina un valor almacenado de forma segura
 * @param key Clave del valor a eliminar
 */
export async function removeSecurely(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error(`Error al eliminar ${key} del almacenamiento seguro:`, error);
    throw error;
  }
}

/**
 * Comprueba si existe un valor almacenado para una clave específica
 * @param key Clave a comprobar
 * @returns true si existe el valor, false en caso contrario
 */
export async function hasStoredValue(key: string): Promise<boolean> {
  const value = await getSecurely(key);
  return value !== null;
}

/**
 * Limpia todos los valores almacenados relacionados con la autenticación
 */
export async function clearAuthStorage(): Promise<void> {
  try {
    const keys = Object.values(STORAGE_KEYS);
    for (const key of keys) {
      await SecureStore.deleteItemAsync(key);
    }
  } catch (error) {
    console.error('Error al limpiar el almacenamiento de autenticación:', error);
    throw error;
  }
} 