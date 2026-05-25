import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Parse from '../../lib/parseClient';
import FilmesFavoritos, { FilmeFavorito } from '../../components/FilmesFavoritos';
import { getFilme } from '../../lib/tmdb';

const GOLD = '#C9A84C';
const BG = '#0a0906';
const CARD_BG = '#111008';
const BORDER = 'rgba(201,168,76,0.15)';

// ─── Seção com título ────────────────────────────────────────

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={s.secao}>
      <Text style={s.secaoTitulo}>{titulo}</Text>
      <View style={s.secaoBody}>{children}</View>
    </View>
  );
}

// ─── Campo de texto ──────────────────────────────────────────

function Campo({
  label,
  prefix,
  value,
  onChangeText,
  placeholder,
  maxLength,
  multiline,
}: {
  label: string;
  prefix?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
}) {
  return (
    <View style={s.campo}>
      <Text style={s.campoLabel}>{label}</Text>
      <View style={[s.inputWrap, multiline && s.inputWrapMulti]}>
        {prefix ? <Text style={s.inputPrefix}>{prefix}</Text> : null}
        <TextInput
          style={[s.input, prefix && s.inputComPrefix, multiline && s.inputMulti]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.2)"
          maxLength={maxLength}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      {maxLength && multiline ? (
        <Text style={s.contador}>{value.length}/{maxLength}</Text>
      ) : null}
    </View>
  );
}

// ─── Tela principal ──────────────────────────────────────────

