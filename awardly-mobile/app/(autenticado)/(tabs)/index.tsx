// (autenticado)/(tabs)/home.tsx
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Parse from '../../../lib/parseClient';
import { getFilme, getImageURL } from '../../../lib/tmdb';

const GOLD = '#C9A84C';
const BG = '#0a0906';
const CARD_BG = '#111008';
const BORDER = 'rgba(201,168,76,0.15)';
const { width: SCREEN_W } = Dimensions.get('window');

const HEADER_H = 72;

const TMDB_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const TMDB_IMAGE = process.env.EXPO_PUBLIC_TMDB_IMAGE_BASE;

const CATEGORIAS_PESSOA = [
  'Melhor Ator', 'Melhor Atriz',
  'Melhor Ator Coadjuvante', 'Melhor Atriz Coadjuvante',
  'Melhor Diretor',
];

// ─── Helpers ────────────────────────────────────────────────

function userPointer(id: string) {
  const u = new Parse.User();
  u.id = id;
  return u;
}

function tempoRelativo(date: Date | string | null): string {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  const sem = Math.floor(d / 7);
  if (min < 60) return `${min} min atrás`;
  if (h < 24) return `${h}h atrás`;
  if (d < 7) return `${d} dia${d > 1 ? 's' : ''} atrás`;
  return `${sem} semana${sem > 1 ? 's' : ''} atrás`;
}

async function buscarAmigosIds(user: any): Promise<string[]> {
  const meuPtr = userPointer(user.id);
  const qSeguindo = new Parse.Query('Follow');
  qSeguindo.equalTo('seguidor', meuPtr);
  qSeguindo.limit(100);
  const qSeguidores = new Parse.Query('Follow');
  qSeguidores.equalTo('seguindo', meuPtr);
  qSeguidores.limit(100);
  const [seguindo, seguidores] = await Promise.all([qSeguindo.find(), qSeguidores.find()]);
  const ids = new Set<string>();
  seguindo.forEach((f: any) => { const id = f.get('seguindo')?.id; if (id) ids.add(id); });
  seguidores.forEach((f: any) => { const id = f.get('seguidor')?.id; if (id) ids.add(id); });
  return [...ids];
}

async function buscarIndicados(anoOscar: number) {
  const Filme = Parse.Object.extend('Filme');
  const query = new Parse.Query(Filme);
  query.equalTo('ano', anoOscar);
  query.equalTo('categorias', 'Melhor Filme');
  query.limit(20);
  const resultados = await query.find();
  return resultados.map((f: any) => ({
    objectId: f.id,
    tmdbId: f.get('tmdbId'),
    titulo: f.get('titulo'),
    vencedor: (f.get('vencedores') || []).includes('Melhor Filme'),
  }));
}

async function buscarFotoPessoa(nome: string): Promise<string | null> {
  if (!nome || !TMDB_KEY) return null;
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/person?api_key=${TMDB_KEY}&query=${encodeURIComponent(nome)}&language=pt-BR`
    );
    const data = await res.json();
    const p = data.results?.[0];
    return p?.profile_path ? `${TMDB_IMAGE}/w185${p.profile_path}` : null;
  } catch { return null; }
}

async function buscarPosterFilmePorTitulo(titulo: string): Promise<string | null> {
  if (!titulo || !TMDB_KEY) return null;
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(titulo)}&language=pt-BR`
    );
    const data = await res.json();
    const f = data.results?.[0];
    return f?.poster_path ? `${TMDB_IMAGE}/w185${f.poster_path}` : null;
  } catch { return null; }
}

function ehCategoriaPessoa(cat: string): boolean {
  return CATEGORIAS_PESSOA.some((c) => cat?.includes(c));
}

// ─── Header animado ──────────────────────────────────────────

