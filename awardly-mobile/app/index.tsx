import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import Parse from '../lib/parseClient';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    async function checarLogin() {
      const user = await Parse.User.currentAsync();
      if (user) {
        router.replace('/(autenticado)/(tabs)' as any);
      } else {
        router.replace('/(public)/home' as any);
      }
    }
    checarLogin();
  }, []);

  return null;
}