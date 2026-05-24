// lib/parseClient.ts
// No Next.js havia o guard `typeof window !== 'undefined'` porque
// o código rodava no servidor também. No React Native isso não existe —
// o código sempre roda no cliente, então inicializamos direto.
//
// Variáveis de ambiente: troque NEXT_PUBLIC_ por EXPO_PUBLIC_ no seu .env
// Exemplo de .env:
//   EXPO_PUBLIC_PARSE_APP_ID=sua_app_id
//   EXPO_PUBLIC_PARSE_JS_KEY=sua_js_key
//   EXPO_PUBLIC_PARSE_SERVER_URL=https://parseapi.back4app.com

import Parse from 'parse/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

Parse.setAsyncStorage(AsyncStorage);

Parse.initialize(
  process.env.EXPO_PUBLIC_PARSE_APP_ID!,
  process.env.EXPO_PUBLIC_PARSE_JS_KEY!
);

Parse.serverURL =
  process.env.EXPO_PUBLIC_PARSE_SERVER_URL || 'https://parseapi.back4app.com';

export default Parse;

// Dependências necessárias:
// npx expo install parse @react-native-async-storage/async-storage