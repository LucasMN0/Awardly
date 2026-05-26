// app/(autenticado)/perfil/[username].tsx
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Parse from '../../../lib/parseClient';
import { getFilme, getImageURL } from '../../../lib/tmdb';

const GOLD = '#C9A84C';
const BG = '#0a0906';
const CARD_BG = '#111008';
const BORDER = 'rgba(201,168,76,0.15)';
const { width: SCREEN_W } = Dimensions.get('window');

const TMDB_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const TMDB_IMAGE = process.env.EXPO_PUBLIC_TMDB_IMAGE_BASE;

const CATEGORIAS_PESSOA = [
  'Melhor Ator', 'Melhor Atriz',
  'Melhor Ator Coadjuvante', 'Melhor Atriz Coadjuvante',
  'Melhor Diretor',
];

// ─── Helpers de imagem ───────────────────────────────────────

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

// ─── Tipos ────────────────────────────────────────────────────

interface PerfilDados {
  objectId: string;
  username: string;
  nome: string | null;
  bio: string | null;
  foto: string | null;
  banner: string | null;
  qtdSeguidores?: number;
  qtdSeguindo?: number;
}

interface LogCategoriaItem {
  objectId: string;
  categoria: string;
  ano: number;
  vencedorReal: string | null;
  deveriaTerGanhado: string | null;
  queriaQueGanhasse: string | null;
  review: string | null;
  fotoVencedor: string | null;
  fotoDeveria: string | null;
  fotoQueria: string | null;
}

interface LogFilmeItem {
  objectId: string;
  filmeId: string | number;
  titulo: string;
  posterPath: string | null;
  nota: number | null;
  review: string | null;
  estatuetas: number;
  like: boolean;
  createdAt: Date;
}

interface WatchlistItem {
  objectId: string;
  filmeId: string | number;
  titulo: string;
  posterPath: string | null;
}

// ─── Sub-componentes ─────────────────────────────────────────

function userPointer(userId: string) {
  const u = new Parse.User();
  u.id = userId;
  return u;
}

const POSTER_W = (SCREEN_W - 48 - 30) / 3.8;
const POSTER_H = POSTER_W * 1.5;
const BANNER_H = 180;

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

function LogCategoriaCard({ log }: { log: LogCategoriaItem }) {
  const ehPessoa = CATEGORIAS_PESSOA.includes(log.categoria);
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

function StarRating({ nota }: { nota: number | null }) {
  if (!nota) return null;
  const full = Math.floor(nota / 2);
  const half = nota % 2 >= 1 ? 1 : 0;
  return (
    <View style={s.starRow}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons
          key={i}
          name={i < full ? 'star' : i === full && half ? 'star-half' : 'star-outline'}
          size={11}
          color={GOLD}
        />
      ))}
    </View>
  );
}

