import { View, Text, Button } from 'react-native';
import { useRouter } from 'expo-router';

export default function Home() {
  const router = useRouter();

  return (
    <View>
      <Text>Awardly</Text>

      <Button title="Entrar" onPress={() => router.push('/(public)/login')} />
      <Button title="Criar conta" onPress={() => router.push('/(public)/cadastro')} />
    </View>
  );
}