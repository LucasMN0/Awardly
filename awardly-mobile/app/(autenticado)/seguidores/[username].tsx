import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Parse from '../../../lib/parseClient';

// ─── Constantes ───────────────────────────────────────────────
const GOLD = '#C9A84C';
const BG = '#0a0906';
const CARD_BG = '#111008';
const BORDER = 'rgba(201,168,76,0.15)';

// ─── Tipos ────────────────────────────────────────────────────
interface UsuarioItem {
  objectId: string;
  username: string;
  nome: string | null;
  bio: string | null;
  foto: string | null;
}

// ─── Helper ───────────────────────────────────────────────────
function userPointer(userId: string) {
  const u = new Parse.User();
  u.id = userId;
  return u;
}

// ─── CardUsuario ──────────────────────────────────────────────
function CardUsuario({
  usuario,
  usuarioLogado,
}: {
  usuario: UsuarioItem;
  usuarioLogado: any;
}) {
  const router = useRouter();
  const [seguindo, setSeguindo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const ehEuMesmo = usuarioLogado?.id === usuario.objectId;

  useEffect(() => {
    if (!usuarioLogado || ehEuMesmo) return;
    async function verificar() {
      const q = new Parse.Query('Follow');
      q.equalTo('seguidor', usuarioLogado);
      q.equalTo('seguindo', userPointer(usuario.objectId));
      const existe = await q.first();
      setSeguindo(!!existe);
    }
    verificar();
  }, [usuario.objectId, usuarioLogado, ehEuMesmo]);

  async function handleToggleFollow() {
    if (!usuarioLogado || salvando) return;
    setSalvando(true);
    const alvoPtr = userPointer(usuario.objectId);
    try {
      if (seguindo) {
        const q = new Parse.Query('Follow');
        q.equalTo('seguidor', usuarioLogado);
        q.equalTo('seguindo', alvoPtr);
        const existe = await q.first();
        if (existe) await existe.destroy();
        setSeguindo(false);
      } else {
        const Follow = Parse.Object.extend('Follow');
        const novoFollow = new Follow();
        novoFollow.set('seguidor', usuarioLogado);
        novoFollow.set('seguindo', alvoPtr);
        const acl = new Parse.ACL();
        acl.setPublicReadAccess(true);
        acl.setWriteAccess(usuarioLogado.id, true);
        novoFollow.setACL(acl);
        await novoFollow.save();
        setSeguindo(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSalvando(false);
    }
  }

  const nomeExibido = usuario.nome || usuario.username;
  const inicial = (nomeExibido || '?')[0].toUpperCase();

  return (
    <TouchableOpacity
      style={s.card}
      activeOpacity={0.75}
      onPress={() => {
        if (ehEuMesmo) {
          // Usa navigate apontando direto para a aba de perfil própria
          router.navigate('/(autenticado)/perfil' as any);
        } else {
          // CORREÇÃO CRÍTICA: Passando o objeto com pathname explícito para forçar a saída
          // do contexto de 'seguidores' e entrar na stack de 'perfil públicos'
          router.navigate({
            pathname: '/(autenticado)/perfil/[username]',
            params: { username: usuario.username }
          } as any);
        }
      }}
    >
      {/* Avatar */}
      <View style={s.cardAvatar}>
        {usuario.foto ? (
          <Image source={{ uri: usuario.foto }} style={s.cardFoto} />
        ) : (
          <View style={s.cardAvatarPlaceholder}>
            <Text style={s.cardAvatarLetra}>{inicial}</Text>
          </View>
        )}
      </View>

      {/* Textos */}
      <View style={s.cardTexto}>
        <Text style={s.cardNome} numberOfLines={1}>{nomeExibido}</Text>
        {usuario.nome && usuario.username && (
          <Text style={s.cardUsername} numberOfLines={1}>@{usuario.username}</Text>
        )}
        {usuario.bio ? (
          <Text style={s.cardBio} numberOfLines={2}>{usuario.bio}</Text>
        ) : null}
      </View>

      {/* Botão seguir/seguindo */}
      {usuarioLogado && !ehEuMesmo && (
        <TouchableOpacity
          style={[s.btnSeguir, seguindo && s.btnSeguindo]}
          onPress={handleToggleFollow}
          disabled={salvando}
          activeOpacity={0.7}
        >
          <Text style={[s.btnSeguirTxt, seguindo && s.btnSeguindoTxt]}>
            {salvando ? '...' : seguindo ? 'seguindo' : 'seguir'}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ─── Tela principal ───────────────────────────────────────────
export default function PaginaSeguidores() {
  const { username, aba: abaParam } = useLocalSearchParams<{
    username: string;
    aba?: string;
  }>();
  const router = useRouter();

  const [aba, setAba] = useState<'seguidores' | 'seguindo'>(
    abaParam === 'seguindo' ? 'seguindo' : 'seguidores'
  );
  const [nomeAlvo, setNomeAlvo] = useState('');
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null);
  const [lista, setLista] = useState<UsuarioItem[]>([]);
  const [carregando, setCarregando] = useState(true);

    const carregar = useCallback(async () => {
    setCarregando(true);
    try {
        const logado = await Parse.User.currentAsync();
        if (logado) {
        // REMOVE essa linha: await logado.fetch();
        setUsuarioLogado(logado);
        }

        const dados = await Parse.Cloud.run('buscarUsuarioPorUsername', { username });
        setNomeAlvo(dados?.nome || dados?.username || 'Usuário');

        const sessionToken = logado?.getSessionToken();
        const response = await fetch(`${process.env.EXPO_PUBLIC_PARSE_SERVER_URL}/functions/buscarSeguidores`, {
        method: 'POST',
        headers: {
            'X-Parse-Application-Id': process.env.EXPO_PUBLIC_PARSE_APP_ID!,
            'X-Parse-JavaScript-Key': process.env.EXPO_PUBLIC_PARSE_JS_KEY!,
            'X-Parse-Session-Token': sessionToken || '',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: dados.objectId, aba }),
        });
        const json = await response.json();
        setLista(json.result || []);

    } catch (e) {
        console.error('[Seguidores] erro:', e);
    } finally {
        setCarregando(false);
    }
    }, [username, aba]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function mudarAba(novaAba: 'seguidores' | 'seguindo') {
    setAba(novaAba);
  }

  return (
    <View style={s.root}>
      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity
          onPress={() => router.back()} // CORREÇÃO CRÍTICA: Deixa apenas o back nativo aqui
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={GOLD} />
        </TouchableOpacity>
        <Text style={s.topBarNome} numberOfLines={1}>{nomeAlvo}</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Abas */}
      <View style={s.abas}>
        <TouchableOpacity
          style={[s.aba, aba === 'seguidores' && s.abaAtiva]}
          onPress={() => mudarAba('seguidores')}
        >
          <Text style={[s.abaTxt, aba === 'seguidores' && s.abaTxtAtiva]}>
            seguidores
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.aba, aba === 'seguindo' && s.abaAtiva]}
          onPress={() => mudarAba('seguindo')}
        >
          <Text style={[s.abaTxt, aba === 'seguindo' && s.abaTxtAtiva]}>
            seguindo
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      {carregando ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color={GOLD} size="large" />
        </View>
      ) : lista.length === 0 ? (
        <View style={s.loadingWrap}>
          <Text style={s.vazio}>
            {aba === 'seguidores'
              ? 'Nenhum seguidor ainda.'
              : 'Não está seguindo ninguém ainda.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {lista.map((u) => (
            <CardUsuario key={u.objectId} usuario={u} usuarioLogado={usuarioLogado} />
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: BG,
  },
  topBarNome: {
    fontFamily: 'serif',
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  abas: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  aba: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  abaAtiva: { borderBottomColor: GOLD },
  abaTxt: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'lowercase',
    letterSpacing: 0.5,
    fontFamily: 'Poppins-Regular',
  },
  abaTxtAtiva: { color: GOLD },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  vazio: {
    color: 'rgba(255,255,255,0.3)',
    fontStyle: 'italic',
    fontSize: 14,
    textAlign: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingVertical: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 12,
  },
  cardAvatar: { width: 46, height: 46 },
  cardFoto: { width: 46, height: 46, borderRadius: 23 },
  cardAvatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAvatarLetra: { color: GOLD, fontSize: 18, fontWeight: '600' },
  cardTexto: { flex: 1, gap: 2 },
  cardNome: { color: '#fff', fontSize: 14, fontWeight: '600' },
  cardUsername: { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontFamily: 'Poppins-Regular' },
  cardBio: { color: 'rgba(255,255,255,0.4)', fontSize: 12, lineHeight: 16, fontFamily: 'Poppins-Regular' },
  btnSeguir: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: GOLD,
    backgroundColor: 'transparent',
  },
  btnSeguindo: {
    borderColor: 'rgba(201,168,76,0.3)',
    backgroundColor: 'rgba(201,168,76,0.08)',
  },
  btnSeguirTxt: { color: GOLD, fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  btnSeguindoTxt: { color: 'rgba(201,168,76,0.6)' },
});