import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Parse from '../../../lib/parseClient';

// ─── Constantes ───────────────────────────────────────────────

const GOLD = '#C9A84C';
const GOLD10 = 'rgba(201,168,76,0.10)';
const GOLD30 = 'rgba(201,168,76,0.30)';
const BG = '#0a0906';
const CARD_BG = '#111008';
const BORDER = 'rgba(201,168,76,0.15)';
const WHITE45 = 'rgba(255,255,255,0.45)';
const WHITE35 = 'rgba(255,255,255,0.35)';
const WHITE15 = 'rgba(255,255,255,0.15)';

const TMDB_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const TMDB_IMAGE = process.env.EXPO_PUBLIC_TMDB_IMAGE_BASE;

const CATEGORIAS_PESSOA = [
  'Melhor Ator',
  'Melhor Atriz',
  'Melhor Ator Coadjuvante',
  'Melhor Atriz Coadjuvante',
  'Melhor Diretor',
];

// ─── Tipos ────────────────────────────────────────────────────

interface ReviewFilme {
  id: string;
  filme: any;
  estatuetas: number;
  like: boolean;
  review: string;
  data: string;
}

interface ReviewCategoria {
  id: string;
  categoria: string;
  ano: number;
  vencedorReal: string | null;
  deveriaTerGanhado: string | null;
  queriaQueGanhasse: string | null;
  review: string;
  data: string;
  fotoVencedor: string | null;
  fotoDeveria: string | null;
  fotoQueria: string | null;
}

type TipoFiltro = 'todos' | 'filmes' | 'categorias';

// ─── Helpers TMDB ─────────────────────────────────────────────

async function getFilme(tmdbId: string | number) {
  if (!tmdbId || !TMDB_KEY) return null;
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_KEY}&language=pt-BR`
    );
    return await res.json();
  } catch { return null; }
}

function getImageURL(path: string | null, size = 'w185'): string | null {
  if (!path || !TMDB_IMAGE) return null;
  return `${TMDB_IMAGE}/${size}${path}`;
}

async function fetchFotoPessoa(nome: string): Promise<string | null> {
  if (!nome || !TMDB_KEY) return null;
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/person?api_key=${TMDB_KEY}&query=${encodeURIComponent(nome)}&language=pt-BR`
    );
    const data = await res.json();
    const person = data.results?.[0];
    return person?.profile_path ? `${TMDB_IMAGE}/w185${person.profile_path}` : null;
  } catch { return null; }
}

async function fetchPosterFilme(tmdbId: string | number): Promise<string | null> {
  if (!tmdbId || !TMDB_KEY) return null;
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_KEY}&language=pt-BR`
    );
    const data = await res.json();
    return data?.poster_path ? `${TMDB_IMAGE}/w342${data.poster_path}` : null;
  } catch { return null; }
}

async function fetchTmdbIdViaBusca(titulo: string): Promise<string | number | undefined> {
  if (!titulo || !TMDB_KEY) return undefined;
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(titulo)}&language=pt-BR`
    );
    const data = await res.json();
    return data.results?.[0]?.id;
  } catch { return undefined; }
}

async function fetchFotoParaEntrada(
  nome: string | null,
  categoria: string,
  ano: number
): Promise<string | null> {
  if (!nome) return null;
  if (CATEGORIAS_PESSOA.includes(categoria)) return fetchFotoPessoa(nome);
  // Para filmes: busca no Parse, com fallback no TMDB search
  try {
    const q = new Parse.Query('Filme');
    q.equalTo('ano', ano);
    q.equalTo('categorias', categoria);
    q.limit(20);
    const results = await q.find();
    const match = results.find((f: any) => f.get('titulo') === nome);
    const tmdbId = match?.get('tmdbId') ?? await fetchTmdbIdViaBusca(nome);
    if (tmdbId) return fetchPosterFilme(tmdbId);
  } catch { /* fallback */ }
  const tmdbId = await fetchTmdbIdViaBusca(nome);
  if (tmdbId) return fetchPosterFilme(tmdbId);
  return null;
}

