import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0a0906' }, 
        animation: 'slide_from_right', 
      }}
    />
  );
}