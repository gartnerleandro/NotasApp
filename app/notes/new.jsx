import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity, useColorScheme } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useNotes } from '../../context/notes-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Checkbox, Text, List, IconButton, useTheme } from 'react-native-paper';
import * as Haptics from 'expo-haptics';

export default function NewNoteScreen() {
  const { addNote } = useNotes();
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
  }, [params]);
  
  const handleSave = async () => {
    if (title.trim() === '' && content.trim() === '' && 
      (noteType !== 'checklist' || !checklistItems.some(item => item.text.trim() !== ''))) {
      // No guardar notas vacías
      router.back();
      return;
    }

    const finalTitle = title.trim() === '' ? 'Sin título' : title;
    let noteData = {};
    
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
        noteData = { 
          title: finalTitle, 
          content: 'Nota de voz', // Esto sería reemplazado por la referencia a la grabación
          type: 'voice',
          recordingUri: 'placeholder-uri' // Aquí iría la URI real de la grabación
        };
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
  
  const startRecording = () => {
    setIsRecording(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Iniciar el contador de tiempo
    const interval = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
    
    setRecordingTimer(interval);
    
    // Aquí iría la lógica real de grabación de audio
  };
  
  const stopRecording = () => {
    setIsRecording(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    
    // Detener el contador
    if (recordingTimer) {
      clearInterval(recordingTimer);
    }
    
    // Aquí iría la lógica para detener la grabación
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
        >
          <Ionicons name="checkmark" size={24} color={colors.tint} />
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
                ) : (
                  <Text style={{ color: colors.text }}>Pulsa para comenzar a grabar</Text>
                )}
              </View>
              
              <TouchableOpacity 
                style={[styles.recordButton, { 
                  backgroundColor: isRecording ? colors.error : colors.tint 
                }]}
                onPress={isRecording ? stopRecording : startRecording}
              >
                <Ionicons 
                  name={isRecording ? "square-outline" : "mic"} 
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