import { useColorScheme } from '../hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="HomeScreen" />
        <Stack.Screen name="ChatbotScreen" />
        <Stack.Screen name="HealthProfileViewScreen" />.
        <Stack.Screen name="HealthFormScreen" />
        <Stack.Screen name="HealthConditionScreen" />
        <Stack.Screen name="AllergyScreen" />
        <Stack.Screen name="HealthGoalScreen" />
        <Stack.Screen name="ScanProductScreen" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
