import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0C0C0E' }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0C0C0E' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="dashboard" options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen 
          name="log-income" 
          options={{ 
            presentation: 'modal',
            headerShown: false,
            animation: 'slide_from_bottom',
          }} 
        />
        <Stack.Screen 
          name="log-expense" 
          options={{ 
            presentation: 'modal',
            headerShown: false,
            animation: 'slide_from_bottom',
          }} 
        />
        <Stack.Screen 
          name="bucket/[id]" 
          options={{ 
            headerShown: false,
            animation: 'slide_from_right',
          }} 
        />
      </Stack>
    </View>
  );
}
