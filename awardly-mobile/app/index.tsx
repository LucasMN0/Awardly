import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import Parse from '../lib/parseClient';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    async function checarLogin() {
      try {
        const user = await Parse.User.currentAsync();
        if (user) {
          router.replace('/(autenticado)/(tabs)' as any);
        } else {
          router.replace('/(public)/home' as any);
        }
      } catch {
        router.replace('/(public)/home' as any);
      }
    }
    checarLogin();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0906', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color="#c9a84c" size="large" />
    </View>
  );
}