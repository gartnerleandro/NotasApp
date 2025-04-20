import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';

interface NoteCardProps {
  title: string;
  content: string;
  date: string;
  onPress: () => void;
}

export function NoteCard({ title, content, date, onPress }: NoteCardProps) {
  const colorScheme = useColorScheme() || 'light';
  const colors = Colors[colorScheme];

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { 
          backgroundColor: colors.noteBackground,
          borderColor: colors.noteBorder,
        }
      ]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.contentContainer}>
        <Text style={[styles.date, { color: colors.noteDate }]}>
          {date}
        </Text>
        <Text style={[styles.content, { color: colors.text }]} numberOfLines={2}>
          {content}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  date: {
    fontSize: 12,
    marginRight: 8,
    marginTop: 2,
  },
  content: {
    fontSize: 15,
    flex: 1,
    opacity: 0.8,
  },
}); 