function HeaderAwardly({ translateY, topInset }: { translateY: Animated.Value; topInset: number }) {
  const TOTAL_H = topInset + HEADER_H;
  return (
    <Animated.View style={[s.header, { height: TOTAL_H, transform: [{ translateY }] }]}>
      <View style={[s.headerInner, { marginTop: topInset }]}>
        <Image
          source={require('../../../assets/images/oscar2.png')}
          style={s.headerOscar}
        />
        <Text style={s.headerTitulo}>Awardly</Text>
      </View>
    </Animated.View>
  );
}

// ─── Seção: cabeçalho padrão ─────────────────────────────────

function CabecalhoSecao({ subtitulo, titulo }: { subtitulo?: string; titulo: string }) {
  return (
    <View style={s.cabecalhoSecao}>
      {subtitulo ? (
        <Text style={s.subtituloSecao}>{subtitulo}</Text>
      ) : (
        <View style={{ height: 16 }} />
      )}
      <Text style={s.tituloSecao}>{titulo}</Text>
    </View>
  );
}

// ─── Seção: Logs de amigos ───────────────────────────────────

function CardLogAmigo({ log }: { log: any }) {
  const router = useRouter();
  const [detalhes, setDetalhes] = useState<any>(null);

  useEffect(() => {
    getFilme(log.filmeId).then(setDetalhes).catch(console.error);
  }, [log.filmeId]);

  const CARD_W = SCREEN_W * 0.38;
  const CARD_H = CARD_W * 1.5;

  return (
    <TouchableOpacity
      style={[s.cardLog, { width: CARD_W }]}
      onPress={() => router.push(`/(autenticado)/filmes/${log.filmeId}` as any)}
      activeOpacity={0.85}
    >
      <View style={[s.cardLogPoster, { height: CARD_H }]}>
        {detalhes?.poster_path ? (
          <Image
            source={{ uri: getImageURL(detalhes.poster_path, 'w342') ?? undefined}}
            style={s.cardLogImg}
          />
        ) : (
          <View style={s.cardLogSemPoster} />
        )}
        {log.like && (
          <Image
            source={require('../../../assets/images/envelopecoracao.png')}
            style={s.cardLogLike}
          />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(10,9,6,0.85)']}
          style={s.cardLogOverlay}
        >
          <Text style={s.cardLogFilme} numberOfLines={1}>
            {detalhes?.title || '...'}
          </Text>
          <Text style={s.cardLogData}>{log.data}</Text>
        </LinearGradient>
      </View>
      <View style={s.cardLogRodape}>
        <View style={s.cardLogAmigoInfo}>
          {log.fotoAmigo ? (
            <Image source={{ uri: log.fotoAmigo }} style={s.avatarMini} />
          ) : (
            <View style={s.avatarMiniPlaceholder}>
              <Text style={s.avatarMiniLetra}>{(log.nomeAmigo || '?')[0].toUpperCase()}</Text>
            </View>
          )}
          <Text style={s.cardLogAmigoNome} numberOfLines={1}>{log.nomeAmigo}</Text>
        </View>
        {log.estatuetas > 0 && (
          <View style={s.cardLogNota}>
            <Image source={require('../../../assets/images/oscar2.png')} style={s.oscarMini} />
            <Text style={s.cardLogNotaNum}>{log.estatuetas}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function SecaoLogsAmigos({ amigosIds }: { amigosIds: string[] }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (amigosIds.length === 0) { setCarregando(false); return; }
    async function carregar() {
      try {
        const resultado = await Parse.Cloud.run('buscarLogsAmigos', { amigosIds, limite: 4 });
        resultado.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setLogs(resultado.map((l: any) => ({
          ...l,
          data: tempoRelativo(new Date(l.createdAt)),
        })));
      } catch (e) { console.error(e); }
      finally { setCarregando(false); }
    }
    carregar();
  }, [amigosIds.join(',')]);

  if (!carregando && logs.length === 0) return null;

  return (
    <View style={s.secao}>
      <CabecalhoSecao titulo="logs de amigos" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.carrosselContent}
      >
        {carregando
          ? Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={[s.esqueleto, { width: SCREEN_W * 0.38, height: SCREEN_W * 0.38 * 1.5 + 52, borderRadius: 8 }]} />
            ))
          : logs.map((log) => <CardLogAmigo key={log.id} log={log} />)}
      </ScrollView>
    </View>
  );
}

// ─── Seção: Indicados Oscar 2026 ─────────────────────────────

function CardFilme({ tmdbId, titulo, vencedor }: { tmdbId: number; titulo: string; vencedor: boolean }) {
  const router = useRouter();
  const [detalhes, setDetalhes] = useState<any>(null);

  useEffect(() => {
    getFilme(tmdbId).then(setDetalhes).catch(console.error);
  }, [tmdbId]);

  const CARD_W = SCREEN_W * 0.36;
  const CARD_H = CARD_W * 1.5;

  return (
    <TouchableOpacity
      style={[s.cardFilme, vencedor && s.cardFilmeVencedor, { width: CARD_W, height: CARD_H }]}
      onPress={() => router.push(`/(autenticado)/filmes/${tmdbId}` as any)}
      activeOpacity={0.85}
    >
      {detalhes?.poster_path ? (
        <Image
          source={{ uri: getImageURL(detalhes.poster_path, 'w342') ?? undefined }}
          style={s.cardFilmeImg}
        />
      ) : (
        <View style={s.esqueleto} />
      )}
      {vencedor && (
        <View style={s.wrapperOscar}>
          <Text style={s.textoVencedor}>VENCEDOR</Text>
          <Image source={require('../../../assets/images/oscar2.png')} style={s.iconeOscar} />
        </View>
      )}
      <LinearGradient
        colors={['transparent', 'rgba(10,9,6,0.92)']}
        style={s.cardFilmeOverlay}
      >
        <Text style={s.cardFilmeTitulo} numberOfLines={2}>
          {detalhes?.title || titulo}
        </Text>
        {detalhes?.release_date && (
          <Text style={s.cardFilmeAno}>{detalhes.release_date.slice(0, 4)}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

function SecaoFilmes({ ano }: { ano: number }) {
  const [indicados, setIndicados] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    buscarIndicados(ano)
      .then(setIndicados)
      .catch(console.error)
      .finally(() => setCarregando(false));
  }, [ano]);

  return (
    <View style={s.secao}>
      <CabecalhoSecao subtitulo={`oscar ${ano}`} titulo="indicados a melhor filme" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.carrosselContent}
      >
        {carregando
          ? Array.from({ length: 6 }).map((_, i) => (
              <View
                key={i}
                style={[s.esqueleto, { width: SCREEN_W * 0.36, height: SCREEN_W * 0.36 * 1.5, borderRadius: 8 }]}
              />
            ))
          : indicados.map((f) => (
              <CardFilme
                key={f.objectId}
                tmdbId={f.tmdbId}
                titulo={f.titulo}
                vencedor={f.vencedor}
              />
            ))}
      </ScrollView>
    </View>
  );
}

// ─── Seção: Reviews de amigos ────────────────────────────────

function CardReviewAmigo({ review }: { review: any }) {
  const router = useRouter();
  const [detalhes, setDetalhes] = useState<any>(null);

  useEffect(() => {
    getFilme(review.filmeId).then(setDetalhes).catch(console.error);
  }, [review.filmeId]);

  return (
    <TouchableOpacity
      style={s.cardReview}
      onPress={() => router.push(`/(autenticado)/filmes/${review.filmeId}` as any)}
      activeOpacity={0.85}
    >
      {detalhes?.poster_path && (
        <Image
          source={{ uri: getImageURL(detalhes.poster_path, 'w185') ?? undefined }}
          style={s.cardReviewPoster}
        />
      )}
      <View style={s.cardReviewBody}>
        <View style={s.cardReviewTopo}>
          <Text style={s.cardReviewFilme} numberOfLines={1}>
            {detalhes?.title || '...'}
          </Text>
          {review.like && (
            <Image
              source={require('../../../assets/images/envelopecoracao.png')}
              style={s.cardReviewEnvelope}
            />
          )}
        </View>
        {review.estatuetas > 0 && (
          <View style={s.cardReviewNota}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Image
                key={i}
                source={
                  review.estatuetas >= i
                    ? require('../../../assets/images/oscar2.png')
                    : require('../../../assets/images/oscarvazio.png')
                }
                style={[s.oscarMini, { opacity: review.estatuetas >= i ? 1 : 0.3 }]}
              />
            ))}
          </View>
        )}
        <Text style={s.cardReviewTexto} numberOfLines={3}>{review.review}</Text>
        <View style={s.cardReviewRodape}>
          <View style={s.cardLogAmigoInfo}>
            {review.fotoAmigo ? (
              <Image source={{ uri: review.fotoAmigo }} style={s.avatarMini} />
            ) : (
              <View style={s.avatarMiniPlaceholder}>
                <Text style={s.avatarMiniLetra}>{(review.nomeAmigo || '?')[0].toUpperCase()}</Text>
              </View>
            )}
            <Text style={s.cardReviewAmigoNome} numberOfLines={1}>{review.nomeAmigo}</Text>
          </View>
          <Text style={s.cardReviewData}>{review.data}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SecaoReviewsAmigos({ amigosIds }: { amigosIds: string[] }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (amigosIds.length === 0) { setCarregando(false); return; }
    async function carregar() {
      try {
        const resultado = await Parse.Cloud.run('buscarReviewsAmigos', { amigosIds, limite: 4 });
        resultado.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setReviews(resultado.map((l: any) => ({
          ...l,
          data: tempoRelativo(new Date(l.createdAt)),
        })));
      } catch (e) { console.error(e); }
      finally { setCarregando(false); }
    }
    carregar();
  }, [amigosIds.join(',')]);

  if (!carregando && reviews.length === 0) return null;

  return (
    <View style={s.secao}>
      <CabecalhoSecao titulo="últimas reviews de amigos" />
      <View style={s.listaReviews}>
        {carregando
          ? Array.from({ length: 3 }).map((_, i) => (
              <View key={i} style={[s.esqueleto, { height: 120, borderRadius: 8 }]} />
            ))
          : reviews.map((r) => <CardReviewAmigo key={r.id} review={r} />)}
      </View>
    </View>
  );
}

