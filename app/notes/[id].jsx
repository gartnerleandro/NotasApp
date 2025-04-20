import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity, useColorScheme, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNotes } from '../../context/notes-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import ShareModal from './share-modal';

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
      setIsModified(title !== initialNote.title || content !== initialNote.content);
    }
  }, [title, content, initialNote]);

  const handleSave = async () => {
    if (id === 'new') {
      // Esta función se maneja en la pantalla "new.jsx"
      return;
    }
    
    if (id && title.trim() !== '' && isModified && !readOnlyMode) {
      await updateNote(id, { title, content });
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
}); 