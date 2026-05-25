import { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Parse from '../../../lib/parseClient';

export default function Cadastro() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');

  async function handleCadastro() {
    try {
      const user = new Parse.User();
      user.set('username', email);
      user.set('email', email);
      user.set('password', senha);
      user.set('nome', nome);
      await user.signUp();
      router.replace('/(autenticado)/(tabs)');
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    }
  }

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <Text>Nome</Text>
      <TextInput
        value={nome}
        onChangeText={setNome}
        style={{ borderWidth: 1, marginBottom: 12, padding: 8 }}
      />

      <Text>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth: 1, marginBottom: 12, padding: 8 }}
      />

      <Text>Senha</Text>
      <TextInput
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
        style={{ borderWidth: 1, marginBottom: 12, padding: 8 }}
      />

      <Button title="Cadastrar" onPress={handleCadastro} />
      <Button title="Já tenho conta" onPress={() => router.push('/(public)/login')} />
    </View>
  );
}