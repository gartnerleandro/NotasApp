import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import Auth from '@/components/auth/Auth';
import { useAuth } from '../../context/auth-context';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export default function AuthScreen() {
  const { session, isLoading: loading } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    // Si el usuario está autenticado, redirigir a la página principal
    if (session) {
      router.replace('/');
    }
  }, [session]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  // Si el usuario ya está autenticado, redirigir a la página principal
  if (session) {
    return <Redirect href="/" />;
  }

  return <Auth />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 