export default function ConfiguracoesScreen() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [form, setForm] = useState({ nome: '', bio: '', username: '' });
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  // base64 + nome — o Parse.File no RN aceita { base64 } corretamente
  const [fotoFile, setFotoFile] = useState<{ base64: string; name: string } | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<{ base64: string; name: string } | null>(null);
  const [favoritos, setFavoritos] = useState<FilmeFavorito[]>([]);

  // ── Carrega dados do usuário ──────────────────────────────

  useEffect(() => {
    async function carregar() {
      try {
        const user = await Parse.User.currentAsync();
        if (!user) { router.replace('/(public)/home' as any); return; }
        await user.fetch();
        setUsuario(user);

        setForm({
          nome: user.get('nome') || '',
          bio: user.get('bio') || '',
          username: user.get('username') || '',
        });

        const fotoObj = user.get('foto');
        const fotoUrl = typeof fotoObj?.url === 'function' ? fotoObj.url() : fotoObj?._url || null;
        if (fotoUrl) setFotoPreview(fotoUrl);

        const bannerObj = user.get('banner');
        const bannerUrl = typeof bannerObj?.url === 'function' ? bannerObj.url() : bannerObj?._url || null;
        if (bannerUrl) setBannerPreview(bannerUrl);

        const tmdbIds: (string | number)[] = user.get('favoritos') || [];
        if (tmdbIds.length > 0) {
          const res = await Promise.allSettled(tmdbIds.map((id) => getFilme(id)));
          const lista: FilmeFavorito[] = res
            .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value)
            .map((r) => ({
              objectId: String(r.value.id),
              tmdbId: r.value.id,
              titulo: r.value.title,
              poster_path: r.value.poster_path || null,
            }));
          setFavoritos(lista);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  // ── Picker de imagem ──────────────────────────────────────
  // Parse.File no React Native não aceita { uri } diretamente —
  // precisa de base64. O ImagePicker já entrega via asset.base64.

  async function pickImagem(tipo: 'foto' | 'banner') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Habilite o acesso à galeria nas configurações.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: tipo === 'banner' ? [3, 1] : [1, 1],
      quality: 0.8,
      base64: true, // <- essencial para o Parse.File funcionar no RN
    });

    if (result.canceled) return;
    const asset = result.assets[0];

    if (!asset.base64) {
      Alert.alert('Erro', 'Não foi possível ler a imagem. Tente novamente.');
      return;
    }

    const fileObj = { base64: asset.base64, name: `${tipo}_${Date.now()}.jpg` };

    if (tipo === 'foto') {
      setFotoPreview(asset.uri);
      setFotoFile(fileObj);
    } else {
      setBannerPreview(asset.uri);
      setBannerFile(fileObj);
    }
  }

  // ── Salvar ────────────────────────────────────────────────

  async function handleSalvar() {
    if (!usuario) return;
    setSalvando(true);
    try {
      if (form.nome !== usuario.get('nome')) usuario.set('nome', form.nome);
      if (form.bio !== usuario.get('bio')) usuario.set('bio', form.bio);
      if (form.username !== usuario.get('username')) usuario.set('username', form.username);
      usuario.set('favoritos', favoritos.map((f) => f.tmdbId));

      if (fotoFile) {
        // Parse.File aceita { base64, _base64 } no SDK do RN
        const parseFile = new Parse.File(fotoFile.name, { base64: fotoFile.base64 });
        await parseFile.save();
        usuario.set('foto', parseFile);
      }

      if (bannerFile) {
        const parseFile = new Parse.File(bannerFile.name, { base64: bannerFile.base64 });
        await parseFile.save();
        usuario.set('banner', parseFile);
      }

      await usuario.save();
      Alert.alert('Pronto!', 'Perfil atualizado com sucesso.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  // ── Logout ────────────────────────────────────────────────

  function handleLogout() {
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await Parse.User.logOut();
              router.replace('/(public)/home' as any);
            } catch (e: any) {
              Alert.alert('Erro', e.message || 'Não foi possível sair.');
            }
          },
        },
      ]
    );
  }

  // ── Loading ───────────────────────────────────────────────

  if (carregando) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator color={GOLD} size="large" />
      </View>
    );
  }

  const nomeExibicao = form.nome || form.username || 'Usuário';

  return (
    <View style={s.root}>
      {/* TopBar */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.btnVoltar}>
          <Ionicons name="arrow-back" size={22} color={GOLD} />
        </TouchableOpacity>
        <Text style={s.topBarTitulo}>configurações</Text>
        <TouchableOpacity onPress={handleSalvar} disabled={salvando} style={s.btnSalvarWrap}>
          {salvando
            ? <ActivityIndicator color={GOLD} size="small" />
            : <Text style={s.btnSalvarTxt}>salvar</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Banner ── */}
        <Secao titulo="banner">
          <TouchableOpacity style={s.bannerWrap} onPress={() => pickImagem('banner')} activeOpacity={0.8}>
            {bannerPreview ? (
              <Image source={{ uri: bannerPreview }} style={s.bannerImg} />
            ) : (
              <View style={s.bannerPlaceholder}>
                <Ionicons name="image-outline" size={28} color="rgba(255,255,255,0.2)" />
                <Text style={s.bannerPlaceholderTxt}>toque para adicionar banner</Text>
              </View>
            )}
            <View style={s.bannerOverlay}>
              <Ionicons name="camera-outline" size={18} color="#fff" />
              <Text style={s.overlayTxt}>trocar banner</Text>
            </View>
          </TouchableOpacity>
        </Secao>

        {/* ── Foto de perfil ── */}
        <Secao titulo="foto de perfil">
          <TouchableOpacity style={s.avatarTouchWrap} onPress={() => pickImagem('foto')} activeOpacity={0.8}>
            <View style={s.avatarWrap}>
              {fotoPreview ? (
                <Image source={{ uri: fotoPreview }} style={s.avatar} />
              ) : (
                <View style={s.avatarPlaceholder}>
                  <Text style={s.avatarLetra}>{nomeExibicao[0]?.toUpperCase()}</Text>
                </View>
              )}
              <View style={s.avatarOverlay}>
                <Ionicons name="camera-outline" size={16} color="#fff" />
              </View>
            </View>
            <Text style={s.avatarDica}>toque para trocar a foto</Text>
          </TouchableOpacity>
        </Secao>

        {/* ── Dados pessoais ── */}
        <Secao titulo="dados pessoais">
          <Campo
            label="nome de exibição"
            value={form.nome}
            onChangeText={(v) => setForm({ ...form, nome: v })}
            placeholder="Seu nome"
            maxLength={50}
          />
          <Campo
            label="username"
            prefix="@"
            value={form.username}
            onChangeText={(v) => setForm({ ...form, username: v })}
            placeholder="username"
            maxLength={30}
          />
          <Campo
            label="bio"
            value={form.bio}
            onChangeText={(v) => setForm({ ...form, bio: v })}
            placeholder="Fale um pouco sobre você..."
            maxLength={100}
            multiline
          />
        </Secao>

        {/* ── Filmes favoritos ── */}
        <Secao titulo="filmes favoritos">
          <Text style={s.sublabel}>escolha até 4 filmes do Oscar</Text>
          <FilmesFavoritos valor={favoritos} onChange={setFavoritos} />
        </Secao>

        {/* ── Conta ── */}
        <Secao titulo="conta">
          <TouchableOpacity style={s.btnLogout} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color="#e05252" />
            <Text style={s.btnLogoutTxt}>sair da conta</Text>
          </TouchableOpacity>
        </Secao>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const BANNER_H = 140;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  loadingWrap: { flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  btnVoltar: { padding: 4, marginBottom: -15 },
  topBarTitulo: {
    fontFamily: 'CormorantGaramond-MediumItalic',
    fontSize: 27,
    color: '#fff',
    fontWeight: '300',
    letterSpacing: 0.3,
  },
  btnSalvarWrap: { paddingHorizontal: -12, paddingVertical: -20 },
  btnSalvarTxt: { color: GOLD, fontSize: 14, fontWeight: '600', letterSpacing: 0.3, marginLeft: -10, marginBottom: -15, fontFamily: 'Poppins-Regular'},

  secao: { paddingHorizontal: 20, paddingTop: 24, gap: 12 },
  secaoTitulo: {
    fontFamily: 'CormorantGaramond-MediumItalic',
    fontSize: 23,
    color: '#fff',
    fontWeight: '300',
    letterSpacing: 0.3,
  },
  secaoBody: { gap: 12 },

  bannerWrap: {
    height: BANNER_H,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    position: 'relative',
  },
  bannerImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  bannerPlaceholder: {
    flex: 1,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bannerPlaceholderTxt: { color: 'rgba(255,255,255,0.2)', fontSize: 12 },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  overlayTxt: { color: '#fff', fontSize: 12, fontFamily: 'Poppins-Regular' },

  avatarTouchWrap: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(201,168,76,0.35)',
  },
  avatar: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarPlaceholder: {
    flex: 1,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetra: { color: GOLD, fontSize: 28, fontWeight: '600' },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    paddingVertical: 5,
  },
  avatarDica: { color: 'rgba(255,255,255,0.35)', fontSize: 12, flex: 1, fontFamily: 'Poppins-Regular'},

  campo: { gap: 6 },
  campoLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '500',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    overflow: 'hidden',
  },
  inputWrapMulti: { alignItems: 'flex-start' },
  inputPrefix: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
    paddingLeft: 12,
    paddingRight: 4,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Poppins-Regular',
  },
  inputComPrefix: { paddingLeft: 4 },
  inputMulti: {
    paddingVertical: 10,
    textAlignVertical: 'top',
    minHeight: 72,
  },
  contador: { color: 'rgba(255,255,255,0.2)', fontSize: 11, textAlign: 'right' },
  sublabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11.5,
    fontFamily: 'Poppins-Regular',
    marginTop: -4,
  },

  btnLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(224,82,82,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(224,82,82,0.2)',
    borderRadius: 8,
  },
  btnLogoutTxt: { color: '#e05252', fontSize: 14, fontWeight: '500', letterSpacing: 0.3, fontFamily: 'Poppins-Regular' },
});