function tempoRelativo(date?: Date | null): string {
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

// ─── Estatuetas ───────────────────────────────────────────────

function Estatuetas({ valor }: { valor: number }) {
  return (
    <View style={s.estatuetasRow}>
      {[1, 2, 3, 4, 5].map((i) => {
        const cheia = valor >= i;
        const meia = !cheia && valor >= i - 0.5;
        return (
          <View key={i} style={s.estatuetaSlot}>
            {cheia ? (
              <Image
                source={require('../../../assets/images/oscar2.png')}
                style={s.estatuetaImg}
              />
            ) : meia ? (
              <Image
                source={require('../../../assets/images/oscar2.png')}
                style={[s.estatuetaImg, { opacity: 0.4 }]}
              />
            ) : (
              <Image
                source={require('../../../assets/images/oscar2.png')}
                style={[s.estatuetaImg, { opacity: 0.15 }]}
              />
            )}
          </View>
        );
      })}
      {valor > 0 && <Text style={s.estatuetaValor}>{valor}</Text>}
    </View>
  );
}

// ─── FotoSlot (igual ao PerfilCategorias) ─────────────────────

function FotoSlot({
  foto,
  nome,
  label,
  destaque,
  ehPessoa,
}: {
  foto: string | null;
  nome: string | null;
  label: string;
  destaque?: boolean;
  ehPessoa: boolean;
}) {
  return (
    <View style={s.fotoSlotWrap}>
      <View
        style={[
          s.fotoSlot,
          ehPessoa ? s.fotoSlotPessoa : s.fotoSlotFilme,
          destaque && s.fotoSlotDestaque,
        ]}
      >
        {foto ? (
          <Image source={{ uri: foto }} style={s.fotoSlotImg} />
        ) : (
          <View style={s.fotoSlotPlaceholder}>
            <Text style={s.fotoSlotPlaceholderTxt} numberOfLines={1}>
              {(nome || '?')[0].toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <Text style={s.fotoSlotLabel}>{label}</Text>
      <Text
        style={[s.fotoSlotNome, destaque && s.fotoSlotNomeDestaque]}
        numberOfLines={2}
      >
        {nome || '—'}
      </Text>
    </View>
  );
}

// ─── ReviewFilmeCard ──────────────────────────────────────────

function ReviewFilmeCard({ item }: { item: ReviewFilme }) {
  const posterUrl = getImageURL(item.filme?.poster_path, 'w185');

  return (
    <View style={s.card}>
      {posterUrl ? (
        <Image source={{ uri: posterUrl }} style={s.cardPoster} />
      ) : (
        <View style={[s.cardPoster, s.cardPosterPlaceholder]}>
          <Text style={s.cardPosterPlaceholderTxt}>
            {(item.filme?.title || '?')[0]}
          </Text>
        </View>
      )}

      <View style={s.cardBody}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitulo} numberOfLines={2}>
            {item.filme?.title || '—'}
          </Text>
          {item.like && (
            <Image
              source={require('../../../assets/images/envelopecoracao.png')}
              style={s.likeImg}
            />
          )}
        </View>

        {item.estatuetas > 0 && <Estatuetas valor={item.estatuetas} />}

        <Text style={s.cardReview} numberOfLines={4}>
          {item.review}
        </Text>

        <Text style={s.cardData}>{item.data}</Text>
      </View>
    </View>
  );
}

// ─── CardLogCategoria (igual ao PerfilCategorias) ─────────────

function CardLogCategoria({ log }: { log: ReviewCategoria }) {
  const ehPessoa = CATEGORIAS_PESSOA.includes(log.categoria);

  const vencedor = log.vencedorReal?.trim() || null;
  const deveria = log.deveriaTerGanhado?.trim() || null;
  const queria = log.queriaQueGanhasse?.trim() || null;

  const deveDestaque = !!deveria && !!vencedor && deveria !== vencedor;
  const queriaDestaque = !!queria && !!vencedor && queria !== vencedor;

  return (
    <View style={s.logCatCard}>
      <View style={s.logCatHeader}>
        <Text style={s.logCatCategoria} numberOfLines={1}>
          {log.categoria}
        </Text>
        <Text style={s.logCatAno}>{log.ano}</Text>
      </View>

      <View style={s.fotoRow}>
        <FotoSlot
          foto={log.fotoVencedor}
          nome={vencedor}
          label="VENCEU"
          ehPessoa={ehPessoa}
        />
        <FotoSlot
          foto={log.fotoDeveria}
          nome={deveria}
          label="DEVERIA TER GANHADO"
          destaque={deveDestaque}
          ehPessoa={ehPessoa}
        />
        <FotoSlot
          foto={log.fotoQueria}
          nome={queria}
          label="QUERIA QUE GANHASSE"
          destaque={queriaDestaque}
          ehPessoa={ehPessoa}
        />
      </View>

      {log.review ? (
        <View style={s.logCatReviewWrap}>
          <View style={s.logCatReviewBarra} />
          <Text style={s.logCatReview} numberOfLines={3}>
            {log.review}
          </Text>
        </View>
      ) : null}

      <Text style={s.cardData}>{log.data}</Text>
    </View>
  );
}

// ─── Componente principal ─────────────────────────────────────

export default function PerfilReviews() {
  const [reviewsFilmes, setReviewsFilmes] = useState<ReviewFilme[]>([]);
  const [reviewsCategorias, setReviewsCategorias] = useState<ReviewCategoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [tipo, setTipo] = useState<TipoFiltro>('todos');
  const [busca, setBusca] = useState('');

  const carregar = useCallback(async () => {
    try {
      setCarregando(true);
      const user = await Parse.User.currentAsync();
      if (!user) return;

      // ── Reviews de filmes ────────────────────────────────────
      const qLogs = new Parse.Query('Log');
      qLogs.equalTo('usuarioId', user);
      qLogs.exists('review');
      qLogs.descending('createdAt');
      const logsRes = await qLogs.find();

      const filmesSettled = await Promise.allSettled(
        logsRes.map(async (r: any) => {
          const filme = await getFilme(r.get('filmeId'));
          return {
            id: r.id,
            filme,
            estatuetas: r.get('estatuetas') || 0,
            like: r.get('like') || false,
            review: r.get('review') || '',
            data: tempoRelativo(r.createdAt),
          } as ReviewFilme;
        })
      );
      setReviewsFilmes(
        filmesSettled
          .filter((r): r is PromiseFulfilledResult<ReviewFilme> =>
            r.status === 'fulfilled' && !!r.value.filme
          )
          .map((r) => r.value)
      );

      // ── Reviews de categorias (base sem fotos) ───────────────
      const qCat = new Parse.Query('LogCategoria');
      qCat.equalTo('usuarioId', user);
      qCat.exists('review');
      qCat.descending('createdAt');
      const catRes = await qCat.find();

      const catBase: ReviewCategoria[] = catRes.map((l: any) => ({
        id: l.id,
        categoria: l.get('categoria') || '',
        ano: l.get('ano') || 0,
        vencedorReal: l.get('vencedorReal') || null,
        deveriaTerGanhado: l.get('deveriaTerGanhado') || null,
        queriaQueGanhasse: l.get('queriaQueGanhasse') || null,
        review: l.get('review') || '',
        data: tempoRelativo(l.createdAt),
        fotoVencedor: null,
        fotoDeveria: null,
        fotoQueria: null,
      }));
      setReviewsCategorias(catBase);

      // Enriquece com fotos em paralelo
      const catComFoto: ReviewCategoria[] = await Promise.all(
        catBase.map(async (item) => {
          const [fV, fD, fQ] = await Promise.all([
            fetchFotoParaEntrada(item.vencedorReal, item.categoria, item.ano),
            fetchFotoParaEntrada(item.deveriaTerGanhado, item.categoria, item.ano),
            fetchFotoParaEntrada(item.queriaQueGanhasse, item.categoria, item.ano),
          ]);
          return { ...item, fotoVencedor: fV, fotoDeveria: fD, fotoQueria: fQ };
        })
      );
      setReviewsCategorias(catComFoto);
    } catch (e) {
      console.error('[PerfilReviews] erro ao carregar:', e);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // ── Filtros ──────────────────────────────────────────────────

  const reviewsFilmesFiltradas = useMemo(() => {
    if (!busca.trim()) return reviewsFilmes;
    const termo = busca.toLowerCase();
    return reviewsFilmes.filter((r) =>
      r.filme?.title?.toLowerCase().includes(termo)
    );
  }, [reviewsFilmes, busca]);

  const reviewsCategoriasFiltradas = useMemo(() => {
    if (!busca.trim()) return reviewsCategorias;
    const termo = busca.toLowerCase();
    return reviewsCategorias.filter((r) =>
      r.categoria?.toLowerCase().includes(termo) ||
      r.vencedorReal?.toLowerCase().includes(termo)
    );
  }, [reviewsCategorias, busca]);

  const totalVisivel =
    tipo === 'filmes' ? reviewsFilmesFiltradas.length
    : tipo === 'categorias' ? reviewsCategoriasFiltradas.length
    : reviewsFilmesFiltradas.length + reviewsCategoriasFiltradas.length;

  // ── Render ───────────────────────────────────────────────────

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.pageHeader}>
        <Text style={s.pageTitulo}>reviews</Text>
        {!carregando && (
          <Text style={s.pageCount}>
            {totalVisivel} {totalVisivel === 1 ? 'review' : 'reviews'}
          </Text>
        )}
      </View>

      {/* Filtros */}
      <View style={s.filtrosBar}>
        {(['todos', 'filmes', 'categorias'] as TipoFiltro[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.filtroBtn, tipo === t && s.filtroBtnAtivo]}
            onPress={() => { setTipo(t); setBusca(''); }}
            activeOpacity={0.7}
          >
            <Text style={[s.filtroBtnTxt, tipo === t && s.filtroBtnTxtAtivo]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Busca */}
      <View style={s.buscaWrap}>
        <Text style={s.buscaIcone}>⌕</Text>
        <TextInput
          style={s.buscaInput}
          placeholder={tipo === 'categorias' ? 'buscar categoria...' : 'buscar filme...'}
          placeholderTextColor={WHITE35}
          value={busca}
          onChangeText={setBusca}
          returnKeyType="search"
        />
        {busca.length > 0 && (
          <TouchableOpacity onPress={() => setBusca('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.buscaLimpar}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Conteúdo */}
      {carregando ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color={GOLD} size="large" />
        </View>
      ) : totalVisivel === 0 ? (
        <View style={s.vazioWrap}>
          <Text style={s.vazioTxt}>
            {busca ? 'Nenhuma review encontrada.' : 'Nenhuma review ainda.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.lista}
        >
          {(tipo === 'todos' || tipo === 'filmes') &&
            reviewsFilmesFiltradas.map((item) => (
              <ReviewFilmeCard key={item.id} item={item} />
            ))}

          {(tipo === 'todos' || tipo === 'categorias') &&
            reviewsCategoriasFiltradas.map((log) => (
              <CardLogCategoria key={log.id} log={log} />
            ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // Header
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  pageTitulo: {
    fontFamily: 'CormorantGaramond-MediumItalic',
    fontSize: 28,
    color: '#fff',
    letterSpacing: 0.3,
  },
  pageCount: {
    fontFamily: 'serif',
    fontSize: 12,
    color: WHITE35,
    letterSpacing: 0.5,
  },

  // Filtros
  filtrosBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  filtroBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },
  filtroBtnAtivo: {
    backgroundColor: GOLD10,
    borderColor: GOLD30,
  },
  filtroBtnTxt: {
    fontFamily: 'serif',
    fontSize: 12,
    color: WHITE45,
    letterSpacing: 0.5,
  },
  filtroBtnTxtAtivo: { color: GOLD },

  // Busca
  buscaWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  buscaIcone: { fontSize: 18, color: WHITE35, lineHeight: 22 },
  buscaInput: { flex: 1, color: '#fff', fontFamily: 'serif', fontSize: 14, paddingVertical: 0 },
  buscaLimpar: { fontSize: 12, color: WHITE35 },

  // Loading / Vazio
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  vazioWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  vazioTxt: { fontFamily: 'serif', fontStyle: 'italic', fontSize: 14, color: WHITE35 },

  // Lista
  lista: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },

  // ── Card de filme ──────────────────────────────────────────

  card: {
    flexDirection: 'row',
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cardPoster: { width: 72, aspectRatio: 2 / 3, resizeMode: 'cover' },
  cardPosterPlaceholder: {
    backgroundColor: '#1a1712',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPosterPlaceholderTxt: { color: WHITE15, fontSize: 24, fontFamily: 'serif' },
  cardBody: { flex: 1, padding: 12, gap: 5 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  cardTitulo: {
    flex: 1,
    fontFamily: 'serif',
    fontSize: 15,
    fontStyle: 'italic',
    color: '#fff',
    fontWeight: '500',
  },
  likeImg: { width: 18, height: 18, resizeMode: 'contain', marginTop: 1 },
  cardReview: {
    fontFamily: 'serif',
    fontSize: 13,
    color: WHITE45,
    lineHeight: 18,
  },
  cardData: {
    fontFamily: 'serif',
    fontSize: 11,
    color: WHITE35,
    letterSpacing: 0.3,
    marginTop: 2,
  },

  // Estatuetas
  estatuetasRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  estatuetaSlot: { width: 16, alignItems: 'center' },
  estatuetaImg: { width: 14, height: 14, resizeMode: 'contain' },
  estatuetaValor: { fontFamily: 'serif', fontSize: 11, color: GOLD, marginLeft: 4 },

  // ── Card de categoria (idêntico ao PerfilCategorias) ───────

  logCatCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    padding: 14,
    gap: 12,
  },
  logCatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logCatCategoria: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'serif',
    fontStyle: 'italic',
    fontWeight: '400',
    flex: 1,
    marginRight: 8,
  },
  logCatAno: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontFamily: 'serif' },

  // FotoRow
  fotoRow: { flexDirection: 'row', gap: 8 },
  fotoSlotWrap: { flex: 1, gap: 5, alignItems: 'flex-start' },
  fotoSlot: {
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
  },
  fotoSlotPessoa: { aspectRatio: 2 / 3 },
  fotoSlotFilme: { aspectRatio: 2 / 3 },
  fotoSlotDestaque: { borderColor: 'rgba(201,168,76,0.5)' },
  fotoSlotImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  fotoSlotPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1712',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fotoSlotPlaceholderTxt: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 20,
    fontFamily: 'serif',
  },
  fotoSlotLabel: {
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '500',
  },
  fotoSlotNome: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    lineHeight: 15,
  },
  fotoSlotNomeDestaque: { color: GOLD },

  // Review de categoria
  logCatReviewWrap: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  logCatReviewBarra: {
    width: 2,
    backgroundColor: BORDER,
    borderRadius: 1,
    alignSelf: 'stretch',
  },
  logCatReview: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
    flex: 1,
  },
});