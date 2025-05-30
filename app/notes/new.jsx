import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity, useColorScheme, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useNotes } from '../../context/notes-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Checkbox, Text, List, IconButton, useTheme, ActivityIndicator } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { useAuth } from '../../context/auth-context';
import { uploadAudioFile } from '../../lib/storage-service';

export default function NewNoteScreen() {
  const { addNote } = useNotes();
  const { session } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme() || 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState('text');
  const [checklistItems, setChecklistItems] = useState([{ text: '', checked: false }]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  
  // Estado para grabación de audio
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState(null);
  
  // Usar un ref para evitar limpiezas no deseadas durante la grabación
  const isCleaningUpRef = useRef(false);
  
  useEffect(() => {
    // Determinar el tipo de nota basado en los parámetros
    if (params.type) {
      setNoteType(params.type);
      
      // Establecer un título predeterminado según el tipo
      switch (params.type) {
        case 'checklist':
          setTitle('Nueva lista');
          break;
        case 'voice':
          setTitle('Nota de voz');
          break;
        default:
          setTitle('');
      }
    }
    
    // Solicitar permisos para grabar audio si es tipo nota de voz
    if (params.type === 'voice') {
      requestAudioPermissions();
    }
    
    // Limpiar al desmontar el componente
    return () => {
      if (!isRecording) {
        cleanupRecording();
      }
    };
  }, [params]);
  
  // Configurar el modo de audio cuando se monta el componente
  useEffect(() => {
    if (params.type === 'voice') {
      setupAudioMode();
    }
    
    // Limpiar al desmontar
    return () => {
      resetAudioMode();
    };
  }, []);
  
  // Establecer el modo de audio para grabación
  const setupAudioMode = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
      });
      console.log('Modo de audio configurado correctamente');
    } catch (error) {
      console.error('Error al configurar modo de audio:', error);
      setError('Error al configurar modo de audio: ' + error.message);
    }
  };
  
  // Restablecer el modo de audio
  const resetAudioMode = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
    } catch (error) {
      console.error('Error al restablecer modo de audio:', error);
    }
  };
  
  // Contador para el tiempo de grabación
  useEffect(() => {
    let intervalId = null;
    
    if (isRecording) {
      intervalId = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRecording]);
  
  const cleanupRecording = async () => {
    // Evitar limpiezas repetidas
    if (isCleaningUpRef.current || !recording) {
      return;
    }
    
    try {
      isCleaningUpRef.current = true;
      
      // Solo descargar si la grabación aún está cargada
      if (recording._cleanupForUnloadedRecorder) {
        await recording.stopAndUnloadAsync();
      }
      
      setRecording(null);
      setIsRecording(false);
      isCleaningUpRef.current = false;
    } catch (error) {
      console.log("Error al limpiar grabación:", error);
      isCleaningUpRef.current = false;
    }
  };
  
  const requestAudioPermissions = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setError('No se concedió permiso para acceder al micrófono');
        Alert.alert(
          "Permisos requeridos",
          "Necesitamos acceso al micrófono para grabar notas de voz.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error('Error al solicitar permisos de audio:', error);
      setError('Error al solicitar permisos: ' + error.message);
    }
  };
  
  const startRecording = async () => {
    try {
      // Limpiar errores anteriores
      setError(null);
      
      // Verificar permisos
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setError('No se concedió permiso para acceder al micrófono');
        Alert.alert('Permiso denegado', 'No se puede grabar sin acceso al micrófono');
        return;
      }
      
      // Reiniciar contador de tiempo
      setRecordingTime(0);
      
      // Asegurarse de que cualquier grabación anterior se ha detenido correctamente
      if (recording !== null) {
        await cleanupRecording();
      }
      
      // Volver a configurar el modo de audio para asegurarnos de que está correcto
      await setupAudioMode();
      
      console.log('Iniciando grabación...');
      
      // Crear una nueva grabación
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      // Establecer el estado después de que la grabación se haya creado correctamente
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingUri(null);
      
      console.log('Grabación iniciada correctamente');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
    } catch (error) {
      console.error('Error al iniciar la grabación:', error);
      setError('Error al iniciar la grabación: ' + error.message);
      Alert.alert('Error', 'No se pudo iniciar la grabación: ' + error.message);
    }
  };
  
  const stopRecording = async () => {
    if (!recording || !isRecording) {
      console.log('No hay grabación activa para detener');
      return;
    }
    
    try {
      console.log('Deteniendo grabación...');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      
      // Indicar que la grabación está detenida antes de la operación
      setIsRecording(false);
      
      // Detener la grabación
      await recording.stopAndUnloadAsync();
      
      // Obtener URI de la grabación
      const uri = recording.getURI();
      if (uri) {
        setRecordingUri(uri);
        console.log('Grabación finalizada. URI:', uri);
      } else {
        throw new Error('No se pudo obtener el URI de la grabación');
      }
      
      // Limpiar el objeto de grabación pero mantener la URI
      setRecording(null);
      
    } catch (error) {
      console.error('Error al detener la grabación:', error);
      setError('Error al detener la grabación: ' + error.message);
      Alert.alert('Error', 'No se pudo completar la grabación: ' + error.message);
      // Asegurarse de limpiar si hay un error
      setRecording(null);
      setIsRecording(false);
    }
  };
  
  const handleSave = async () => {
    if (title.trim() === '' && content.trim() === '' && 
      (noteType !== 'checklist' || !checklistItems.some(item => item.text.trim() !== '')) &&
      (noteType !== 'voice' || !recordingUri)) {
      // No guardar notas vacías
      router.back();
      return;
    }

    const finalTitle = title.trim() === '' ? 'Sin título' : title;
    let noteData = {};
    
    try {
      switch (noteType) {
        case 'checklist':
          // Filtrar ítems vacíos y formatear
          const filteredItems = checklistItems.filter(item => item.text.trim() !== '');
          noteData = { 
            title: finalTitle, 
            content: '', // El contenido real son los ítems
            type: 'checklist',
            checklistItems: filteredItems
          };
          break;
        case 'voice':
          if (!recordingUri) {
            Alert.alert("Error", "Debes grabar un audio antes de guardar");
            return;
          }
          
          setIsUploading(true);
          try {
            // Subir archivo de audio a Supabase Storage
            console.log('Subiendo archivo de audio:', recordingUri);
            const uploadedUrl = await uploadAudioFile(recordingUri, session.user.id);
            console.log('URL de audio subido:', uploadedUrl);
            
            if (!uploadedUrl) {
              throw new Error('No se pudo obtener URL del archivo subido');
            }
            
            noteData = { 
              title: finalTitle, 
              content: 'Nota de voz', 
              type: 'voice',
              recordingUri: uploadedUrl
            };
          } catch (uploadError) {
            console.error('Error al subir audio:', uploadError);
            Alert.alert(
              "Error",
              "No se pudo subir el archivo de audio. Por favor, intenta nuevamente.",
              [{ text: "OK" }]
            );
            setIsUploading(false);
            return;
          }
          setIsUploading(false);
          break;
        default: // Nota de texto normal
          noteData = { 
            title: finalTitle, 
            content,
            type: 'text'
          };
      }
      
      const newNote = await addNote(noteData);
      
      // No es necesario limpiar la grabación aquí ya que ya la limpiamos al detener
      router.replace(`/notes/${newNote.id}`);
      
    } catch (error) {
      setIsUploading(false);
      console.error('Error al guardar la nota:', error);
      Alert.alert(
        "Error",
        "No se pudo guardar la nota. Por favor intenta nuevamente.",
        [{ text: "OK" }]
      );
    }
  };

  const handleCancel = async () => {
    // Limpiar grabación antes de cancelar
    await cleanupRecording();
    router.back();
  };
  
  const addChecklistItem = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChecklistItems([...checklistItems, { text: '', checked: false }]);
  };
  
  const removeChecklistItem = (index) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (checklistItems.length > 1) {
      const newItems = [...checklistItems];
      newItems.splice(index, 1);
      setChecklistItems(newItems);
    }
  };
  
  const updateChecklistItem = (index, text) => {
    const newItems = [...checklistItems];
    newItems[index].text = text;
    setChecklistItems(newItems);
  };
  
  const toggleChecklistItem = (index) => {
    const newItems = [...checklistItems];
    newItems[index].checked = !newItems[index].checked;
    setChecklistItems(newItems);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  const formatRecordingTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes < 10 ? '0' : ''}${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      
      <View style={[styles.header, { 
        backgroundColor: colors.headerBackground,
        borderBottomColor: colorScheme === 'dark' ? '#333' : '#E0E0E0' 
      }]}>
        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={handleCancel}
        >
          <Ionicons name="close" size={24} color={colors.tint} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {noteType === 'text' ? 'Nota de texto' : 
           noteType === 'checklist' ? 'Lista de tareas' : 'Nota de voz'}
        </Text>
        
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSave}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator size={24} color={colors.tint} />
          ) : (
            <Ionicons name="checkmark" size={24} color={colors.tint} />
          )}
        </TouchableOpacity>
      </View>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.scrollView}>
          <TextInput
            style={[styles.titleInput, { color: colors.text }]}
            placeholder="Título"
            placeholderTextColor={colors.icon}
            value={title}
            onChangeText={setTitle}
            selectionColor={colors.tint}
            autoFocus={noteType !== 'voice'}
          />
          
          {noteType === 'text' && (
            <TextInput
              style={[styles.contentInput, { color: colors.text }]}
              placeholder="Escribe aquí tu nota..."
              placeholderTextColor={colors.icon}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
              selectionColor={colors.tint}
            />
          )}
          
          {noteType === 'checklist' && (
            <View style={styles.checklistContainer}>
              {checklistItems.map((item, index) => (
                <View key={index} style={styles.checklistItem}>
                  <Checkbox
                    status={item.checked ? 'checked' : 'unchecked'}
                    onPress={() => toggleChecklistItem(index)}
                    color={colors.tint}
                  />
                  <TextInput
                    style={[styles.checklistInput, { 
                      color: colors.text,
                      textDecorationLine: item.checked ? 'line-through' : 'none',
                      opacity: item.checked ? 0.6 : 1
                    }]}
                    placeholder="Elemento de la lista..."
                    placeholderTextColor={colors.icon}
                    value={item.text}
                    onChangeText={(text) => updateChecklistItem(index, text)}
                    selectionColor={colors.tint}
                  />
                  <IconButton
                    icon="close"
                    size={20}
                    onPress={() => removeChecklistItem(index)}
                    iconColor={colors.icon}
                  />
                </View>
              ))}
              
              <TouchableOpacity 
                style={[styles.addItemButton, { borderColor: colors.tint }]}
                onPress={addChecklistItem}
              >
                <Ionicons name="add" size={20} color={colors.tint} />
                <Text style={{ color: colors.tint, marginLeft: 8 }}>Agregar elemento</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {noteType === 'voice' && (
            <View style={styles.voiceContainer}>
              {error && (
                <View style={[styles.errorContainer, { backgroundColor: colors.errorBackground || '#FFDDDD' }]}>
                  <Text style={{ color: colors.error || 'red' }}>{error}</Text>
                </View>
              )}
              
              <View style={[styles.recordingInfo, { backgroundColor: colorScheme === 'dark' ? '#333' : '#F0F0F0' }]}>
                {isRecording ? (
                  <>
                    <Text style={[styles.recordingText, { color: colors.error }]}>Grabando...</Text>
                    <Text style={{ color: colors.text }}>{formatRecordingTime(recordingTime)}</Text>
                  </>
                ) : recordingUri ? (
                  <>
                    <Ionicons name="checkmark-circle" size={24} color={colors.success || 'green'} />
                    <Text style={{ color: colors.text, marginTop: 8 }}>Audio grabado - {formatRecordingTime(recordingTime)}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                      Puedes guardar la nota o grabar de nuevo
                    </Text>
                  </>
                ) : (
                  <Text style={{ color: colors.text }}>Pulsa para comenzar a grabar</Text>
                )}
              </View>
              
              <TouchableOpacity 
                style={[styles.recordButton, { 
                  backgroundColor: isRecording 
                    ? colors.error 
                    : (recordingUri ? colors.success || 'green' : colors.tint)
                }]}
                onPress={isRecording ? stopRecording : startRecording}
                disabled={isUploading}
              >
                <Ionicons 
                  name={isRecording ? "square-outline" : (recordingUri ? "refresh" : "mic")} 
                  size={32} 
                  color="#fff" 
                />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: 4,
  },
  saveButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingVertical: 8,
  },
  contentInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    minHeight: 300,
    lineHeight: 22,
  },
  checklistContainer: {
    marginTop: 8,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  checklistInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    marginLeft: 8,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
  },
  voiceContainer: {
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingInfo: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  recordingText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  errorContainer: {
    width: '100%',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  }
}); 