// ─── Seção: Logs de categoria de amigos ──────────────────────

function MiniCardCategoria({ nome, ehPessoa }: { nome: string; ehPessoa: boolean }) {
  const [foto, setFoto] = useState<string | null>(null);

  useEffect(() => {
    if (!nome) return;
    if (ehPessoa) {
      buscarFotoPessoa(nome).then(setFoto).catch(console.error);
    } else {
      buscarPosterFilmePorTitulo(nome).then(setFoto).catch(console.error);
    }
  }, [nome, ehPessoa]);

  return foto ? (
    <Image
      source={{ uri: foto }}
      style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
    />
  ) : (
    <View style={s.miniCatPlaceholder}>
      <Text style={s.miniCatLetra}>{(nome || '?')[0].toUpperCase()}</Text>
    </View>
  );
}

function CardLogCategoriaAmigo({ log }: { log: any }) {
  const router = useRouter();
  const isPessoa = ehCategoriaPessoa(log.categoria);
  const temFotos = log.vencedorReal || log.deveriaTerGanhado || log.queriaQueGanhasse;
 
  const MINI_W = (SCREEN_W - 40 - 32 - 16) / 3;
  const MINI_H = MINI_W * 1.5;
 
  return (
    <View style={s.cardLogCat}>
      <View style={s.cardLogCatHeader}>
        <Text style={s.cardLogCatCategoria} numberOfLines={1}>{log.categoria}</Text>
        <Text style={s.cardLogCatAno}>{log.ano}</Text>
      </View>
 
      {temFotos && (
        <View style={s.cardLogCatFotos}>
          {log.vencedorReal && (
            <View style={[s.miniCatCard, { width: MINI_W }]}>
              <View style={[s.miniCatImg, { height: MINI_H }]}>
                <MiniCardCategoria nome={log.vencedorReal} ehPessoa={isPessoa} />
              </View>
              <Text style={s.miniCatLabel}>venceu</Text>
              <Text style={s.miniCatNome} numberOfLines={2}>{log.vencedorReal}</Text>
            </View>
          )}
          {log.deveriaTerGanhado && (
            <View style={[s.miniCatCard, { width: MINI_W }]}>
              <View style={[s.miniCatImg, { height: MINI_H }]}>
                <MiniCardCategoria nome={log.deveriaTerGanhado} ehPessoa={isPessoa} />
              </View>
              <Text style={s.miniCatLabel}>deveria ter ganhado</Text>
              <Text style={s.miniCatNome} numberOfLines={2}>{log.deveriaTerGanhado}</Text>
            </View>
          )}
          {log.queriaQueGanhasse && (
            <View style={[s.miniCatCard, { width: MINI_W }]}>
              <View style={[s.miniCatImg, { height: MINI_H }]}>
                <MiniCardCategoria nome={log.queriaQueGanhasse} ehPessoa={isPessoa} />
              </View>
              <Text style={s.miniCatLabel}>queria que ganhasse</Text>
              <Text style={s.miniCatNome} numberOfLines={2}>{log.queriaQueGanhasse}</Text>
            </View>
          )}
        </View>
      )}
 
      {log.review && (
        <View style={s.cardLogCatReviewWrap}>
          <View style={s.cardLogCatReviewBarra} />
          <Text style={s.cardLogCatReview} numberOfLines={3}>{log.review}</Text>
        </View>
      )}
 
      <View style={s.cardLogCatRodape}>
        <View style={s.cardLogAmigoInfo}>
          {log.fotoAmigo ? (
            <Image source={{ uri: log.fotoAmigo }} style={s.avatarMini} />
          ) : (
            <View style={s.avatarMiniPlaceholder}>
              <Text style={s.avatarMiniLetra}>{(log.nomeAmigo || '?')[0].toUpperCase()}</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={() => log.usernameAmigo && router.push(`/(autenticado)/perfil/${log.usernameAmigo}` as any)}
            disabled={!log.usernameAmigo}
          >
            <Text style={s.cardLogCatAmigoNome}>{log.nomeAmigo}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function SecaoLogsCategoriaAmigos({ amigosIds }: { amigosIds: string[] }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (amigosIds.length === 0) { setCarregando(false); return; }
    async function carregar() {
      try {
        const resultado = await Parse.Cloud.run('buscarLogsCategoriaAmigos', { amigosIds, limite: 3 });
        setLogs(resultado);
      } catch (e) { console.error(e); }
      finally { setCarregando(false); }
    }
    carregar();
  }, [amigosIds.join(',')]);

  if (!carregando && logs.length === 0) return null;

  return (
    <View style={s.secao}>
      <CabecalhoSecao titulo="logs de categorias de amigos" />
      <View style={s.listaLogsCat}>
        {carregando
          ? Array.from({ length: 2 }).map((_, i) => (
              <View key={i} style={[s.esqueleto, { height: 160, borderRadius: 8 }]} />
            ))
          : logs.map((l) => <CardLogCategoriaAmigo key={l.id} log={l} />)}
      </View>
    </View>
  );
}

// ─── Tela principal ──────────────────────────────────────────

export default function Home() {
  const [amigosIds, setAmigosIds] = useState<string[]>([]);
  const [carregandoAmigos, setCarregandoAmigos] = useState(true);
  const insets = useSafeAreaInsets();
  const TOTAL_HEADER_H = insets.top + HEADER_H;
  const totalHeaderHRef = useRef(TOTAL_HEADER_H);
  useEffect(() => { totalHeaderHRef.current = TOTAL_HEADER_H; }, [TOTAL_HEADER_H]);

  // Header scroll-hide
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const headerTranslateY = useRef(new Animated.Value(0)).current;

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (event: any) => {
        const currentY = event.nativeEvent.contentOffset.y;
        const diff = currentY - lastScrollY.current;
        lastScrollY.current = currentY;

        if (diff > 2 && currentY > totalHeaderHRef.current) {
          // Rolando para baixo — esconde o header
          Animated.spring(headerTranslateY, {
            toValue: -totalHeaderHRef.current,
            useNativeDriver: true,
            overshootClamping: true,
          }).start();
        } else if (diff < -2) {
          // Rolando para cima — mostra o header
          Animated.spring(headerTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            overshootClamping: true,
          }).start();
        }
      },
    }
  );

  useEffect(() => {
    async function init() {
      try {
        const user = await Parse.User.currentAsync();
        if (!user) return;
        await user.fetch();
        const ids = await buscarAmigosIds(user);
        setAmigosIds(ids);
      } catch (e) {
        console.error(e);
      } finally {
        setCarregandoAmigos(false);
      }
    }
    init();
  }, []);

  if (carregandoAmigos) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator color={GOLD} size="large" />
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Header animado */}
      <HeaderAwardly translateY={headerTranslateY} topInset={insets.top} />

      <Animated.ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scrollContent, { paddingTop: TOTAL_HEADER_H + 16 }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Logs de amigos */}
        {amigosIds.length > 0 && (
          <>
            <SecaoLogsAmigos amigosIds={amigosIds} />
            <View style={s.divisor} />
          </>
        )}

        {/* Oscar 2026 */}
        <SecaoFilmes ano={2026} />
        <View style={s.divisor} />

        {/* Reviews de amigos */}
        {amigosIds.length > 0 && (
          <>
            <SecaoReviewsAmigos amigosIds={amigosIds} />
            <View style={s.divisor} />

            {/* Logs de categorias de amigos */}
            <SecaoLogsCategoriaAmigos amigosIds={amigosIds} />
            <View style={s.divisor} />
          </>
        )}

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  loadingWrap: { flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 16 },

  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerInner: {
    height: HEADER_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerOscar: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  headerTitulo: {
    fontFamily: 'CormorantGaramond-MediumItalic',
    fontSize: 33,
    color: '#fff',
    letterSpacing: 0.5,
  },

  // Seção
  secao: { gap: 14 },
  cabecalhoSecao: { paddingHorizontal: 20, gap: 2 },
  subtituloSecao: {
    fontSize: 11,
    color: GOLD,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontFamily: 'Poppins-Regular',
  },
  tituloSecao: {
    fontFamily: 'CormorantGaramond-MediumItalic',
    fontSize: 27,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: 0.3,
  },

  divisor: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 28,
    marginHorizontal: 20,
  },

  carrosselContent: { paddingHorizontal: 20, gap: 10 },

  esqueleto: {
    backgroundColor: '#1a1610',
    flex: 1,
  },

  // Card log de amigo
  cardLog: { gap: 0, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  cardLogPoster: { position: 'relative', width: '100%' },
  cardLogImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardLogSemPoster: { flex: 1, backgroundColor: '#1a1610' },
  cardLogLike: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, resizeMode: 'contain' },
  cardLogOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 8, paddingBottom: 8, paddingTop: 24,
  },
  cardLogFilme: { color: '#fff', fontSize: 11, fontWeight: '600', lineHeight: 14 },
  cardLogData: { color: 'rgba(255,255,255,0.8)', fontSize: 9, marginTop: 2, fontFamily: 'Poppins-Regular' },
  cardLogRodape: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 6, backgroundColor: CARD_BG,
  },
  cardLogAmigoInfo: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, overflow: 'hidden' },
  cardLogAmigoNome: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontFamily: 'Poppins-Regular', flex: 1 },
  cardLogNota: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardLogNotaNum: { color: GOLD, fontSize: 11, fontWeight: '700' },

  // Avatar mini
  avatarMini: { width: 20, height: 20, borderRadius: 10, resizeMode: 'cover' },
  avatarMiniPlaceholder: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#2a2218', alignItems: 'center', justifyContent: 'center',
  },
  avatarMiniLetra: { color: GOLD, fontSize: 9, fontWeight: '700' },

  // Oscar mini
  oscarMini: { width: 12, height: 12, resizeMode: 'contain' },

  // Card filme indicado
  cardFilme: { borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: BORDER, position: 'relative' },
  cardFilmeVencedor: { borderColor: 'rgba(201,168,76,0.5)' },
  cardFilmeImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  wrapperOscar: {
    position: 'absolute', top: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(10,9,6,0.85)', borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 3,
  },
  textoVencedor: { color: GOLD, fontSize: 8, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  iconeOscar: { width: 10, height: 10, resizeMode: 'contain' },
  cardFilmeOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 8, paddingBottom: 8, paddingTop: 28,
  },
  cardFilmeTitulo: { color: '#fff', fontSize: 11, fontWeight: '600', lineHeight: 14 },
  cardFilmeAno: { color: 'rgba(255,255,255,0.8)', fontSize: 9, marginTop: 2, fontFamily: 'Poppins-Regular' },

  // Card review de amigo
  listaReviews: { paddingHorizontal: 20, gap: 12 },
  cardReview: {
    flexDirection: 'row', gap: 12,
    backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER,
    borderRadius: 8, overflow: 'hidden',
  },
  cardReviewPoster: { width: 72, height: 108, resizeMode: 'cover' },
  cardReviewBody: { flex: 1, padding: 10, gap: 6, justifyContent: 'space-between' },
  cardReviewTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 },
  cardReviewFilme: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1, fontFamily: 'serif' },
  cardReviewEnvelope: { width: 16, height: 16, resizeMode: 'contain' },
  cardReviewNota: { flexDirection: 'row', gap: 2 },
  cardReviewTexto: { color: 'rgba(255,255,255,0.5)', fontSize: 11, lineHeight: 16, fontStyle: 'italic', flex: 1 },
  cardReviewRodape: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardReviewAmigoNome: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: 'Poppins-Regular', flex: 1 },
  cardReviewData: { color: 'rgba(255,255,255,0.25)', fontSize: 9, fontFamily: 'Poppins-Regular' },

  // Card log categoria
  listaLogsCat: { paddingHorizontal: 20, gap: 12 },
  cardLogCat: {
    backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER,
    borderRadius: 8, padding: 14, gap: 12,
  },
  cardLogCatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLogCatCategoria: {
    color: '#fff', fontSize: 15, fontFamily: 'serif',
    fontStyle: 'italic', fontWeight: '400', flex: 1, marginRight: 8,
  },
  cardLogCatAno: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontFamily: 'serif' },
  cardLogCatFotos: { flexDirection: 'row', gap: 8 },
  miniCatCard: { gap: 5, alignItems: 'flex-start' },
  miniCatImg: { width: '100%', borderRadius: 4, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  miniCatPlaceholder: {
    flex: 1, backgroundColor: '#1a1712',
    alignItems: 'center', justifyContent: 'center',
  },
  miniCatLetra: { color: 'rgba(255,255,255,0.2)', fontSize: 20, fontFamily: 'serif' },
  miniCatLabel: {
    fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.3)', fontFamily: 'Poppins-Regular',
  },
  miniCatNome: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600', lineHeight: 14 },
  cardLogCatReviewWrap: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  cardLogCatReviewBarra: { width: 2, backgroundColor: BORDER, borderRadius: 1, alignSelf: 'stretch' },
  cardLogCatReview: { color: 'rgba(255,255,255,0.4)', fontSize: 12, lineHeight: 18, fontStyle: 'italic', flex: 1 },
  cardLogCatRodape: { marginTop: 4 },
  cardLogCatAmigoNome: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: 'Poppins-Regular' },
});