import React from 'react';
import { StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface FloatingButtonProps {
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  style?: object;
}

export function FloatingButton({ 
  icon = 'add', 
  onPress, 
  style 
}: FloatingButtonProps) {
  const colorScheme = useColorScheme() || 'light';
  const colors = Colors[colorScheme];

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { 
          backgroundColor: colors.fabBackground,
          shadowColor: colorScheme === 'dark' ? '#000' : 'rgba(0,0,0,0.5)',
        },
        style
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons 
        name={icon} 
        size={24} 
        color={colors.fabIcon} 
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
}); 