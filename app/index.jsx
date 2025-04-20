import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { FAB, Portal, Text, Card, Button, IconButton, ActivityIndicator } from 'react-native-paper';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuth } from '../context/auth-context';
import { useNotes } from '../context/notes-context';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const colorScheme = useColorScheme() || 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { session, isLoading: authLoading } = useAuth();
  const { notes, isLoading: notesLoading, sharedNotes, isLoadingShared } = useNotes();
  const [fabOpen, setFabOpen] = useState(false);
  const isLoading = notesLoading || authLoading;

  // Redirección si no hay sesión
  useEffect(() => {
    if (!authLoading && !session) {
      router.replace('/auth');
    }
  }, [session, authLoading]);

  const handleNewNote = () => {
    router.push('/notes/new');
  };

  const handleViewNote = (id) => {
    router.push(`/notes/${id}`);
  };

  const onStateChange = ({ open }) => setFabOpen(open);

  // Si no hay sesión, redireccionar a la pantalla de autenticación
  if (!authLoading && !session) {
    return <Redirect href="/auth" />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.text, marginTop: 10 }}>Cargando tus notas...</Text>
          </View>
        ) : notes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color={colors.primary} />
            <Text style={[styles.emptyText, { color: colors.text }]}>No tienes notas aún</Text>
            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 16 }}>
              Toca el botón + para crear tu primera nota
            </Text>
            <Button mode="contained" onPress={handleNewNote}>
              Crear nota
            </Button>
          </View>
        ) : (
          <View style={styles.notesContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Mis Notas</Text>
            {notes.map((note) => (
              <Card 
                key={note.id} 
                style={styles.noteCard} 
                onPress={() => handleViewNote(note.id)}
              >
                <Card.Content>
                  <View style={styles.noteHeader}>
                    <Text style={styles.noteTitle}>{note.title}</Text>
                    {note.type === 'checklist' && (
                      <Ionicons name="checkbox-outline" size={20} color={colors.primary} />
                    )}
                    {note.type === 'voice' && (
                      <Ionicons name="mic-outline" size={20} color={colors.primary} />
                    )}
                  </View>
                  <Text style={styles.notePreview} numberOfLines={2}>
                    {note.type === 'checklist' 
                      ? (note.checklistItems && note.checklistItems.length > 0 
                        ? `${note.checklistItems.filter(item => item.checked).length}/${note.checklistItems.length} completados` 
                        : 'Lista vacía')
                      : note.content}
                  </Text>
                  <Text style={styles.noteDate}>
                    {new Date(note.updated_at).toLocaleDateString()}
                  </Text>
                </Card.Content>
              </Card>
            ))}

            {/* Sección para notas compartidas */}
            {isLoadingShared ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={{ color: colors.text, marginTop: 10 }}>Cargando notas compartidas...</Text>
              </View>
            ) : sharedNotes && sharedNotes.length > 0 ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>
                  Notas Compartidas Conmigo
                </Text>
                {sharedNotes.map((note) => (
                  <Card 
                    key={note.id} 
                    style={[styles.noteCard, styles.sharedNoteCard]} 
                    onPress={() => handleViewNote(note.id)}
                  >
                    <Card.Content>
                      <View style={styles.sharedNoteHeader}>
                        <Text style={styles.noteTitle}>{note.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          {note.type === 'checklist' && (
                            <Ionicons name="checkbox-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                          )}
                          {note.type === 'voice' && (
                            <Ionicons name="mic-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                          )}
                          <Ionicons name="people" size={16} color={colors.primary} />
                        </View>
                      </View>
                      <Text style={styles.notePreview} numberOfLines={2}>
                        {note.type === 'checklist' 
                          ? (note.checklistItems && note.checklistItems.length > 0 
                            ? `${note.checklistItems.filter(item => item.checked).length}/${note.checklistItems.length} completados` 
                            : 'Lista vacía')
                          : note.content}
                      </Text>
                      <Text style={styles.noteDate}>
                        {new Date(note.updated_at).toLocaleDateString()}
                      </Text>
                    </Card.Content>
                  </Card>
                ))}
              </>
            ) : null}
          </View>
        )}
      </ScrollView>
      
      <Portal>
        <FAB.Group
          open={fabOpen}
          visible
          icon={fabOpen ? 'close' : 'plus'}
          color="#fff"
          fabStyle={{ backgroundColor: colors.primary }}
          actions={[
            {
              icon: 'note-text-outline',
              label: 'Nota de texto',
              onPress: handleNewNote,
              color: colors.primary,
            },
            {
              icon: 'checkbox-marked-outline',
              label: 'Lista de tareas',
              onPress: () => router.push('/notes/new?type=checklist'),
              color: colors.primary,
            },
            {
              icon: 'microphone-outline',
              label: 'Nota de voz',
              onPress: () => router.push('/notes/new?type=voice'),
              color: colors.primary,
            },
          ]}
          onStateChange={onStateChange}
        />
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  notesContainer: {
    paddingBottom: 80,
  },
  noteCard: {
    marginBottom: 16,
    elevation: 2,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  notePreview: {
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.8,
  },
  noteDate: {
    fontSize: 12,
    opacity: 0.6,
    alignSelf: 'flex-end',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sharedNoteCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.primary,
  },
  sharedNoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
}); 