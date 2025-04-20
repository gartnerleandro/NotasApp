import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Alert, Text, useColorScheme, ActivityIndicator } from 'react-native';
import { Button, Input } from '@rneui/themed';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

export default function Account() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [username, setUsername] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const colorScheme = useColorScheme() || 'light';
  const colors = Colors[colorScheme];
  const { user, signOut, isLoading } = useAuth();

  useEffect(() => {
    if (user) getProfile();
  }, [user]);

  async function getProfile() {
    try {
      setIsUpdating(true);
      if (!user) throw new Error('No hay usuario en la sesión');

      const { data, error, status } = await supabase
        .from('profiles')
        .select(`username, website, avatar_url`)
        .eq('id', user.id)
        .single();

      if (error && status !== 406) {
        throw error;
      }

      if (data) {
        setUsername(data.username || '');
        setWebsite(data.website || '');
        setAvatarUrl(data.avatar_url || '');
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Error', error.message);
      }
    } finally {
      setIsUpdating(false);
    }
  }

  async function updateProfile() {
    try {
      setIsUpdating(true);
      if (!user) throw new Error('No hay usuario en la sesión');

      const updates = {
        id: user.id,
        username,
        website,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) {
        throw error;
      }
      
      Alert.alert('¡Perfil actualizado!');
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Error al actualizar el perfil', error.message);
      } else {
        Alert.alert('Error', 'Ocurrió un error inesperado al actualizar el perfil');
      }
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Error al cerrar sesión', error.message);
      } else {
        Alert.alert('Error', 'Ocurrió un error inesperado al cerrar sesión');
      }
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Cargando perfil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerContainer}>
        <Text style={[styles.title, { color: colors.text }]}>Mi Perfil</Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>Gestiona tu información personal</Text>
      </View>
      
      <View style={styles.formContainer}>
        <View style={[styles.verticallySpaced, styles.mt20]}>
          <Input
            label="Email"
            value={user?.email || ''}
            disabled
            placeholderTextColor={colors.icon}
            labelStyle={{ color: colors.text }}
            inputStyle={{ color: colors.text }}
            leftIcon={{ type: 'font-awesome', name: 'envelope', color: colors.icon }}
          />
        </View>
        
        <View style={styles.verticallySpaced}>
          <Input
            label="Nombre de usuario"
            value={username || ''}
            onChangeText={setUsername}
            placeholderTextColor={colors.icon}
            labelStyle={{ color: colors.text }}
            inputStyle={{ color: colors.text }}
            leftIcon={{ type: 'font-awesome', name: 'user', color: colors.icon }}
            disabled={isUpdating}
          />
        </View>
        
        <View style={styles.verticallySpaced}>
          <Input
            label="Sitio web"
            value={website || ''}
            onChangeText={setWebsite}
            placeholderTextColor={colors.icon}
            labelStyle={{ color: colors.text }}
            inputStyle={{ color: colors.text }}
            leftIcon={{ type: 'font-awesome', name: 'globe', color: colors.icon }}
            disabled={isUpdating}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>
        
        <View style={[styles.verticallySpaced, styles.mt20]}>
          <Button
            title={isUpdating ? 'Actualizando...' : 'Actualizar Perfil'}
            onPress={updateProfile}
            disabled={isUpdating}
            buttonStyle={{ backgroundColor: colors.tint }}
            titleStyle={{ fontWeight: 'bold' }}
            disabledStyle={{ backgroundColor: colors.icon }}
            icon={{ 
              name: 'save', 
              type: 'font-awesome', 
              color: 'white',
              size: 16,
              style: { marginRight: 8 }
            }}
          />
        </View>
        
        <View style={styles.verticallySpaced}>
          <Button
            title="Cerrar Sesión"
            onPress={handleSignOut}
            buttonStyle={{ backgroundColor: colors.red }}
            titleStyle={{ fontWeight: 'bold' }}
            icon={{ 
              name: 'sign-out', 
              type: 'font-awesome', 
              color: 'white',
              size: 16,
              style: { marginRight: 8 }
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  headerContainer: {
    marginTop: 40,
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
  formContainer: {
    paddingHorizontal: 10,
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: 'stretch',
  },
  mt20: {
    marginTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
}); 