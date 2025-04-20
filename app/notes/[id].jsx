import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity, useColorScheme, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNotes } from '../../context/notes-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import ShareModal from './share-modal';
import { Checkbox, IconButton } from 'react-native-paper';
import * as Haptics from 'expo-haptics';

export default function NoteScreen() {
  const { id } = useLocalSearchParams();
  const { notes, sharedNotes, updateNote, deleteNote } = useNotes();
  const router = useRouter();
  const colorScheme = useColorScheme() || 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [initialNote, setInitialNote] = useState(null);
  const [isModified, setIsModified] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [isSharedNote, setIsSharedNote] = useState(false);
  const [readOnlyMode, setReadOnlyMode] = useState(false);
  const [isMyNote, setIsMyNote] = useState(false);
  const [noteType, setNoteType] = useState('text');
  const [checklistItems, setChecklistItems] = useState([]);

  useEffect(() => {
    if (id && id !== 'new') {
      // Primero buscar en las notas propias
      let noteToEdit = notes.find(note => note.id === id);
      
      if (noteToEdit) {
        console.log('Nota encontrada en notas propias:', noteToEdit);
        setTitle(noteToEdit.title);
        setContent(noteToEdit.content);
        setInitialNote(noteToEdit);
        setIsSharedNote(false);
        setIsMyNote(true);
        setReadOnlyMode(false);
        setNoteType(noteToEdit.type || 'text');
        if (noteToEdit.type === 'checklist' && noteToEdit.checklistItems) {
          setChecklistItems(noteToEdit.checklistItems);
        }
      } else {
        // Si no está en las propias, buscar en las compartidas
        noteToEdit = sharedNotes.find(note => note.id === id);
        if (noteToEdit) {
          console.log('Nota encontrada en notas compartidas:', noteToEdit);
          setTitle(noteToEdit.title);
          setContent(noteToEdit.content);
          setInitialNote(noteToEdit);
          setIsSharedNote(true);
          setIsMyNote(false);
          setNoteType(noteToEdit.type || 'text');
          if (noteToEdit.type === 'checklist' && noteToEdit.checklistItems) {
            setChecklistItems(noteToEdit.checklistItems);
          }
          
          // Verificar si la nota es de solo lectura o lectura/escritura
          const isReadOnly = noteToEdit.permission === 'read';
          setReadOnlyMode(isReadOnly);
        } else {
          console.log('Nota no encontrada en ninguna colección. ID:', id);
        }
      }
    } else if (id === 'new') {
      setIsMyNote(true);
      setIsSharedNote(false);
    }
  }, [id, notes, sharedNotes]);

  useEffect(() => {
    if (initialNote) {
      if (noteType === 'checklist') {
        // Para listas de tareas, comparamos el título y los items
        const initialItems = initialNote.checklistItems || [];
        const currentItems = checklistItems || [];
        
        // Verificar si hay cambios en la lista
        let itemsChanged = initialItems.length !== currentItems.length;
        if (!itemsChanged) {
          for (let i = 0; i < initialItems.length; i++) {
            if (initialItems[i].text !== currentItems[i].text || 
                initialItems[i].checked !== currentItems[i].checked) {
              itemsChanged = true;
              break;
            }
          }
        }
        
        setIsModified(title !== initialNote.title || itemsChanged);
      } else {
        // Para otros tipos de notas, comparamos título y contenido
        setIsModified(title !== initialNote.title || content !== initialNote.content);
      }
    }
  }, [title, content, checklistItems, initialNote, noteType]);

  const handleSave = async () => {
    if (id === 'new') {
      // Esta función se maneja en la pantalla "new.jsx"
      return;
    }
    
    if (id && title.trim() !== '' && isModified && !readOnlyMode) {
      if (noteType === 'checklist') {
        await updateNote(id, { 
          title, 
          type: 'checklist',
          checklistItems
        });
      } else {
        await updateNote(id, { title, content });
      }
      setIsModified(false);
    }
    
    router.back();
  };

  const handleDelete = async () => {
    if (id && id !== 'new' && isMyNote) {
      await deleteNote(id);
      router.replace('/');
    }
  };

  const handleShareNote = () => {
    console.log('Botón compartir presionado. isMyNote:', isMyNote);
    setShareModalVisible(true);
  };

  const handleBack = () => {
    if (isModified && !readOnlyMode) {
      handleSave();
    } else {
      router.back();
    }
  };

  const toggleChecklistItem = (index) => {
    if (readOnlyMode) return;
    
    const newItems = [...checklistItems];
    newItems[index].checked = !newItems[index].checked;
    setChecklistItems(newItems);
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const updateChecklistItem = (index, text) => {
    if (readOnlyMode) return;
    
    const newItems = [...checklistItems];
    newItems[index].text = text;
    setChecklistItems(newItems);
  };

  const addChecklistItem = () => {
    if (readOnlyMode) return;
    
    setChecklistItems([...checklistItems, { text: '', checked: false }]);
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const removeChecklistItem = (index) => {
    if (readOnlyMode) return;
    
    if (checklistItems.length > 1) {
      const newItems = [...checklistItems];
      newItems.splice(index, 1);
      setChecklistItems(newItems);
      
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      
      {/* Header personalizado */}
      <View style={[
        styles.header, 
        { 
          backgroundColor: colors.background,
          borderBottomColor: colorScheme === 'dark' ? colors.noteBorder : 'rgba(0,0,0,0.1)',
        }
      ]}>
        <TouchableOpacity 
          onPress={handleBack}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary || colors.tint} />
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          {isMyNote && (
            <TouchableOpacity 
              onPress={handleShareNote}
              style={styles.headerButton}
            >
              <Ionicons name="share-outline" size={22} color={colors.primary || colors.tint} />
            </TouchableOpacity>
          )}
          {isMyNote && (
            <TouchableOpacity 
              onPress={handleDelete}
              style={styles.headerButton}
            >
              <Ionicons name="trash-outline" size={22} color={colors.red} />
            </TouchableOpacity>
          )}
          {isModified && !readOnlyMode && (
            <TouchableOpacity 
              onPress={handleSave}
              style={[styles.headerButton, styles.saveButton]}
            >
              <Ionicons name="save-outline" size={18} color={colors.background} />
              <Text style={styles.saveButtonText}>Guardar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={insets.top + 50}
      >
        <ScrollView 
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {readOnlyMode && (
            <View style={styles.readOnlyBanner}>
              <Ionicons name="lock-closed" size={14} color={colors.background} />
              <Text style={styles.readOnlyText}>Solo lectura</Text>
            </View>
          )}
          
          <TextInput
            style={[
              styles.titleInput, 
              { 
                color: colors.text,
                borderBottomColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
              }
            ]}
            value={title}
            onChangeText={setTitle}
            placeholder="Título"
            placeholderTextColor={colors.gray}
            selectionColor={colors.primary || colors.tint}
            editable={!readOnlyMode}
            autoFocus={id === 'new'}
          />
          
          {noteType === 'text' && (
            <TextInput
              style={[styles.contentInput, { color: colors.text }]}
              value={content}
              onChangeText={setContent}
              placeholder="Escribe tu nota aquí..."
              placeholderTextColor={colors.gray}
              multiline
              textAlignVertical="top"
              selectionColor={colors.primary || colors.tint}
              editable={!readOnlyMode}
            />
          )}

          {noteType === 'checklist' && (
            <View style={styles.checklistContainer}>
              {checklistItems.length === 0 ? (
                <Text style={{ color: colors.text, textAlign: 'center', marginTop: 20, opacity: 0.6 }}>
                  No hay elementos en esta lista
                </Text>
              ) : (
                checklistItems.map((item, index) => (
                  <View key={index} style={styles.checklistItem}>
                    <Checkbox
                      status={item.checked ? 'checked' : 'unchecked'}
                      onPress={() => toggleChecklistItem(index)}
                      color={colors.primary || colors.tint}
                      disabled={readOnlyMode}
                    />
                    <TextInput
                      style={[styles.checklistInput, { 
                        color: colors.text,
                        textDecorationLine: item.checked ? 'line-through' : 'none',
                        opacity: item.checked ? 0.6 : 1
                      }]}
                      placeholder="Elemento de la lista..."
                      placeholderTextColor={colors.gray}
                      value={item.text}
                      onChangeText={(text) => updateChecklistItem(index, text)}
                      selectionColor={colors.primary || colors.tint}
                      editable={!readOnlyMode}
                    />
                    {!readOnlyMode && (
                      <IconButton
                        icon="close"
                        size={20}
                        onPress={() => removeChecklistItem(index)}
                        iconColor={colors.gray}
                      />
                    )}
                  </View>
                ))
              )}
              
              {!readOnlyMode && (
                <TouchableOpacity 
                  style={[styles.addItemButton, { borderColor: colors.primary || colors.tint }]}
                  onPress={addChecklistItem}
                >
                  <Ionicons name="add" size={20} color={colors.primary || colors.tint} />
                  <Text style={{ color: colors.primary || colors.tint, marginLeft: 8 }}>Agregar elemento</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {noteType === 'voice' && (
            <View style={styles.voiceContainer}>
              <Text style={{ color: colors.text, textAlign: 'center' }}>
                Nota de voz
              </Text>
              {/* Aquí iría el reproductor de audio */}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal para compartir notas */}
      <ShareModal 
        visible={shareModalVisible} 
        onDismiss={() => setShareModalVisible(false)} 
        noteId={id}
        noteName={title} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 60,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  headerButton: {
    padding: 10,
    borderRadius: 20,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#FF9500',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 16,
    marginLeft: 10,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 14,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  titleInput: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    padding: 8,
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  contentInput: {
    fontSize: 16,
    lineHeight: 26,
    padding: 8,
    flex: 1,
    minHeight: 300,
  },
  readOnlyBanner: {
    backgroundColor: '#FF9500',
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  readOnlyText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 6,
  },
  checklistContainer: {
    marginTop: 16,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 8,
  },
  checklistInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    padding: 4,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
  },
  voiceContainer: {
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  }
}); 