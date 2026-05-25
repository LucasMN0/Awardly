import { View, Text, Button } from 'react-native';
import { useRouter } from 'expo-router';

export default function Home() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Bem-vindo ao Awardly!</Text>
      <Text>Descubra e acompanhe os melhores filmes e atores.</Text>

      <Button title="Entrar" onPress={() => router.push('/(public)/login')} />
      <Button title="Criar conta" onPress={() => router.push('/(public)/cadastro')} />
    </View>
  );
}