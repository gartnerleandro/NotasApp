import { supabase } from './supabase';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

/**
 * Sube un archivo de audio a Supabase Storage
 * @param uri URI local del archivo de audio
 * @param userId ID del usuario actual para organizar los archivos
 * @returns URL pública del archivo subido
 */
export async function uploadAudioFile(uri: string, userId: string): Promise<string> {
  try {
    // Nombre del archivo: userId_timestamp.m4a
    const fileName = `${userId}_${Date.now()}.m4a`;
    const bucketName = 'audio-notes';
    const filePath = `${userId}/${fileName}`;
    
    // Preparar el archivo para subir
    let fileToUpload;
    if (Platform.OS === 'web') {
      // Manejo para web (si es necesario)
      const response = await fetch(uri);
      fileToUpload = await response.blob();
    } else {
      // Convertir el archivo a base64 para dispositivos móviles
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('El archivo de audio no existe');
      }
      
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Convertir base64 a Blob
      const byteCharacters = atob(base64);
      const byteArrays = [];
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      fileToUpload = new Blob(byteArrays, { type: 'audio/mp4' });
    }
    
    // Subir el archivo a Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileToUpload, {
        contentType: 'audio/mp4',
        upsert: true,
      });
    
    if (error) {
      throw error;
    }
    
    // Obtener la URL pública del archivo
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error al subir archivo de audio:', error);
    throw error;
  }
}

/**
 * Elimina un archivo de audio de Supabase Storage
 * @param url URL del archivo a eliminar
 */
export async function deleteAudioFile(url: string): Promise<void> {
  try {
    // Extraer la ruta del archivo de la URL
    const urlParts = url.split('/');
    const bucketName = 'audio-notes';
    const filePath = `${urlParts[urlParts.length - 2]}/${urlParts[urlParts.length - 1]}`;
    
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error al eliminar archivo de audio:', error);
    throw error;
  }
} 