function LogFilmeCard({ log, onPress }: { log: LogFilmeItem; onPress: () => void }) {
  const url = getImageURL(log.posterPath, 'w185');
  return (
    <TouchableOpacity style={s.logFilmeCard} onPress={onPress} activeOpacity={0.8}>
      {url ? (
        <Image source={{ uri: url }} style={s.logFilmePoster} />
      ) : (
        <View style={[s.logFilmePoster, s.logFilmePosterPlaceholder]}>
          <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }} numberOfLines={2}>{log.titulo}</Text>
        </View>
      )}
      <View style={s.logFilmeInfo}>
        <Text style={s.logFilmeTitulo} numberOfLines={2}>{log.titulo}</Text>
        <StarRating nota={log.nota} />
        {log.estatuetas > 0 && (
          <View style={s.logFilmeEst}>
            <Ionicons name="trophy-outline" size={10} color={GOLD} />
            <Text style={s.logFilmeEstTxt}>{log.estatuetas} estatueta{log.estatuetas > 1 ? 's' : ''}</Text>
          </View>
        )}
        {log.review ? (
          <Text style={s.logFilmeReview} numberOfLines={3}>{log.review}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────

const TABS = ['perfil', 'filmes', 'categorias', 'reviews', 'watchlist'] as const;
type TabType = (typeof TABS)[number];

// ─── Tela principal ───────────────────────────────────────────

export default function PerfilPublico() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();

  const [perfil, setPerfil] = useState<PerfilDados | null>(null);
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  const [seguindo, setSeguindo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<TabType>('perfil');

  // Dados das abas
  const [filmesFavoritos, setFilmesFavoritos] = useState<any[]>([]);
  const [filmesRecentes, setFilmesRecentes] = useState<any[]>([]);
  const [logsCategorias, setLogsCategorias] = useState<LogCategoriaItem[]>([]);
  const [logsFilmes, setLogsFilmes] = useState<LogFilmeItem[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [stats, setStats] = useState({ filmes: 0, categorias: 0, reviews: 0, watchlist: 0 });

  const carregarPerfil = useCallback(async () => {
    setCarregando(true);
    try {
      const logado = await Parse.User.currentAsync();
      if (logado) setUsuarioLogado(logado);

      // Busca dados do perfil via Cloud Function
      const dados = await Parse.Cloud.run('buscarUsuarioPorUsername', { username });
      setPerfil(dados);

      if (!dados) return;


      const alvoPtr = userPointer(dados.objectId);

      // Verifica se esta seguindo via buscarSeguidores
      if (logado && logado.id !== dados.objectId) {
        try {
          const seguidores = await Parse.Cloud.run('buscarSeguidores', {
            userId: dados.objectId,
            aba: 'seguidores',
          });
          const estaSegundo = (seguidores as any[]).some(
            (s: any) => s.objectId === logado.id
          );
          setSeguindo(estaSegundo);
        } catch { /* ignora */ }
      }

      // Tudo via CF com useMasterKey
      const dadosPerfil = await Parse.Cloud.run('buscarDadosPerfilPublico', {
        userId: dados.objectId,
      });

      const logsRaw: any[] = dadosPerfil.logs || [];
      const catsRaw: any[] = dadosPerfil.categorias || [];
      const watchRaw: any[] = dadosPerfil.watchlist || [];

      // Stats
      setStats({
        filmes: logsRaw.length,
        reviews: logsRaw.filter((l: any) => l.review).length,
        categorias: catsRaw.length,
        watchlist: watchRaw.length,
      });

      // Favoritos
      const tmdbIds: (string | number)[] = dados.favoritos || [];
      if (tmdbIds.length > 0) {
        const favs = await Promise.allSettled(tmdbIds.map((id: string | number) => getFilme(id)));
        setFilmesFavoritos(
          favs
            .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
            .map(r => r.value)
        );
      }

      // Recentes (top 4)
      const top4 = logsRaw.slice(0, 4);
      const recentesData = await Promise.allSettled(
        top4.map(async (l: any) => {
          const f = await getFilme(l.filmeId);
          return f ? { ...f, estatuetas: l.estatuetas } : null;
        })
      );
      setFilmesRecentes(
        recentesData
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
          .map(r => r.value)
      );

      // Todos os logs com dados do filme
      const logsComFilme = await Promise.allSettled(
        logsRaw.map(async (l: any) => {
          const f = await getFilme(l.filmeId);
          if (!f) return null;
          return {
            objectId: l.objectId,
            filmeId: l.filmeId,
            titulo: f.title,
            posterPath: f.poster_path,
            nota: l.nota,
            review: l.review,
            estatuetas: l.estatuetas,
            like: l.like,
            createdAt: l.createdAt,
          } as LogFilmeItem;
        })
      );
      setLogsFilmes(
        logsComFilme
          .filter((r): r is PromiseFulfilledResult<LogFilmeItem> => r.status === 'fulfilled' && r.value !== null)
          .map(r => r.value)
      );

      // Categorias (sem fotos primeiro)
      const itensBase: LogCategoriaItem[] = catsRaw.map((l: any) => ({
        objectId: l.objectId,
        categoria: l.categoria,
        ano: l.ano,
        vencedorReal: l.vencedorReal,
        deveriaTerGanhado: l.deveriaTerGanhado,
        queriaQueGanhasse: l.queriaQueGanhasse,
        review: l.review,
        fotoVencedor: null as string | null,
        fotoDeveria: null as string | null,
        fotoQueria: null as string | null,
      }));
      setLogsCategorias(itensBase);

      // Fotos em background
      Promise.all(
        itensBase.map(async (item) => {
          const ehPessoa = CATEGORIAS_PESSOA.includes(item.categoria);
          const buscarFoto = async (nome: string | null) => {
            if (!nome) return null;
            if (ehPessoa) return fetchFotoPessoa(nome);
            try {
              const res = await fetch(
                `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(nome)}&language=pt-BR`
              );
              const data = await res.json();
              const tmdbId = data.results?.[0]?.id;
              return tmdbId ? fetchPosterFilme(tmdbId) : null;
            } catch { return null; }
          };
          const [fV, fD, fQ] = await Promise.all([
            buscarFoto(item.vencedorReal),
            buscarFoto(item.deveriaTerGanhado),
            buscarFoto(item.queriaQueGanhasse),
          ]);
          return { ...item, fotoVencedor: fV, fotoDeveria: fD, fotoQueria: fQ };
        })
      ).then(setLogsCategorias);

      // Watchlist
      const watchComFilme = await Promise.allSettled(
        watchRaw.map(async (w: any) => {
          const f = await getFilme(w.filmeId);
          if (!f) return null;
          return {
            objectId: w.objectId,
            filmeId: w.filmeId,
            titulo: f.title,
            posterPath: f.poster_path,
          } as WatchlistItem;
        })
      );
      setWatchlist(
        watchComFilme
          .filter((r): r is PromiseFulfilledResult<WatchlistItem> => r.status === 'fulfilled' && r.value !== null)
          .map(r => r.value)
      );

    } catch (e) {
      console.error('[Perfil Público] erro:', e);
    } finally {
      setCarregando(false);
    }
  }, [username]);

  useEffect(() => { carregarPerfil(); }, [carregarPerfil]);

  async function handleToggleFollow() {
    if (!usuarioLogado || !perfil || salvando) return;
    setSalvando(true);
    const alvoPtr = userPointer(perfil.objectId);
    try {
      if (seguindo) {
        const q = new Parse.Query('Follow');
        q.equalTo('seguidor', usuarioLogado);
        q.equalTo('seguindo', alvoPtr);
        const existe = await q.first();
        if (existe) await existe.destroy();
        setSeguindo(false);
        setPerfil(prev => prev ? { ...prev, qtdSeguidores: Math.max(0, (prev.qtdSeguidores ?? 1) - 1) } : prev);
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
        setPerfil(prev => prev ? { ...prev, qtdSeguidores: (prev.qtdSeguidores ?? 0) + 1 } : prev);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return <View style={s.center}><ActivityIndicator color={GOLD} size="large" /></View>;
  }

  if (!perfil) {
    return (
      <View style={s.center}>
        <Text style={{ color: '#fff' }}>Usuário não encontrado.</Text>
      </View>
    );
  }

  const ehEuMesmo = usuarioLogado?.id === perfil.objectId;
  const nomeExibido = perfil.nome || perfil.username;
  const inicial = (nomeExibido || '?')[0].toUpperCase();
  const categoriasRecentes = logsCategorias.slice(0, 3);
  const logsComReview = logsFilmes.filter(l => !!l.review);

  return (
    <View style={s.root}>
      {/* Top Bar */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color={GOLD} />
        </TouchableOpacity>
        <Text style={s.topBarTitle}>{perfil.username}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={s.bannerWrap}>
          {perfil.banner ? (
            <Image source={{ uri: perfil.banner }} style={s.bannerImg} />
          ) : (
            <View style={s.bannerPlaceholder} />
          )}
          <LinearGradient colors={['transparent', BG]} style={s.bannerFade} pointerEvents="none" />
          <View style={s.avatarWrap}>
            {perfil.foto ? (
              <Image source={{ uri: perfil.foto }} style={s.avatar} />
            ) : (
              <View style={s.avatarPlaceholder}>
                <Text style={s.avatarLetra}>{inicial}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Info + Follow */}
        <View style={s.infoWrap}>
          <View style={s.nomeFollowRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.nome}>{nomeExibido}</Text>
              {perfil.bio ? <Text style={s.bio}>{perfil.bio}</Text> : null}
            </View>
            {!ehEuMesmo && (
              <TouchableOpacity
                style={[s.btnSeguir, seguindo && s.btnSeguindo]}
                onPress={handleToggleFollow}
                disabled={salvando}
                activeOpacity={0.8}
              >
                <Text style={[s.btnSeguirTxt, seguindo && s.btnSeguindoTxt]}>
                  {salvando ? '...' : seguindo ? 'Seguindo' : 'Seguir'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Seguidores / Seguindo */}
          <View style={s.segRow}>
            <TouchableOpacity
              style={s.segBtn}
              onPress={() => router.push({
                pathname: '/(autenticado)/seguidores/[username]',
                params: { username: perfil.username, aba: 'seguidores' }
              } as any)}
            >
              <Text style={s.segValor}>{perfil.qtdSeguidores ?? 0}</Text>
              <Text style={s.segLabel}>seguidores</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.segBtn}
              onPress={() => router.push({
                pathname: '/(autenticado)/seguidores/[username]',
                params: { username: perfil.username, aba: 'seguindo' }
              } as any)}
            >
              <Text style={s.segValor}>{perfil.qtdSeguindo ?? 0}</Text>
              <Text style={s.segLabel}>seguindo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={s.estatRow}>
          {[
            { valor: stats.filmes, label: 'filmes' },
            { valor: stats.categorias, label: 'categorias' },
            { valor: stats.reviews, label: 'reviews' },
            { valor: stats.watchlist, label: 'watchlist' },
          ].map((item, i) => (
            <View key={i} style={[s.estatCard, i === 3 && { borderRightWidth: 0 }]}>
              <Text style={s.estatValor}>{item.valor}</Text>
              <Text style={s.estatLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabsContent}>
          {TABS.map((tab) => (
            <TouchableOpacity key={tab} style={[s.tab, abaAtiva === tab && s.tabAtiva]} onPress={() => setAbaAtiva(tab)}>
              <Text style={[s.tabTxt, abaAtiva === tab && s.tabTxtAtiva]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── ABA: PERFIL ── */}
        {abaAtiva === 'perfil' && (
          <View style={s.conteudo}>
            {/* Favoritos */}
            <View style={s.secao}>
              <Text style={s.secaoTitulo}>filmes favoritos</Text>
              {filmesFavoritos.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={s.posterRow}>
                    {filmesFavoritos.map((f) => (
                      <FilmePoster
                        key={f.id}
                        posterPath={f.poster_path}
                        titulo={f.title}
                        onPress={() => router.push(`/(autenticado)/filmes/${f.id}` as any)}
                      />
                    ))}
                  </View>
                </ScrollView>
              ) : <Text style={s.vazio}>Nenhum favorito ainda.</Text>}
            </View>

            {/* Recentes */}
            <View style={s.secao}>
              <Text style={s.secaoTitulo}>recentes</Text>
              {filmesRecentes.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={s.posterRow}>
                    {filmesRecentes.map((f) => (
                      <FilmePoster
                        key={f.id}
                        posterPath={f.poster_path}
                        titulo={f.title}
                        onPress={() => router.push(`/(autenticado)/filmes/${f.id}` as any)}
                        badge={f.estatuetas > 0 ? (
                          <View style={s.badgeWrap}>
                            <Ionicons name="trophy-outline" size={10} color={GOLD} />
                            <Text style={s.badgeNum}>{f.estatuetas}</Text>
                          </View>
                        ) : undefined}
                      />
                    ))}
                  </View>
                </ScrollView>
              ) : <Text style={s.vazio}>Nenhuma atividade ainda.</Text>}
            </View>

            {/* Categorias recentes */}
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

        {/* ── ABA: FILMES ── */}
        {abaAtiva === 'filmes' && (
          <View style={s.conteudo}>
            <Text style={s.secaoTitulo}>todos os filmes</Text>
            {logsFilmes.length > 0 ? (
              logsFilmes.map((log) => (
                <LogFilmeCard
                  key={log.objectId}
                  log={log}
                  onPress={() => router.push(`/(autenticado)/filmes/${log.filmeId}` as any)}
                />
              ))
            ) : <Text style={s.vazio}>Nenhum filme registrado ainda.</Text>}
          </View>
        )}

        {/* ── ABA: CATEGORIAS ── */}
        {abaAtiva === 'categorias' && (
          <View style={s.conteudo}>
            <Text style={s.secaoTitulo}>todas as categorias</Text>
            {logsCategorias.length > 0 ? (
              logsCategorias.map((log) => (
                <LogCategoriaCard key={log.objectId} log={log} />
              ))
            ) : <Text style={s.vazio}>Nenhum log de categoria ainda.</Text>}
          </View>
        )}

        {/* ── ABA: REVIEWS ── */}
        {abaAtiva === 'reviews' && (
          <View style={s.conteudo}>
            <Text style={s.secaoTitulo}>reviews</Text>
            {logsComReview.length > 0 ? (
              logsComReview.map((log) => (
                <LogFilmeCard
                  key={log.objectId}
                  log={log}
                  onPress={() => router.push(`/(autenticado)/filmes/${log.filmeId}` as any)}
                />
              ))
            ) : <Text style={s.vazio}>Nenhuma review ainda.</Text>}
          </View>
        )}

        {/* ── ABA: WATCHLIST ── */}
        {abaAtiva === 'watchlist' && (
          <View style={s.conteudo}>
            <Text style={s.secaoTitulo}>watchlist</Text>
            {watchlist.length > 0 ? (
              <View style={s.watchGrid}>
                {watchlist.map((item) => (
                  <FilmePoster
                    key={item.objectId}
                    posterPath={item.posterPath}
                    titulo={item.titulo}
                    onPress={() => router.push(`/(autenticado)/filmes/${item.filmeId}` as any)}
                  />
                ))}
              </View>
            ) : <Text style={s.vazio}>A watchlist está vazia.</Text>}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  center: { flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
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
  topBarTitle: { color: '#fff', fontSize: 16, fontWeight: '600', fontFamily: 'serif' },

  bannerWrap: { position: 'relative', height: BANNER_H },
  bannerImg: { width: '100%', height: BANNER_H, resizeMode: 'cover' },
  bannerPlaceholder: { width: '100%', height: BANNER_H, backgroundColor: '#1a1610' },
  bannerFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: BANNER_H * 0.7 },
  avatarWrap: { position: 'absolute', bottom: 16, left: 20 },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  avatarPlaceholder: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: CARD_BG,
    borderWidth: 2, borderColor: 'rgba(201,168,76,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  avatarLetra: { color: GOLD, fontSize: 28, fontWeight: '600' },

  infoWrap: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12, gap: 10 },
  nomeFollowRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  nome: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 2 },
  bio: { color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 18 },

  btnSeguir: {
    paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: GOLD, alignSelf: 'flex-start', marginTop: 2,
  },
  btnSeguindo: { backgroundColor: 'rgba(201,168,76,0.1)', borderColor: 'rgba(201,168,76,0.4)' },
  btnSeguirTxt: { color: GOLD, fontWeight: '600', fontSize: 13 },
  btnSeguindoTxt: { color: 'rgba(201,168,76,0.7)' },

  segRow: { flexDirection: 'row', gap: 20 },
  segBtn: { alignItems: 'flex-start' },
  segValor: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: 'serif', lineHeight: 18 },
  segLabel: { fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.5 },

  estatRow: {
    flexDirection: 'row',
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: BORDER, marginTop: 4,
  },
  estatCard: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    borderRightWidth: 1, borderRightColor: BORDER,
  },
  estatValor: { fontFamily: 'serif', fontSize: 20, fontWeight: '700', color: GOLD, lineHeight: 22 },
  estatLabel: {
    fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.35)', marginTop: 2, textAlign: 'center',
  },

  tabsScroll: { borderBottomWidth: 1, borderBottomColor: BORDER },
  tabsContent: { paddingHorizontal: 16, gap: 4 },
  tab: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabAtiva: { borderBottomColor: GOLD },
  tabTxt: { fontSize: 13, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: 0.5 },
  tabTxtAtiva: { color: GOLD },

  conteudo: { padding: 20, gap: 28 },
  secao: { gap: 12 },
  secaoHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  secaoTitulo: { fontFamily: 'CormorantGaramond-MediumItalic', fontSize: 27, fontWeight: '300', color: '#fff', letterSpacing: 0.3 },
  secaoVerTudo: { fontSize: 12, color: GOLD, letterSpacing: 0.3 },
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

  watchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  // Log Filme Card
  logFilmeCard: {
    flexDirection: 'row', gap: 12, backgroundColor: CARD_BG,
    borderWidth: 1, borderColor: BORDER, borderRadius: 8, padding: 10,
  },
  logFilmePoster: { width: 56, height: 84, borderRadius: 4, resizeMode: 'cover' },
  logFilmePosterPlaceholder: { backgroundColor: '#1a1712', alignItems: 'center', justifyContent: 'center', padding: 4 },
  logFilmeInfo: { flex: 1, gap: 4 },
  logFilmeTitulo: { color: '#fff', fontSize: 14, fontWeight: '600', lineHeight: 18 },
  starRow: { flexDirection: 'row', gap: 1 },
  logFilmeEst: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logFilmeEstTxt: { color: GOLD, fontSize: 11 },
  logFilmeReview: { color: 'rgba(255,255,255,0.45)', fontSize: 12, lineHeight: 17, fontStyle: 'italic', marginTop: 2 },

  // Log Categoria Card
  logCatCard: { backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER, borderRadius: 8, padding: 14, gap: 12 },
  logCatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logCatCategoria: { color: '#fff', fontSize: 15, fontFamily: 'serif', fontStyle: 'italic', fontWeight: '400', flex: 1, marginRight: 8 },
  logCatAno: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontFamily: 'serif' },
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