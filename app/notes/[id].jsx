import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity, useColorScheme, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNotes } from '../../context/notes-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import ShareModal from './share-modal';
import { Checkbox, IconButton, Button, ActivityIndicator } from 'react-native-paper';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

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
  const [recordingUri, setRecordingUri] = useState('');
  
  // Estados para el reproductor de audio
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [error, setError] = useState(null);
  const positionMillis = useRef(0);
  const playbackUpdateInterval = useRef(null);

  useEffect(() => {
    if (id && id !== 'new') {
      // Primero buscar en las notas propias
      let noteToEdit = notes.find(note => note.id === id);
      
      if (noteToEdit) {
        console.log('Nota encontrada en notas propias:', noteToEdit);
        
        // Extraer datos tanto del objeto principal como del metadata si existe
        const noteType = noteToEdit.type || (noteToEdit.metadata && noteToEdit.metadata.type) || 'text';
        const noteRecordingUri = noteToEdit.recordingUri || (noteToEdit.metadata && noteToEdit.metadata.recordingUri) || '';
        const noteChecklistItems = noteToEdit.checklistItems || (noteToEdit.metadata && noteToEdit.metadata.checklistItems) || [];
        
        setTitle(noteToEdit.title);
        setContent(noteToEdit.content);
        setInitialNote(noteToEdit);
        setIsSharedNote(false);
        setIsMyNote(true);
        setReadOnlyMode(false);
        setNoteType(noteType);
        
        if (noteType === 'checklist' && noteChecklistItems.length > 0) {
          setChecklistItems(noteChecklistItems);
        }
        
        if (noteType === 'voice' && noteRecordingUri) {
          setRecordingUri(noteRecordingUri);
          console.log('Cargando URI de audio:', noteRecordingUri);
          // Verificar y cargar el audio
          verifyAndLoadAudio(noteRecordingUri);
        }
      } else {
        // Si no está en las propias, buscar en las compartidas
        noteToEdit = sharedNotes.find(note => note.id === id);
        if (noteToEdit) {
          console.log('Nota encontrada en notas compartidas:', noteToEdit);
          
          // Extraer datos tanto del objeto principal como del metadata si existe
          const noteType = noteToEdit.type || (noteToEdit.metadata && noteToEdit.metadata.type) || 'text';
          const noteRecordingUri = noteToEdit.recordingUri || (noteToEdit.metadata && noteToEdit.metadata.recordingUri) || '';
          const noteChecklistItems = noteToEdit.checklistItems || (noteToEdit.metadata && noteToEdit.metadata.checklistItems) || [];
          
          setTitle(noteToEdit.title);
          setContent(noteToEdit.content);
          setInitialNote(noteToEdit);
          setIsSharedNote(true);
          setIsMyNote(false);
          setNoteType(noteType);
          
          if (noteType === 'checklist' && noteChecklistItems.length > 0) {
            setChecklistItems(noteChecklistItems);
          }
          
          if (noteType === 'voice' && noteRecordingUri) {
            setRecordingUri(noteRecordingUri);
            console.log('Cargando URI de audio:', noteRecordingUri);
            // Verificar y cargar el audio
            verifyAndLoadAudio(noteRecordingUri);
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
    
    // Limpiar cuando se desmonta el componente
    return () => {
      unloadAudio();
      clearInterval(playbackUpdateInterval.current);
    };
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
  
  const loadAudio = async (uri) => {
    try {
      console.log('===== INICIO DE CARGA DE AUDIO =====');
      console.log('URI recibida:', uri);
      
      if (!uri) {
        console.log('Error: No se proporcionó URI para cargar el audio');
        setError('No se proporcionó URI para cargar el audio');
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      console.log('Cargando audio desde:', uri);
      
      try {
        // Limpiar cualquier reproductor de audio anterior
        console.log('Limpiando reproductor anterior...');
        await unloadAudio();
        
        // Configurar el modo de audio
        console.log('Configurando modo de audio...');
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          interruptionModeIOS: 1,
          interruptionModeAndroid: 1,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false
        });
        console.log('Modo de audio configurado correctamente');
        
        // Crear nuevo objeto de sonido con manejo de excepciones
        console.log('Creando objeto de sonido...');
        let soundObject;
        try {
          soundObject = new Audio.Sound();
          console.log('Objeto de sonido creado correctamente');
        } catch (error) {
          console.error('Error al crear el objeto de sonido:', error);
          setError('No se pudo inicializar el reproductor de audio');
          setIsLoading(false);
          return;
        }
        
        // Configurar el callback de estado
        console.log('Configurando callback de estado...');
        soundObject.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
        
        // Cargar el archivo de audio con timeout para prevenir bloqueos
        console.log('Iniciando carga del archivo de audio...');
        const loadPromise = soundObject.loadAsync({ uri });
        
        // Establecer un timeout de 15 segundos para evitar esperas infinitas
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout al cargar el audio (15s)')), 15000);
        });
        
        // Carreras de promesas para manejar timeout
        console.log('Esperando a que se cargue el audio o se alcance el timeout...');
        await Promise.race([loadPromise, timeoutPromise]);
        console.log('Audio cargado correctamente');
        
        // Configurar opciones adicionales
        console.log('Configurando opciones adicionales...');
        await soundObject.setProgressUpdateIntervalAsync(200);
        await soundObject.setVolumeAsync(1.0);
        
        // Guardar la referencia al objeto de sonido
        console.log('Guardando referencia al objeto de sonido');
        setSound(soundObject);
        
        // Obtener la duración inicial
        console.log('Obteniendo información de duración...');
        const status = await soundObject.getStatusAsync();
        console.log('Estado del audio:', JSON.stringify(status, null, 2));
        
        if (status.isLoaded && status.durationMillis) {
          console.log('Duración del audio:', status.durationMillis, 'ms');
          setDuration(status.durationMillis);
        } else {
          console.log('No se pudo obtener la duración del audio o el audio no está cargado');
        }
        
        setIsLoading(false);
        console.log('===== CARGA DE AUDIO COMPLETADA =====');
      } catch (error) {
        console.error('Error al inicializar el reproductor de audio:', error);
        console.log('Mensaje de error detallado:', error.message);
        console.log('Stack trace:', error.stack);
        setError('Error al inicializar el reproductor: ' + (error.message || 'Error desconocido'));
        setIsLoading(false);
        
        // Intentar limpiar en caso de error
        try {
          console.log('Intentando limpiar recursos en caso de error...');
          if (sound) {
            await sound.unloadAsync();
            setSound(null);
          }
        } catch (cleanupError) {
          console.error('Error adicional al limpiar recursos:', cleanupError);
        }
      }
    } catch (error) {
      console.error('Error general al cargar el audio:', error);
      console.log('Mensaje de error general:', error.message);
      console.log('Stack trace general:', error.stack);
      setError('Error al cargar el audio: ' + (error.message || 'Error desconocido'));
      setIsLoading(false);
    }
  };
  
  const unloadAudio = async () => {
    console.log('Iniciando descarga de audio...');
    if (sound) {
      try {
        console.log('Deteniendo reproducción...');
        await sound.stopAsync();
        console.log('Descargando recursos...');
        await sound.unloadAsync();
        console.log('Reiniciando estados...');
        setSound(null);
        setIsPlaying(false);
        setPosition(0);
        positionMillis.current = 0;
        console.log('Descarga de audio completada');
      } catch (error) {
        console.error('Error al descargar el audio:', error);
        console.log('Mensaje de error:', error.message);
      }
    } else {
      console.log('No hay objeto de sonido para descargar');
    }
  };
  
  const onPlaybackStatusUpdate = (status) => {
    if (!status) {
      console.log('onPlaybackStatusUpdate: No se recibió estado');
      return;
    }
    
    try {
      if (status.isLoaded) {
        if (status.durationMillis && status.durationMillis !== duration) {
          console.log('Actualización de duración:', status.durationMillis);
          setDuration(status.durationMillis);
        }
        
        positionMillis.current = status.positionMillis;
        setPosition(status.positionMillis);
        
        if (status.didJustFinish) {
          console.log('Reproducción finalizada');
          setIsPlaying(false);
        }
      } else if (status.error) {
        console.error('Error en la reproducción:', status.error);
      }
    } catch (error) {
      console.error('Error en onPlaybackStatusUpdate:', error);
    }
  };
  
  const handlePlayPause = async () => {
    if (!sound) {
      console.log('No hay sonido para reproducir/pausar');
      return;
    }
    
    try {
      console.log('Estado actual de reproducción:', isPlaying ? 'reproduciendo' : 'pausado');
      
      if (isPlaying) {
        console.log('Pausando reproducción...');
        await sound.pauseAsync();
        setIsPlaying(false);
        console.log('Reproducción pausada');
      } else {
        console.log('Iniciando reproducción desde posición:', positionMillis.current);
        
        // Verificar el estado actual del sonido
        const status = await sound.getStatusAsync();
        console.log('Estado actual antes de reproducir:', JSON.stringify(status, null, 2));
        
        if (!status.isLoaded) {
          console.log('El sonido no está cargado, intentando cargar de nuevo...');
          await verifyAndLoadAudio(recordingUri);
          return;
        }
        
        // Intentar reproducir con manejo de errores
        try {
          await sound.playFromPositionAsync(positionMillis.current);
          setIsPlaying(true);
          console.log('Reproducción iniciada correctamente');
        } catch (playError) {
          console.error('Error al iniciar la reproducción:', playError);
          
          // Intentar reiniciar el reproductor como último recurso
          try {
            console.log('Intentando reiniciar el reproductor...');
            await unloadAudio();
            await verifyAndLoadAudio(recordingUri);
          } catch (resetError) {
            console.error('Error al reiniciar el reproductor:', resetError);
            setError('No se pudo reproducir el audio. Intente de nuevo.');
          }
        }
      }
    } catch (error) {
      console.error('Error al reproducir/pausar el audio:', error);
      console.log('Mensaje de error:', error.message);
      console.log('Stack trace:', error.stack);
      
      // Intentar recuperarse del error
      if (recordingUri) {
        setError('Error de reproducción. Reintentando cargar el audio...');
        setTimeout(() => {
          verifyAndLoadAudio(recordingUri);
        }, 1500);
      }
    }
  };
  
  const handleSeek = async (value) => {
    if (!sound) return;
    
    try {
      positionMillis.current = value;
      await sound.setPositionAsync(value);
      setPosition(value);
    } catch (error) {
      console.error('Error al buscar en el audio:', error);
    }
  };
  
  const formatTime = (millis) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

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

  // Verificar que el URI es válido antes de intentar cargar el audio
  const verifyAndLoadAudio = async (uri) => {
    try {
      console.log('===== VERIFICACIÓN DE AUDIO =====');
      console.log('Iniciando verificación de URI:', uri);
      
      if (!uri) {
        console.log('Error: URI del audio no válido (null o vacío)');
        setError('URI del audio no válido');
        return;
      }
      
      // Validar formato de la URI
      if (typeof uri !== 'string') {
        console.log('Error: El formato de URI no es una cadena, es:', typeof uri);
        setError('El formato de URI no es válido');
        return;
      }
      
      // Validación básica de formato de URL
      if (!uri.startsWith('http') && !uri.startsWith('file')) {
        console.log('Error: La URL no tiene formato válido (no comienza con http o file):', uri);
        setError('La URL del audio no tiene un formato válido');
        return;
      }
      
      console.log('URI válida, procediendo a cargar el audio...');
      // Intentar cargar el audio
      loadAudio(uri);
    } catch (error) {
      console.error('Error general al verificar el audio:', error);
      console.log('Mensaje de error:', error.message);
      console.log('Stack trace:', error.stack);
      setError('Error inesperado al verificar el audio: ' + (error.message || 'Error desconocido'));
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
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary || colors.tint} />
                  <Text style={{ color: colors.text, marginTop: 10 }}>Cargando audio...</Text>
                </View>
              ) : error ? (
                <View style={styles.errorContainer}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={48}
                    color={colors.error || 'red'}
                  />
                  <Text style={[styles.errorText, { color: colors.error || 'red' }]}>
                    {error}
                  </Text>
                  <TouchableOpacity 
                    style={[styles.retryButton, { backgroundColor: colors.primary || colors.tint }]}
                    onPress={() => recordingUri && verifyAndLoadAudio(recordingUri)}
                  >
                    <Text style={{ color: 'white' }}>Reintentar</Text>
                  </TouchableOpacity>
                </View>
              ) : recordingUri && sound && duration > 0 ? (
                <View style={styles.audioPlayerContainer}>
                  <Text style={{ color: colors.text, marginBottom: 10, textAlign: 'center' }}>
                    Nota de voz grabada: {formatTime(duration || 0)}
                  </Text>
                  <View style={styles.playerControls}>
                    <TouchableOpacity
                      onPress={handlePlayPause}
                      style={[styles.playButton, {
                        backgroundColor: colors.primary || colors.tint,
                      }]}
                    >
                      <Ionicons 
                        name={isPlaying ? "pause" : "play"} 
                        size={28} 
                        color="white" 
                      />
                    </TouchableOpacity>
                    
                    <View style={styles.progressContainer}>
                      {/* Versión robusta del slider que maneja errores */}
                      {duration > 0 ? (
                        <Slider
                          value={position}
                          minimumValue={0}
                          maximumValue={duration}
                          onValueChange={handleSeek}
                          minimumTrackTintColor={colors.primary || colors.tint}
                          maximumTrackTintColor={colorScheme === 'dark' ? '#555' : '#ccc'}
                          thumbTintColor={colors.primary || colors.tint}
                          style={{ width: '100%' }}
                        />
                      ) : (
                        <View 
                          style={{ 
                            width: '100%', 
                            height: 20, 
                            backgroundColor: colorScheme === 'dark' ? '#555' : '#ccc',
                            borderRadius: 10
                          }}
                        >
                          <View 
                            style={{ 
                              width: '0%', 
                              height: '100%', 
                              backgroundColor: colors.primary || colors.tint,
                              borderRadius: 10 
                            }} 
                          />
                        </View>
                      )}
                      <View style={styles.timeInfo}>
                        <Text style={{ color: colors.text }}>{formatTime(position)}</Text>
                        <Text style={{ color: colors.text }}>{formatTime(duration)}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Link para depuración */}
                  <TouchableOpacity 
                    onPress={() => console.log('URL de audio:', recordingUri)}
                    style={{ marginTop: 20 }}
                  >
                    <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center' }}>
                      Comprobar URL de audio
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.noAudioContainer}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={48}
                    color={colors.error || 'red'}
                  />
                  <Text style={[styles.noAudioText, { color: colors.text }]}>
                    {recordingUri ? 'Preparando el reproductor de audio...' : 'No se encontró el audio de esta nota'}
                  </Text>
                  {recordingUri && (
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 5 }}>
                      URI: {recordingUri.substring(0, 50)}...
                    </Text>
                  )}
                  {recordingUri && (
                    <TouchableOpacity 
                      style={[styles.retryButton, { backgroundColor: colors.primary || colors.tint, marginTop: 15 }]}
                      onPress={() => recordingUri && verifyAndLoadAudio(recordingUri)}
                    >
                      <Text style={{ color: 'white' }}>Cargar audio</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
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
    minHeight: 200,
  },
  audioPlayerContainer: {
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
  },
  playerControls: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  progressContainer: {
    flex: 1,
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    minHeight: 200,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    minHeight: 200,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  retryButton: {
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    paddingHorizontal: 20,
  },
  noAudioContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  noAudioText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  }
}); 