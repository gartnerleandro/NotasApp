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
    
    // Método diferente según la plataforma
    if (Platform.OS === 'web') {
      // Manejo para web
      const response = await fetch(uri);
      const fileToUpload = await response.blob();
      
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
    } else {
      // Para dispositivos móviles, usar FileSystem.uploadAsync
      // que funciona directamente con URIs de archivo local
      console.log(`Subiendo archivo desde: ${uri}`);
      
      // Verificar que el archivo existe
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('El archivo de audio no existe');
      }
      
      // Crear una URL firmada para subir
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .createSignedUploadUrl(filePath);
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Subir el archivo usando Expo FileSystem
      const uploadResult = await FileSystem.uploadAsync(
        uploadData.signedUrl,
        uri,
        {
          httpMethod: 'PUT',
          headers: {
            'Content-Type': 'audio/mp4',
          },
        }
      );
      
      if (uploadResult.status !== 200) {
        throw new Error(`Error al subir archivo: ${uploadResult.status}`);
      }
      
      console.log('Archivo subido correctamente');
    }
    
    // Obtener la URL pública del archivo
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    console.log('URL del audio:', publicUrlData.publicUrl);
    
    // Asegurarse de que la URL sea válida
    if (!publicUrlData || !publicUrlData.publicUrl) {
      throw new Error('No se pudo obtener la URL pública del archivo de audio');
    }
    
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