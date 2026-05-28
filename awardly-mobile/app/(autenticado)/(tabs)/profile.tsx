// (autenticado)/(tabs)/profile.tsx
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Parse from '../../../lib/parseClient';
import { getFilme, getImageURL } from '../../../lib/tmdb';
import PerfilFilmes from '../PerfilFilmes/PerfilFilmes';
import EditarLogFilmeModal from '../../../components/EditarLogFilmeModal';
import LogCategoriaModal from '../../../components/LogCategoriaModal';
import PerfilCategorias from '../PerfilCategorias/PerfilCategorias';
import PerfilReviews from '../PerfilReviews/PerfilReviews';
import PerfilWatchlist from '../PerfilWatchlist/PerfilWatchlist';
import { Share } from 'react-native';

const GOLD = '#C9A84C';
const BG = '#0a0906';
const CARD_BG = '#111008';
const BORDER = 'rgba(201,168,76,0.15)';
const { width: SCREEN_W } = Dimensions.get('window');

// ─── Helpers ────────────────────────────────────────────────

const TMDB_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const TMDB_IMAGE = process.env.EXPO_PUBLIC_TMDB_IMAGE_BASE;

const CATEGORIAS_PESSOA = [
  'Melhor Ator', 'Melhor Atriz',
  'Melhor Ator Coadjuvante', 'Melhor Atriz Coadjuvante',
  'Melhor Diretor',
];

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

// Busca tmdbId de um filme pelo título + categoria + ano no Parse
async function fetchTmdbIdParaLog(
  categoria: string,
  ano: number,
  nomeFilme: string | null
): Promise<string | number | undefined> {
  if (!nomeFilme) return undefined;
  try {
    const q = new Parse.Query('Filme');
    q.limit(1000);
    const todos = await q.find();
    const results = todos.filter((f: any) => {
      const anoOk = f.get('ano') === ano || String(f.get('ano')) === String(ano);
      const cats: any[] = f.get('categorias') || [];
      return anoOk && cats.includes(categoria);
    });
    const match = results.find((f: any) => f.get('titulo') === nomeFilme);
    return match?.get('tmdbId') ?? results[0]?.get('tmdbId');
  } catch { return undefined; }
}

async function fetchFotoParaEntrada(
  nome: string | null,
  categoria: string,
  tmdbIdFilme?: string | number
): Promise<string | null> {
  if (!nome) return null;
  if (CATEGORIAS_PESSOA.includes(categoria)) {
    return fetchFotoPessoa(nome);
  }
  if (tmdbIdFilme) return fetchPosterFilme(tmdbIdFilme);
  return null;
}

// ─── Tipos ────────────────────────────────────────────────────

interface LogCategoriaItem {
  objectId: string;
  categoria: string;
  ano: number;
  vencedorReal: string | null;
  deveriaTerGanhado: string | null;
  queriaQueGanhasse: string | null;
  review: string | null;
  filmes: any[];
  fotoVencedor: string | null;
  fotoDeveria: string | null;
  fotoQueria: string | null;
  tmdbIdFilme?: string | number;
}

// ─── Sub-components ─────────────────────────────────────────

