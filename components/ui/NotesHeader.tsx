import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NotesHeaderProps {
  title: string;
  count?: number;
  onEditPress?: () => void;
}

export function NotesHeader({ title, count, onEditPress }: NotesHeaderProps) {
  const colorScheme = useColorScheme() || 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  return (
    <View 
      style={[
        styles.container, 
        { 
          backgroundColor: colors.headerBackground,
          paddingTop: insets.top + 10,
        }
      ]}
    >
      <View style={styles.contentContainer}>
        {count !== undefined && (
          <Text style={[styles.count, { color: colors.noteDate }]}>
            {count} {count === 1 ? 'nota' : 'notas'}
          </Text>
        )}
        <Text style={[styles.title, { color: colors.text }]}>
          {title}
        </Text>
        {onEditPress && (
          <TouchableOpacity 
            style={styles.editButton} 
            onPress={onEditPress}
            activeOpacity={0.7}
          >
            <Text style={[styles.editText, { color: colors.tint }]}>
              Editar
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 5,
  },
  count: {
    fontSize: 16,
    marginBottom: 3,
  },
  editButton: {
    position: 'absolute',
    right: 16,
    bottom: 10,
  },
  editText: {
    fontSize: 17,
  },
}); 