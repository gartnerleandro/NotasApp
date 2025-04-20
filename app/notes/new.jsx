import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity, useColorScheme, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useNotes } from '../../context/notes-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Checkbox, Text, List, IconButton, useTheme, ActivityIndicator } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
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
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingTimer, setRecordingTimer] = useState(null);
  const [recording, setRecording] = useState(null);
  const [recordingUri, setRecordingUri] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
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
      if (recordingTimer) {
        clearInterval(recordingTimer);
      }
      if (recording) {
        stopRecording();
      }
    };
  }, [params]);
  
  const requestAudioPermissions = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert(
          "Permisos requeridos",
          "Necesitamos acceso al micrófono para grabar notas de voz.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error('Error al solicitar permisos de audio:', error);
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
          // Subir archivo de audio a Supabase Storage
          const uploadedUrl = await uploadAudioFile(recordingUri, session.user.id);
          
          noteData = { 
            title: finalTitle, 
            content: 'Nota de voz', 
            type: 'voice',
            recordingUri: uploadedUrl
          };
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

  const handleCancel = () => {
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
  
  const startRecording = async () => {
    try {
      // Asegurarse de que la aplicación tiene los permisos necesarios
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permiso denegado', 'No se puede grabar sin acceso al micrófono');
        return;
      }
      
      // Preparar la grabadora
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      // Iniciar nueva grabación
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Iniciar el contador de tiempo
      const interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      setRecordingTimer(interval);
    } catch (error) {
      console.error('Error al iniciar la grabación:', error);
      Alert.alert('Error', 'No se pudo iniciar la grabación');
    }
  };
  
  const stopRecording = async () => {
    try {
      if (!recording) return;
      
      setIsRecording(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      
      // Detener el contador
      if (recordingTimer) {
        clearInterval(recordingTimer);
      }
      
      // Detener la grabación
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      
      // Obtener URI de la grabación
      const uri = recording.getURI();
      setRecordingUri(uri);
      setRecording(null);
      
      console.log('Grabación finalizada. URI:', uri);
    } catch (error) {
      console.error('Error al detener la grabación:', error);
      Alert.alert('Error', 'No se pudo completar la grabación');
    }
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
                  backgroundColor: isRecording ? colors.error : (recordingUri ? colors.success || 'green' : colors.tint)
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
  }
}); 