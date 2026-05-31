import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Parse from '../../../lib/parseClient';

export default function Cadastro() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [error, setError] = useState('');

  async function handleCadastro() {
    try {
      setError('');
      const user = new Parse.User();
      user.set('username', email);
      user.set('email', email);
      user.set('password', senha);
      user.set('nome', nome);
      await user.signUp();
      router.replace('/(autenticado)/(tabs)');
    } catch (e: any) {
      setError(e.message);
      Alert.alert('Erro', e.message);
    }
  }

  return (
    <View style={styles.page}>
      <View style={styles.container}>
        <Text style={styles.title}>Cadastro</Text>

        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={styles.input}
              placeholderTextColor="rgba(255, 255, 255, 0.35)"
              placeholder="Seu nome completo"
              value={nome}
              onChangeText={setNome}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholderTextColor="rgba(255, 255, 255, 0.35)"
              placeholder="seu@email.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              placeholderTextColor="rgba(255, 255, 255, 0.35)"
              placeholder="••••••••"
              value={senha}
              onChangeText={setSenha}
              secureTextEntry
            />
          </View>

          {error ? <Text style={styles.message}>{error}</Text> : <View style={styles.message} />}

          <TouchableOpacity style={styles.btnPrimary} onPress={handleCadastro}>
            <Text style={styles.btnPrimaryText}>Cadastrar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnSecondary} onPress={() => router.push('/(public)/login')}>
            <Text style={styles.btnSecondaryText}>Já tenho conta</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    width: '100%',
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: 'rgba(10, 10, 10, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 0, 0.2)',
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 48,
    gap: 12,
  },
  title: {
    color: '#FFD000',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  form: {
    gap: 12,
    width: '100%',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 0, 0.3)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: '#ffffff',
    fontSize: 15.2,
    width: '100%',
    fontFamily: 'Poppins',
  },
  inputPlaceholder: {
    color: 'rgba(255, 255, 255, 0.35)',
  },
  btnPrimary: {
    backgroundColor: '#FFD000',
    borderRadius: 8,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
  },
  btnPrimaryText: {
    color: '#0a0a0a',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  btnSecondary: {
    borderWidth: 1,
    borderColor: '#FFD000',
    borderRadius: 8,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  btnSecondaryText: {
    color: '#FFD000',
    fontSize: 14,
    fontWeight: '600',
  },
  btnGhost: {
    marginTop: 8,
  },
  btnGhostText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13.6,
    textAlign: 'center',
  },
  message: {
    color: '#DC143C',
    fontSize: 13.6,
    minHeight: 20,
    textAlign: 'center',
  },
  label: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    gap: 4,
  },
});