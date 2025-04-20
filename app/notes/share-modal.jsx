import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Modal } from 'react-native';
import { Text, Button, Chip, List, RadioButton, Searchbar, Divider } from 'react-native-paper';
import { useNotes } from '../../context/notes-context';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';


export default function ShareModal({ visible, onDismiss, noteId, noteName }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [permission, setPermission] = useState('read');
  const [isLoading, setIsLoading] = useState(false);
  const [currentShares, setCurrentShares] = useState([]);
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  
  const { searchUsers, shareNote, getNoteShares, removeNoteShare } = useNotes();
  const colorScheme = useColorScheme() || 'light';
  const colors = Colors[colorScheme];
  
  // Referencia al BottomSheet
  const bottomSheetRef = useRef(null);
  
  // Definir los snap points para el BottomSheet
  const snapPoints = ['70%'];
  
  // Agregar un nuevo useEffect para manejar la apertura y cierre del BottomSheet
  useEffect(() => {
    if (visible && bottomSheetRef.current) {
      bottomSheetRef.current.expand();
    } else if (!visible && bottomSheetRef.current) {
      bottomSheetRef.current.close();
    }
  }, [visible]);

  useEffect(() => {
    if (visible && noteId) {
      loadCurrentShares();
    }
  }, [visible, noteId]);

  useEffect(() => {
    const loadUsers = async () => {
      if (searchQuery.length >= 3) {
        const results = await searchUsers(searchQuery);
        // Filtramos los usuarios que ya están seleccionados o ya tienen permisos
        const filteredResults = results.filter(
          user => !selectedUsers.some(selected => selected.id === user.id) &&
                 !currentShares.some(share => share.shared_with_id === user.id)
        );
        setSearchResults(filteredResults);
      } else {
        setSearchResults([]);
      }
    };

    loadUsers();
  }, [searchQuery]);

  const loadCurrentShares = async () => {
    setIsLoadingShares(true);
    try {
      const shares = await getNoteShares(noteId);
      setCurrentShares(shares);
    } catch (error) {
      console.error('Error al cargar permisos:', error);
    } finally {
      setIsLoadingShares(false);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleSelectUser = (user) => {
    setSelectedUsers([...selectedUsers, user]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveSelectedUser = (userId) => {
    setSelectedUsers(selectedUsers.filter(user => user.id !== userId));
  };

  const handlePermissionChange = (value) => {
    setPermission(value);
  };

  const handleShareNote = async () => {
    setIsLoading(true);
    try {
      for (const user of selectedUsers) {
        await shareNote(noteId, user.id, permission);
      }
      await loadCurrentShares();
      setSelectedUsers([]);
    } catch (error) {
      console.error('Error al compartir nota:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveShare = async (userId) => {
    try {
      await removeNoteShare(noteId, userId);
      await loadCurrentShares();
    } catch (error) {
      console.error('Error al eliminar compartición:', error);
    }
  };

  // Renderizamos usando BottomSheet en lugar de Modal
  return (
    <GestureHandlerRootView style={{ 
      position: 'absolute', 
      width: '100%', 
      height: '100%', 
      bottom: 0, 
      left: 0, 
      right: 0, 
      zIndex: visible ? 1000 : -1 
    }}>
      <View style={[
        styles.modalContainer, 
        { opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }
      ]}>
        <BottomSheet
          ref={bottomSheetRef}
          index={visible ? 0 : -1}
          snapPoints={snapPoints}
          enablePanDownToClose={true}
          onClose={onDismiss}
          handleIndicatorStyle={{
            backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)',
            width: 40,
            height: 5
          }}
          backgroundStyle={{
            backgroundColor: colors.background
          }}
          enableContentPanningGesture={true}
        >
          <BottomSheetView style={{ flex: 1 }}>
            <View style={styles.headerContainer}>
              <Text style={[styles.title, { color: colors.text }]}>
                Compartir nota
              </Text>
              <TouchableOpacity 
                onPress={onDismiss}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.noteTitle, { color: colors.text }]}>"{noteName}"</Text>

            <ScrollView contentContainerStyle={styles.contentContainer}>
              <View style={styles.searchSection}>
                <Searchbar
                  placeholder="Buscar usuarios por email..."
                  onChangeText={handleSearch}
                  value={searchQuery}
                  style={[styles.searchBar, { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F5F5F5' }]}
                  iconColor={colors.primary || colors.tint}
                  placeholderTextColor={colorScheme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'}
                  inputStyle={{ color: colors.text }}
                />
                
                {searchResults.length > 0 && (
                  <ScrollView 
                    nestedScrollEnabled={true}
                    style={[
                      styles.searchResults, 
                      { 
                        borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF'
                      }
                    ]}
                  >
                    {searchResults.map(user => (
                      <TouchableOpacity 
                        key={user.id} 
                        onPress={() => handleSelectUser(user)}
                        style={[
                          styles.searchResultItem, 
                          { borderBottomColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
                        ]}
                      >
                        <Ionicons name="person-circle-outline" size={20} color={colors.primary || colors.tint} style={{ marginRight: 8 }} />
                        <Text style={{ color: colors.text }}>{user.username || user.email}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              {selectedUsers.length > 0 && (
                <View style={styles.selectedUsersSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Usuarios seleccionados:
                  </Text>
                  <View style={styles.selectedUsers}>
                    {selectedUsers.map(user => (
                      <Chip
                        key={user.id}
                        onClose={() => handleRemoveSelectedUser(user.id)}
                        style={[styles.userChip, { backgroundColor: colorScheme === 'dark' ? '#3A3A3C' : '#E8E8E8' }]}
                        textStyle={{ color: colors.text }}
                        closeIconColor={colors.primary || colors.tint}
                      >
                        {user.username || user.email}
                      </Chip>
                    ))}
                  </View>
                </View>
              )}

              <Divider style={styles.divider} />

              <View style={styles.permissionSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Nivel de acceso:
                </Text>
                <RadioButton.Group 
                  onValueChange={handlePermissionChange} 
                  value={permission}
                >
                  <View style={styles.radioOption}>
                    <RadioButton 
                      value="read" 
                      color={colors.primary || colors.tint}
                    />
                    <View style={styles.radioContent}>
                      <Text style={{ color: colors.text, fontWeight: '500' }}>Solo lectura</Text>
                      <Text style={{ color: colorScheme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)', fontSize: 12 }}>
                        El usuario solo podrá ver la nota
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.radioOption, { marginTop: 12 }]}>
                    <RadioButton 
                      value="write" 
                      color={colors.primary || colors.tint}
                    />
                    <View style={styles.radioContent}>
                      <Text style={{ color: colors.text, fontWeight: '500' }}>Lectura y escritura</Text>
                      <Text style={{ color: colorScheme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)', fontSize: 12 }}>
                        El usuario podrá editar la nota
                      </Text>
                    </View>
                  </View>
                </RadioButton.Group>
              </View>

              {selectedUsers.length > 0 && (
                <Button 
                  mode="contained" 
                  onPress={handleShareNote} 
                  style={styles.shareButton}
                  loading={isLoading}
                  disabled={isLoading}
                  buttonColor={colors.primary || colors.tint}
                >
                  Compartir con {selectedUsers.length} usuario{selectedUsers.length !== 1 ? 's' : ''}
                </Button>
              )}

              <Divider style={styles.divider} />
              
              {isLoadingShares ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary || colors.tint} />
                  <Text style={[styles.loading, { color: colors.text }]}>
                    Cargando permisos...
                  </Text>
                </View>
              ) : currentShares.length > 0 && (
                <View style={styles.currentSharesSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Usuarios con acceso:
                  </Text>
                  <ScrollView style={styles.sharesList} nestedScrollEnabled={true}>
                    {currentShares.map(share => (
                      <List.Item
                        key={share.id}
                        title={share.shared_with_id}
                        titleStyle={{ color: colors.text, fontSize: 14 }}
                        description={share.permission === 'read' ? 'Solo lectura' : 'Lectura y escritura'}
                        descriptionStyle={{ fontSize: 12, color: colorScheme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}
                        left={props => (
                          <View {...props} style={{ justifyContent: 'center', marginRight: -16 }}>
                            <Ionicons name="person" size={20} color={colors.primary || colors.tint} />
                          </View>
                        )}
                        right={props => (
                          <TouchableOpacity 
                            {...props} 
                            onPress={() => handleRemoveShare(share.shared_with_id)}
                            style={styles.removeButton}
                          >
                            <Ionicons name="close-circle" size={22} color={colors.red} />
                          </TouchableOpacity>
                        )}
                        style={[
                          styles.shareItem, 
                          { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F5F5F5' }
                        ]}
                      />
                    ))}
                  </ScrollView>
                </View>
              )}

              <Button 
                mode="text" 
                onPress={onDismiss} 
                style={styles.cancelButton}
                textColor={colors.primary || colors.tint}
              >
                Cerrar
              </Button>
            </ScrollView>
          </BottomSheetView>
        </BottomSheet>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
    borderRadius: 20,
  },
  noteTitle: {
    fontSize: 16,
    marginBottom: 20,
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },
  searchSection: {
    marginBottom: 20,
    position: 'relative',
  },
  searchBar: {
    elevation: 0,
    borderRadius: 8,
    marginBottom: 8,
    height: 46,
  },
  searchResults: {
    maxHeight: 150,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedUsersSection: {
    marginBottom: 20,
  },
  divider: {
    marginVertical: 16,
    height: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  selectedUsers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  userChip: {
    margin: 4,
    borderRadius: 20,
    paddingHorizontal: 4,
  },
  permissionSection: {
    marginBottom: 20,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  radioContent: {
    marginLeft: 8,
    flex: 1,
  },
  shareButton: {
    marginBottom: 10,
    borderRadius: 8,
    paddingVertical: 4,
  },
  cancelButton: {
    marginTop: 8,
  },
  currentSharesSection: {
    marginTop: 4,
    maxHeight: 180,
  },
  sharesList: {
    maxHeight: 150,
  },
  shareItem: {
    marginVertical: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  removeButton: {
    padding: 8,
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loading: {
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
}); 