function EstatCard({ valor, label, onPress }: { valor: number; label: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={s.estatCard} onPress={onPress} disabled={!onPress} activeOpacity={onPress ? 0.7 : 1}>
      <Text style={s.estatValor}>{valor}</Text>
      <Text style={s.estatLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function FilmePoster({ posterPath, titulo, onPress, badge }: {
  posterPath: string | null; titulo: string; onPress?: () => void; badge?: React.ReactNode;
}) {
  const url = getImageURL(posterPath, 'w342');
  return (
    <TouchableOpacity style={s.poster} onPress={onPress} activeOpacity={0.8}>
      {url ? (
        <Image source={{ uri: url }} style={s.posterImg} />
      ) : (
        <View style={s.posterPlaceholder}>
          <Text style={s.posterPlaceholderTxt} numberOfLines={2}>{titulo}</Text>
        </View>
      )}
      {badge}
    </TouchableOpacity>
  );
}

// ─── FotoSlot ────────────────────────────────────────────────

function FotoSlot({ foto, nome, label, destaque, ehPessoa }: {
  foto: string | null; nome: string | null; label: string; destaque?: boolean; ehPessoa: boolean;
}) {
  return (
    <View style={s.fotoSlotWrap}>
      <View style={[s.fotoSlot, ehPessoa ? s.fotoSlotPessoa : s.fotoSlotFilme, destaque && s.fotoSlotDestaque]}>
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
      <Text style={[s.fotoSlotNome, destaque && s.fotoSlotNomeDestaque]} numberOfLines={2}>
        {nome || '—'}
      </Text>
    </View>
  );
}

const CATEGORIAS_PESSOA_CARD = [
  'Melhor Ator', 'Melhor Atriz',
  'Melhor Ator Coadjuvante', 'Melhor Atriz Coadjuvante',
  'Melhor Diretor',
];

// Card SÓ LEITURA — usado na aba perfil
function LogCategoriaCard({ log }: { log: LogCategoriaItem }) {
  const ehPessoa = CATEGORIAS_PESSOA_CARD.includes(log.categoria);
  return (
    <View style={s.logCatCard}>
      <View style={s.logCatHeader}>
        <Text style={s.logCatCategoria} numberOfLines={1}>{log.categoria}</Text>
        <Text style={s.logCatAno}>{log.ano}</Text>
      </View>
      <View style={s.fotoRow}>
        <FotoSlot foto={log.fotoVencedor} nome={log.vencedorReal} label="VENCEU" ehPessoa={ehPessoa} />
        <FotoSlot
          foto={log.fotoDeveria} nome={log.deveriaTerGanhado} label="DEVERIA TER GANHADO"
          // FIX 2: só destaca se vencedorReal existe E é diferente
          destaque={!!log.deveriaTerGanhado && !!log.vencedorReal && log.deveriaTerGanhado !== log.vencedorReal}
          ehPessoa={ehPessoa}
        />
        <FotoSlot
          foto={log.fotoQueria} nome={log.queriaQueGanhasse} label="QUERIA QUE GANHASSE"
          destaque={!!log.queriaQueGanhasse && !!log.vencedorReal && log.queriaQueGanhasse !== log.vencedorReal}
          ehPessoa={ehPessoa}
        />
      </View>
      {log.review ? (
        <View style={s.logCatReviewWrap}>
          <View style={s.logCatReviewBarra} />
          <Text style={s.logCatReview} numberOfLines={3}>{log.review}</Text>
        </View>
      ) : null}
    </View>
  );
}

// Card COM EDITAR — usado na aba categorias
function LogCategoriaCardEditavel({ log, onEditar }: { log: LogCategoriaItem; onEditar: () => void }) {
  const ehPessoa = CATEGORIAS_PESSOA_CARD.includes(log.categoria);
  return (
    <View style={s.logCatCard}>
      <View style={s.logCatHeader}>
        <Text style={s.logCatCategoria} numberOfLines={1}>{log.categoria}</Text>
        <View style={s.logCatHeaderDir}>
          <Text style={s.logCatAno}>{log.ano}</Text>
          <TouchableOpacity onPress={onEditar} style={s.btnEditarCat} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Image source={require('../../../assets/images/lapis.png')} style={s.lapisImgCat} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={s.fotoRow}>
        <FotoSlot foto={log.fotoVencedor} nome={log.vencedorReal} label="VENCEU" ehPessoa={ehPessoa} />
        <FotoSlot
          foto={log.fotoDeveria} nome={log.deveriaTerGanhado} label="DEVERIA TER GANHADO"
          destaque={!!log.deveriaTerGanhado && !!log.vencedorReal && log.deveriaTerGanhado !== log.vencedorReal}
          ehPessoa={ehPessoa}
        />
        <FotoSlot
          foto={log.fotoQueria} nome={log.queriaQueGanhasse} label="QUERIA QUE GANHASSE"
          destaque={!!log.queriaQueGanhasse && !!log.vencedorReal && log.queriaQueGanhasse !== log.vencedorReal}
          ehPessoa={ehPessoa}
        />
      </View>
      {log.review ? (
        <View style={s.logCatReviewWrap}>
          <View style={s.logCatReviewBarra} />
          <Text style={s.logCatReview} numberOfLines={3}>{log.review}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── Tabs ────────────────────────────────────────────────────

const TABS = ['perfil', 'filmes', 'categorias', 'reviews', 'watchlist'] as const;
type TabType = (typeof TABS)[number];

// ─── Tela principal ──────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [usuario, setUsuario] = useState<any>(null);
  const [stats, setStats] = useState({ filmes: 0, categorias: 0, reviews: 0, watchlist: 0, seguidores: 0, seguindo: 0 });
  const [filmesFavoritos, setFilmesFavoritos] = useState<any[]>([]);
  const [filmesVistos, setFilmesVistos] = useState<any[]>([]);
  const [logsCategorias, setLogsCategorias] = useState<LogCategoriaItem[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<TabType>('perfil');
  const [logFilmeParaEditar, setLogFilmeParaEditar] = useState<any>(null);
  const [modalCategoria, setModalCategoria] = useState<{
    visivel: boolean; categoria: string; ano: number; filmes: any[];
  }>({ visivel: false, categoria: '', ano: 0, filmes: [] });

  const carregar = useCallback(async () => {
    try {
      setCarregando(true);
      const user = await Parse.User.currentAsync();
      if (!user) { router.replace('/(public)/home' as any); return; }
      await user.fetch();
      setUsuario(user);

      const [qSeg, qSeguindo, qWatch, qCat, qLogs] = [
        new Parse.Query('Follow'), new Parse.Query('Follow'),
        new Parse.Query('Watchlist'), new Parse.Query('LogCategoria'), new Parse.Query('Log'),
      ];
      qSeg.equalTo('seguindo', user);
      qSeguindo.equalTo('seguidor', user);
      qWatch.equalTo('usuarioId', user);
      qCat.equalTo('usuarioId', user);
      qLogs.equalTo('usuarioId', user);
      qLogs.descending('createdAt');
      qLogs.limit(20);

      const qCatCompleto = new Parse.Query('LogCategoria');
      qCatCompleto.equalTo('usuarioId', user);
      qCatCompleto.descending('createdAt');
      qCatCompleto.limit(100);

      const [nSeg, nSeguindo, nWatch, nCat, logs, catLogs] = await Promise.all([
        qSeg.count(), qSeguindo.count(), qWatch.count(), qCat.count(),
        qLogs.find(), qCatCompleto.find(),
      ]);

      setStats({
        filmes: logs.length,
        categorias: nCat,
        reviews: logs.filter((l: any) => l.get('review')).length,
        watchlist: nWatch,
        seguidores: nSeg,
        seguindo: nSeguindo,
      });

      // Monta base sem fotos
      const itensBase = catLogs.map((l: any) => ({
        objectId: l.id,
        categoria: l.get('categoria') || '',
        ano: l.get('ano') || 0,
        vencedorReal: l.get('vencedorReal') || null,
        deveriaTerGanhado: l.get('deveriaTerGanhado') || null,
        queriaQueGanhasse: l.get('queriaQueGanhasse') || null,
        review: l.get('review') || null,
        filmes: [],
        fotoVencedor: null as string | null,
        fotoDeveria: null as string | null,
        fotoQueria: null as string | null,
      }));
      setLogsCategorias(itensBase);

      // FIX 1: busca tmdbId para categorias de filme antes de buscar as fotos
      // DEPOIS
      const itensComFoto: LogCategoriaItem[] = await Promise.all(
        itensBase.map(async (item) => {
          const cat = item.categoria;
          const ehPessoa = CATEGORIAS_PESSOA.includes(cat);

          const buscarFoto = async (nome: string | null) => {
            if (!nome) return null;
            if (ehPessoa) return fetchFotoPessoa(nome);
            // Busca tmdbId individual para cada nome
            let tmdbId = await fetchTmdbIdParaLog(cat, item.ano, nome);
            if (!tmdbId) {
              // fallback: busca direto no TMDB pelo título
              try {
                const res = await fetch(
                  `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(nome)}&language=pt-BR`
                );
                const data = await res.json();
                tmdbId = data.results?.[0]?.id;
              } catch { return null; }
            }
            return tmdbId ? fetchPosterFilme(tmdbId) : null;
          };

          const [fV, fD, fQ] = await Promise.all([
            buscarFoto(item.vencedorReal),
            buscarFoto(item.deveriaTerGanhado),
            buscarFoto(item.queriaQueGanhasse),
          ]);
          return { ...item, fotoVencedor: fV, fotoDeveria: fD, fotoQueria: fQ };
        })
      );
      setLogsCategorias(itensComFoto);

      // Favoritos
      const tmdbIds: (string | number)[] = user.get('favoritos') || [];
      if (tmdbIds.length > 0) {
        const res = await Promise.allSettled(tmdbIds.map((id) => getFilme(id)));
        setFilmesFavoritos(
          res.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value).map((r) => r.value)
        );
      }

      // Recentes
      const top4 = logs.slice(0, 4);
      const vistos = await Promise.allSettled(
        top4.map(async (l: any) => {
          const f = await getFilme(l.get('filmeId'));
          return f ? { ...f, estatuetas: l.get('estatuetas') || 0, like: l.get('like') || false } : null;
        })
      );
      setFilmesVistos(
        vistos.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value).map((r) => r.value)
      );
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function fecharModal(resultado?: string) {
    setModalCategoria((prev) => ({ ...prev, visivel: false }));
    if (resultado === '__salvo__' || resultado === '__deletado__') carregar();
  }

  async function abrirModalCategoria(log: LogCategoriaItem) {
    const q = new Parse.Query('FilmeOscar');
    q.equalTo('ano', log.ano);
    q.equalTo('categorias', log.categoria);
    q.limit(20);
    let filmes: any[] = [];
    try {
      const results = await q.find();
      filmes = results.map((f: any) => ({
        titulo: f.get('titulo'),
        tmdbId: f.get('tmdbId'),        // FIX 3: garante que tmdbId vem
        poster: f.get('poster') || null,
        atoresIndicados: f.get('atoresIndicados') || {},
        diretor: f.get('diretor') || null,
        roteiristas: f.get('roteiristas') || [],
        cancao: f.get('cancao') || {},
        vencedores: f.get('vencedores') || [],
      }));
    } catch (e) { console.error(e); }
    setModalCategoria({ visivel: true, categoria: log.categoria, ano: log.ano, filmes });
  }

  if (carregando) {
    return <View style={s.loadingWrap}><ActivityIndicator color={GOLD} size="large" /></View>;
  }

  const nome = usuario?.get('nome') || usuario?.get('username') || 'Usuário';
  const bio = usuario?.get('bio') || 'Cinéfilo apaixonado por Oscar.';
  const fotoObj = usuario?.get('foto');
  const fotoUrl = typeof fotoObj?.url === 'function' ? fotoObj.url() : fotoObj?._url || null;
  const bannerObj = usuario?.get('banner');
  const bannerUrl = typeof bannerObj?.url === 'function' ? bannerObj.url() : bannerObj?._url || null;
  const username = usuario?.get('username') || '';

  const logsPorAno = logsCategorias.reduce<Record<number, LogCategoriaItem[]>>((acc, log) => {
    if (!acc[log.ano]) acc[log.ano] = [];
    acc[log.ano].push(log);
    return acc;
  }, {});
  const anosOrdenados = Object.keys(logsPorAno).map(Number).sort((a, b) => b - a);
  const categoriasRecentes = logsCategorias.slice(0, 3);

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <TouchableOpacity
          onPress={() =>
            Share.share({
              message: `Veja o perfil de ${nome} no app! @${username}`,
            })
          }
          style={s.shareBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="share-outline" size={22} color={GOLD} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(autenticado)/configuracoes' as any)}>
          <Ionicons name="settings-outline" size={22} color={GOLD} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Banner */}
        <View style={s.bannerWrap}>
          {bannerUrl ? <Image source={{ uri: bannerUrl }} style={s.bannerImg} /> : <View style={s.bannerPlaceholder} />}
          <LinearGradient colors={['transparent', BG]} style={s.bannerFade} pointerEvents="none" />
          <View style={s.avatarWrap}>
            {fotoUrl ? (
              <Image source={{ uri: fotoUrl }} style={s.avatar} />
            ) : (
              <View style={s.avatarPlaceholder}>
                <Text style={s.avatarLetra}>{nome[0]?.toUpperCase()}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.infoWrap}>
          <View style={s.nomeRow}>
            <Text style={s.nome}>{nome}</Text>
            <View style={s.segRow}>
              <TouchableOpacity
                onPress={() => router.push(`/(autenticado)/seguidores/${username}?aba=seguidores` as any)}
                style={s.segBtn}>
                <Text style={s.segValor}>{stats.seguidores}</Text>
                <Text style={s.segLabel}>seguidores</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push(`/(autenticado)/seguidores/${username}?aba=seguindo` as any)}
                style={s.segBtn}>
                <Text style={s.segValor}>{stats.seguindo}</Text>
                <Text style={s.segLabel}>seguindo</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={s.bio}>{bio}</Text>
        </View>
              
        <View style={s.estatRow}>
          <EstatCard valor={stats.filmes} label="filmes" />
          <EstatCard valor={stats.categorias} label="categorias" />
          <EstatCard valor={stats.reviews} label="reviews" />
          <EstatCard valor={stats.watchlist} label="watchlist" />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabsContent}>
          {TABS.map((tab) => (
            <TouchableOpacity key={tab} style={[s.tab, abaAtiva === tab && s.tabAtiva]} onPress={() => setAbaAtiva(tab)}>
              <Text style={[s.tabTxt, abaAtiva === tab && s.tabTxtAtiva]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Aba: perfil — cards sem editar ── */}
        {abaAtiva === 'perfil' && (
          <View style={s.conteudo}>
            <View style={s.secao}>
              <Text style={s.secaoTitulo}>filmes favoritos</Text>
              {filmesFavoritos.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={s.posterRow}>
                    {filmesFavoritos.map((f) => (
                      <FilmePoster key={f.id} posterPath={f.poster_path} titulo={f.title}
                        onPress={() => router.push(`/(autenticado)/filmes/${f.id}` as any)} />
                    ))}
                  </View>
                </ScrollView>
              ) : <Text style={s.vazio}>Nenhum favorito ainda.</Text>}
            </View>

            <View style={s.secao}>
              <Text style={s.secaoTitulo}>recentes</Text>
              {filmesVistos.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={s.posterRow}>
                    {filmesVistos.map((f, i) => (
                      <FilmePoster key={`${f.id}-${i}`} posterPath={f.poster_path} titulo={f.title}
                        onPress={() => router.push(`/(autenticado)/filmes/${f.id}` as any)}
                        badge={f.estatuetas > 0 ? (
                          <View style={s.badgeWrap}>
                            <Image source={require('../../../assets/images/oscar2.png')} style={s.imgOscar} />
                            <Text style={s.badgeNum}>{f.estatuetas}</Text>
                          </View>
                        ) : undefined}
                      />
                    ))}
                  </View>
                </ScrollView>
              ) : <Text style={s.vazio}>Nenhuma atividade ainda.</Text>}
            </View>

            {/* Categorias recentes — só leitura */}
            <View style={s.secao}>
              <View style={s.secaoHeaderRow}>
                <Text style={s.secaoTitulo}>categorias recentes</Text>
                {logsCategorias.length > 3 && (
                  <TouchableOpacity onPress={() => setAbaAtiva('categorias')}>
                    <Text style={s.secaoVerTudo}>ver tudo</Text>
                  </TouchableOpacity>
                )}
              </View>
              {categoriasRecentes.length > 0 ? (
                categoriasRecentes.map((log) => (
                  <LogCategoriaCard key={log.objectId} log={log} />
                ))
              ) : <Text style={s.vazio}>Nenhum log de categoria ainda.</Text>}
            </View>
          </View>
        )}

        {/* ── Aba: categorias — cards com editar ── */}
        {abaAtiva === 'categorias' && (
          <PerfilCategorias onRecarregar={carregar} />
        )}

        {/* ── Aba: filmes ── */}
        {abaAtiva === 'filmes' && (
          <PerfilFilmes
            onAbrirFilme={(tmdbId) => router.push(`/(autenticado)/filmes/${tmdbId}`)}
            onAbrirEditar={(item) => setLogFilmeParaEditar(item)}
          />
        )}

        {abaAtiva === 'reviews' && (
          <PerfilReviews />
        )}
        
        {abaAtiva === 'watchlist' && (
          <PerfilWatchlist
            onAbrirFilme={(tmdbId) => router.push(`/(autenticado)/filmes/${tmdbId}`)}
          />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <EditarLogFilmeModal
        log={logFilmeParaEditar}
        onClose={(resultado) => {
          setLogFilmeParaEditar(null);
          if (resultado === '__salvo__' || resultado === '__deletado__') carregar();
        }}
      />

      <LogCategoriaModal
        visivel={modalCategoria.visivel}
        categoria={modalCategoria.categoria}
        ano={modalCategoria.ano}
        filmes={modalCategoria.filmes}
        onClose={fecharModal}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const POSTER_W = (SCREEN_W - 48 - 30) / 3.8;
const POSTER_H = POSTER_W * 1.5;
const BANNER_H = 200;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  loadingWrap: { flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12,
    backgroundColor: BG, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  topBarNome: { fontFamily: 'serif', fontSize: 20, color: '#fff', fontWeight: '600', letterSpacing: 0.3 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
  bannerWrap: { position: 'relative', height: BANNER_H },
  bannerImg: { width: '100%', height: BANNER_H, resizeMode: 'cover' },
  bannerPlaceholder: { width: '100%', height: BANNER_H, backgroundColor: '#1a1610' },
  bannerFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: BANNER_H * 0.7 },
  avatarWrap: { position: 'absolute', bottom: 16, left: 20 },
  avatar: { width: 72, height: 72, borderRadius: 36, borderColor: 'rgba(201,168,76,0.4)' },
  avatarPlaceholder: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: CARD_BG,
    borderWidth: 2, borderColor: 'rgba(201,168,76,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  avatarLetra: { color: GOLD, fontSize: 28, fontWeight: '600' },
  infoWrap: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 },
  nomeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  segRow:  { flexDirection: 'row', gap: 16 },
  segBtn:  { alignItems: 'center' },
  segValor: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: 'serif', lineHeight: 18 },
  segLabel: { fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.5 },
  nome: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 2 },
  bio: { color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 18, fontFamily: 'Poppins-Regular' },
  estatRow: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: BORDER, marginTop: 4 },
  estatCard: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRightWidth: 1, borderRightColor: BORDER },
  estatValor: { fontFamily: 'serif', fontSize: 20, fontWeight: '700', color: GOLD, lineHeight: 22 },
  estatLabel: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, color: 'rgba(255,255,255,0.35)', marginTop: 2, textAlign: 'center' },
  tabsScroll: { borderBottomWidth: 1, borderBottomColor: BORDER },
  tabsContent: { paddingHorizontal: 16, gap: 4 },
  tab: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabAtiva: { borderBottomColor: GOLD },
  tabTxt: { fontSize: 13, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: 0.5, fontFamily: 'Poppins-Regular' },
  tabTxtAtiva: { color: GOLD },
  conteudo: { padding: 20, gap: 32 },
  secao: { gap: 12 },
  secaoHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  secaoTitulo: { fontFamily: 'CormorantGaramond-MediumItalic', fontSize: 27, fontWeight: '300', color: '#fff', letterSpacing: 0.3 },
  secaoVerTudo: { fontSize: 12, color: GOLD, letterSpacing: 0.3, fontFamily: 'Poppins-Regular' },
  vazio: { color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  posterRow: { flexDirection: 'row', gap: 8 },
  poster: { width: POSTER_W, height: POSTER_H, borderRadius: 4, overflow: 'hidden', borderWidth: 1, borderColor: BORDER, position: 'relative' },
  posterImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  posterPlaceholder: { backgroundColor: CARD_BG, alignItems: 'center', justifyContent: 'center', padding: 6, flex: 1 },
  posterPlaceholderTxt: { color: 'rgba(255,255,255,0.3)', fontSize: 10, textAlign: 'center' },
  badgeWrap: {
    position: 'absolute', bottom: 6, right: 6, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(10,9,6,0.85)', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2, gap: 2,
  },
  badgeNum: { color: GOLD, fontSize: 11, fontWeight: '700' },
  imgOscar: { width: 12, height: 12, resizeMode: 'contain' },

  // Log Categoria Card
  logCatCard: { backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER, borderRadius: 8, padding: 14, gap: 12 },
  logCatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logCatHeaderDir: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logCatCategoria: { color: '#fff', fontSize: 15, fontFamily: 'serif', fontStyle: 'italic', fontWeight: '400', flex: 1, marginRight: 8 },
  logCatAno: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontFamily: 'serif' },
  btnEditarCat: {
    backgroundColor: 'rgba(201,168,76,0.1)', borderRadius: 4, padding: 6,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)',
  },
  lapisImgCat: { width: 12, height: 12, resizeMode: 'contain' },
  fotoRow: { flexDirection: 'row', gap: 8 },
  fotoSlotWrap: { flex: 1, gap: 5, alignItems: 'flex-start' },
  fotoSlot: { width: '100%', borderRadius: 4, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  fotoSlotPessoa: { aspectRatio: 2 / 3 },
  fotoSlotFilme: { aspectRatio: 2 / 3 },
  fotoSlotDestaque: { borderColor: 'rgba(201,168,76,0.5)' },
  fotoSlotImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  fotoSlotPlaceholder: { width: '100%', height: '100%', backgroundColor: '#1a1712', alignItems: 'center', justifyContent: 'center' },
  fotoSlotPlaceholderTxt: { color: 'rgba(255,255,255,0.2)', fontSize: 20, fontFamily: 'serif' },
  fotoSlotLabel: { fontSize: 9, letterSpacing: 0.6, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontWeight: '500' },
  fotoSlotNome: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600', lineHeight: 15 },
  fotoSlotNomeDestaque: { color: GOLD },
  logCatReviewWrap: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  logCatReviewBarra: { width: 2, backgroundColor: BORDER, borderRadius: 1, alignSelf: 'stretch' },
  logCatReview: { color: 'rgba(255,255,255,0.4)', fontSize: 12, lineHeight: 18, fontStyle: 'italic', flex: 1 },
});