import { Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import { AppDarkTheme, AppLightTheme } from '@/constants/theme';
import { store, persistor } from '@/store';

// Root navigator. Native tabs live in the `(tabs)` group; `new` is presented as
// a form sheet over the tabs. Wrapping everything in ThemeProvider keeps headers
// from flickering when switching tabs (Expo native-tabs common issue).
export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider value={colorScheme === 'dark' ? AppDarkTheme : AppLightTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="new"
              options={{
                presentation: 'formSheet',
                headerShown: true,
                title: 'New Task',
                sheetGrabberVisible: true,
                sheetAllowedDetents: [0.4, 1.0],
              }}
            />
          </Stack>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
}
