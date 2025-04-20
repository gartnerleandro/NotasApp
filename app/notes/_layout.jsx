import { Stack } from 'expo-router';

export default function NotesLayout() {
  return (
    <Stack>
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
      <Stack.Screen name="new" options={{ headerShown: false }} />
    </Stack>
  );
} 