import React, { useState } from 'react';
import { Alert, StyleSheet, View, Text, useColorScheme, ActivityIndicator } from 'react-native';
import { Button, Input } from '@rneui/themed';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth-context';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const { signIn, signUp, isLoading } = useAuth();
  const colorScheme = useColorScheme() || 'light';
  const colors = Colors[colorScheme];

  async function handleSignIn() {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor ingresa tu correo y contraseña');
      return;
    }

    try {
      await signIn(email, password);
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Error al iniciar sesión', error.message);
      } else {
        Alert.alert('Error', 'Ocurrió un error inesperado al iniciar sesión');
      }
    }
  }

  async function handleSignUp() {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor ingresa tu correo y contraseña');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      await signUp(email, password);
      Alert.alert('Éxito', 'Cuenta creada correctamente. Verifica tu correo para completar el registro.');
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Error al registrarse', error.message);
      } else {
        Alert.alert('Error', 'Ocurrió un error inesperado al registrarse');
      }
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerContainer}>
        <Text style={[styles.title, { color: colors.text }]}>Notas App</Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>
          {isSigningUp ? 'Regístrate para comenzar' : 'Inicia sesión para continuar'}
        </Text>
      </View>
      
      <View style={styles.formContainer}>
        <View style={[styles.verticallySpaced, styles.mt20]}>
          <Input
            label="Email"
            leftIcon={{ type: 'font-awesome', name: 'envelope', color: colors.icon }}
            onChangeText={setEmail}
            value={email}
            placeholder="correo@ejemplo.com"
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor={colors.icon}
            labelStyle={{ color: colors.text }}
            inputStyle={{ color: colors.text }}
            disabled={isLoading}
            autoComplete="email"
          />
        </View>
        
        <View style={styles.verticallySpaced}>
          <Input
            label="Contraseña"
            leftIcon={{ type: 'font-awesome', name: 'lock', color: colors.icon }}
            onChangeText={setPassword}
            value={password}
            secureTextEntry={true}
            placeholder="Contraseña"
            autoCapitalize="none"
            placeholderTextColor={colors.icon}
            labelStyle={{ color: colors.text }}
            inputStyle={{ color: colors.text }}
            disabled={isLoading}
            autoComplete={isSigningUp ? "password-new" : "password"}
          />
        </View>
        
        {isLoading ? (
          <View style={[styles.verticallySpaced, styles.mt20, styles.loadingContainer]}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : (
          <>
            {isSigningUp ? (
              <>
                <View style={[styles.verticallySpaced, styles.mt20]}>
                  <Button 
                    title="Registrarse" 
                    onPress={handleSignUp}
                    buttonStyle={{ backgroundColor: colors.tint }}
                    titleStyle={{ fontWeight: 'bold' }}
                  />
                </View>
                
                <View style={styles.verticallySpaced}>
                  <Button 
                    title="¿Ya tienes cuenta? Inicia sesión" 
                    type="clear"
                    onPress={() => setIsSigningUp(false)}
                    titleStyle={{ color: colors.tint }}
                  />
                </View>
              </>
            ) : (
              <>
                <View style={[styles.verticallySpaced, styles.mt20]}>
                  <Button 
                    title="Iniciar sesión" 
                    onPress={handleSignIn}
                    buttonStyle={{ backgroundColor: colors.tint }}
                    titleStyle={{ fontWeight: 'bold' }}
                  />
                </View>
                
                <View style={styles.verticallySpaced}>
                  <Button 
                    title="¿No tienes cuenta? Regístrate" 
                    type="clear"
                    onPress={() => setIsSigningUp(true)}
                    titleStyle={{ color: colors.tint }}
                  />
                </View>
              </>
            )}
          </>
        )}
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
    marginTop: 60,
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
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
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
  },
}); 