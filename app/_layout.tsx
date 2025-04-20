import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

// Importar primero las bibliotecas de animación
import 'react-native-gesture-handler';
import 'react-native-reanimated';

import { NotesProvider } from '../context/notes-context';
import { AuthProvider } from '../context/auth-context';
import { useColorScheme } from '@/hooks/useColorScheme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { Provider as PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  const theme = colorScheme === 'dark' ? {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: Colors.dark.tint,
      background: Colors.dark.background,
      card: Colors.dark.headerBackground,
      text: Colors.dark.text,
      border: Colors.dark.noteBorder,
    },
  } : {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: Colors.light.tint,
      background: Colors.light.background,
      card: Colors.light.headerBackground,
      text: Colors.light.text,
      border: Colors.light.noteBorder,
    },
  };

  // Usar los temas base de MD3 para PaperProvider
  const paperTheme = colorScheme === 'dark' 
    ? {
        ...MD3DarkTheme,
        colors: {
          ...MD3DarkTheme.colors,
          primary: Colors.dark.tint,
          secondary: Colors.dark.orange,
          background: Colors.dark.background,
          surface: Colors.dark.background,
          text: Colors.dark.text,
          error: Colors.dark.red,
        }
      } 
    : {
        ...MD3LightTheme,
        colors: {
          ...MD3LightTheme.colors,
          primary: Colors.light.tint,
          secondary: Colors.light.orange,
          background: Colors.light.background,
          surface: Colors.light.background,
          text: Colors.light.text,
          error: Colors.light.red,
        }
      };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NotesProvider>
            <PaperProvider theme={paperTheme}>
              <ThemeProvider value={theme}>
                <Stack screenOptions={{
                  headerShown: false,
                  contentStyle: { 
                    backgroundColor: colorScheme === 'dark' ? Colors.dark.background : Colors.light.background 
                  },
                }}>
                  <Stack.Screen name="auth" options={{ headerShown: false }} />
                  <Stack.Screen name="notes" options={{ headerShown: false }} />
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                  <Stack.Screen name="+not-found" />
                </Stack>
                <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
              </ThemeProvider>
            </PaperProvider>
          </NotesProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
