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
import LogCategoriaModal from '../../../components/LogCategoriaModal';

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

// Busca foto de uma entrada (pessoa ou poster do filme) dado o nome e a categoria
async function fetchFotoParaEntrada(
  nome: string | null,
  categoria: string,
  tmdbIdFilme?: string | number
): Promise<string | null> {
  if (!nome) return null;
  if (CATEGORIAS_PESSOA.includes(categoria)) {
    return fetchFotoPessoa(nome);
  }
  // para filmes busca o poster via tmdbId se disponível, senão busca por título
  if (tmdbIdFilme) return fetchPosterFilme(tmdbIdFilme);
  return null;
}

function tempoRelativo(date: Date | undefined): string {
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

// ─── Sub-components ─────────────────────────────────────────

function EstatCard({
  valor,
  label,
  onPress,
}: {
  valor: number;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={s.estatCard}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={s.estatValor}>{valor}</Text>
      <Text style={s.estatLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function FilmePoster({
  posterPath,
  titulo,
  onPress,
  badge,
}: {
  posterPath: string | null;
  titulo: string;
  onPress?: () => void;
  badge?: React.ReactNode;
}) {
  const url = getImageURL(posterPath, 'w342');
  return (
    <TouchableOpacity style={s.poster} onPress={onPress} activeOpacity={0.8}>
      {url ? (
        <Image source={{ uri: url }} style={s.posterImg} />
      ) : (
        <View style={s.posterPlaceholder}>
          <Text style={s.posterPlaceholderTxt} numberOfLines={2}>
            {titulo}
          </Text>
        </View>
      )}
      {badge}
    </TouchableOpacity>
  );
}

// ─── Card de log de categoria ────────────────────────────────

const CATEGORIAS_PESSOA_CARD = [
  'Melhor Ator', 'Melhor Atriz',
  'Melhor Ator Coadjuvante', 'Melhor Atriz Coadjuvante',
  'Melhor Diretor',
];

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
      <View style={[
        s.fotoSlot,
        ehPessoa ? s.fotoSlotPessoa : s.fotoSlotFilme,
        destaque && s.fotoSlotDestaque,
      ]}>
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

function LogCategoriaCard({
  log,
  onPress,
}: {
  log: LogCategoriaItem;
  onPress: () => void;
}) {
  const ehPessoa = CATEGORIAS_PESSOA_CARD.includes(log.categoria);

  return (
    <TouchableOpacity style={s.logCatCard} onPress={onPress} activeOpacity={0.75}>
      {/* Header */}
      <View style={s.logCatHeader}>
        <Text style={s.logCatCategoria} numberOfLines={1}>{log.categoria}</Text>
        <Text style={s.logCatAno}>{log.ano}</Text>
      </View>

      {/* Fotos: venceu | deveria | queria */}
      <View style={s.fotoRow}>
        <FotoSlot
          foto={log.fotoVencedor}
          nome={log.vencedorReal}
          label="VENCEU"
          ehPessoa={ehPessoa}
        />
        <FotoSlot
          foto={log.fotoDeveria}
          nome={log.deveriaTerGanhado}
          label="DEVERIA TER GANHADO"
          destaque={!!log.deveriaTerGanhado && log.deveriaTerGanhado !== log.vencedorReal}
          ehPessoa={ehPessoa}
        />
        <FotoSlot
          foto={log.fotoQueria}
          nome={log.queriaQueGanhasse}
          label="QUERIA QUE GANHASSE"
          destaque={!!log.queriaQueGanhasse && log.queriaQueGanhasse !== log.vencedorReal}
          ehPessoa={ehPessoa}
        />
      </View>

      {/* Review */}
      {log.review ? (
        <View style={s.logCatReviewWrap}>
          <View style={s.logCatReviewBarra} />
          <Text style={s.logCatReview} numberOfLines={3}>{log.review}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
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

// ─── Tabs internas do perfil ─────────────────────────────────

const TABS = ['perfil', 'filmes', 'categorias', 'reviews', 'watchlist'] as const;
type TabType = (typeof TABS)[number];

// ─── Tela principal ──────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [usuario, setUsuario] = useState<any>(null);
  const [stats, setStats] = useState({
    filmes: 0,
    categorias: 0,
    reviews: 0,
    watchlist: 0,
    seguidores: 0,
    seguindo: 0,
  });
  const [filmesFavoritos, setFilmesFavoritos] = useState<any[]>([]);
  const [filmesVistos, setFilmesVistos] = useState<any[]>([]);
  const [logsCategorias, setLogsCategorias] = useState<LogCategoriaItem[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<TabType>('perfil');

  // Estado do modal — começa SEMPRE false
  const [modalCategoria, setModalCategoria] = useState<{
    visivel: boolean;
    categoria: string;
    ano: number;
    filmes: any[];
  }>({ visivel: false, categoria: '', ano: 0, filmes: [] });

  const carregar = useCallback(async () => {
    try {
      setCarregando(true);
      const user = await Parse.User.currentAsync();
      if (!user) {
        router.replace('/(public)/home' as any);
        return;
      }
      await user.fetch();
      setUsuario(user);

      const [qSeg, qSeguindo, qWatch, qCat, qLogs] = [
        new Parse.Query('Follow'),
        new Parse.Query('Follow'),
        new Parse.Query('Watchlist'),
        new Parse.Query('LogCategoria'),
        new Parse.Query('Log'),
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
        qSeg.count(),
        qSeguindo.count(),
        qWatch.count(),
        qCat.count(),
        qLogs.find(),
        qCatCompleto.find(),
      ]);

      const logsComReview = logs.filter((l: any) => l.get('review'));

      setStats({
        filmes: logs.length,
        categorias: nCat,
        reviews: logsComReview.length,
        watchlist: nWatch,
        seguidores: nSeg,
        seguindo: nSeguindo,
      });

      // Logs de categoria — monta lista base sem fotos
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

      // Busca fotos em paralelo — atualiza o estado quando chegar
      const itensComFoto: LogCategoriaItem[] = await Promise.all(
        itensBase.map(async (item) => {
          const cat = item.categoria;
          const [fV, fD, fQ] = await Promise.all([
            fetchFotoParaEntrada(item.vencedorReal, cat),
            fetchFotoParaEntrada(item.deveriaTerGanhado, cat),
            fetchFotoParaEntrada(item.queriaQueGanhasse, cat),
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
          res
            .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value)
            .map((r) => r.value)
        );
      }

      // 4 filmes vistos recentes
      const top4 = logs.slice(0, 4);
      const vistos = await Promise.allSettled(
        top4.map(async (l: any) => {
          const f = await getFilme(l.get('filmeId'));
          return f ? { ...f, estatuetas: l.get('estatuetas') || 0, like: l.get('like') || false } : null;
        })
      );
      setFilmesVistos(
        vistos
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value)
          .map((r) => r.value)
      );
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Abre o modal buscando os filmes daquela edição no Parse
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
        tmdbId: f.get('tmdbId'),
        poster: f.get('poster') || null,
        atoresIndicados: f.get('atoresIndicados') || {},
        diretor: f.get('diretor') || null,
        roteiristas: f.get('roteiristas') || [],
        cancao: f.get('cancao') || {},
        vencedores: f.get('vencedores') || [],
      }));
    } catch (e) {
      console.error(e);
    }
    setModalCategoria({ visivel: true, categoria: log.categoria, ano: log.ano, filmes });
  }

  function fecharModal(resultado?: string) {
    setModalCategoria((prev) => ({ ...prev, visivel: false }));
    if (resultado === '__salvo__' || resultado === '__deletado__') {
      carregar();
    }
  }

  if (carregando) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator color={GOLD} size="large" />
      </View>
    );
  }

  const nome = usuario?.get('nome') || usuario?.get('username') || 'Usuário';
  const bio = usuario?.get('bio') || 'Cinéfilo apaixonado por Oscar.';
  const fotoObj = usuario?.get('foto');
  const fotoUrl =
    typeof fotoObj?.url === 'function' ? fotoObj.url() : fotoObj?._url || null;
  const bannerObj = usuario?.get('banner');
  const bannerUrl =
    typeof bannerObj?.url === 'function' ? bannerObj.url() : bannerObj?._url || null;
  const username = usuario?.get('username') || '';

  // Agrupa logs de categoria por ano
  const logsPorAno = logsCategorias.reduce<Record<number, LogCategoriaItem[]>>((acc, log) => {
    if (!acc[log.ano]) acc[log.ano] = [];
    acc[log.ano].push(log);
    return acc;
  }, {});
  const anosOrdenados = Object.keys(logsPorAno).map(Number).sort((a, b) => b - a);

  // 3 categorias mais recentes para a aba perfil
  const categoriasRecentes = logsCategorias.slice(0, 3);

  return (
    <View style={s.root}>
      {/* Header fixo */}
      <View style={s.topBar}>
        <Text style={s.topBarNome}>{nome}</Text>
        <TouchableOpacity onPress={() => router.push('/(autenticado)/configuracoes' as any)}>
          <Ionicons name="settings-outline" size={22} color={GOLD} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Banner + fade + Avatar */}
        <View style={s.bannerWrap}>
          {bannerUrl ? (
            <Image source={{ uri: bannerUrl }} style={s.bannerImg} />
          ) : (
            <View style={s.bannerPlaceholder} />
          )}
          {/* Fade de baixo pro preto */}
          <LinearGradient
            colors={['transparent', BG]}
            style={s.bannerFade}
            pointerEvents="none"
          />
          {/* Avatar fica sobre o fade */}
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

        {/* Nome + bio — sem botão de logout */}
        <View style={s.infoWrap}>
          <Text style={s.nome}>{nome}</Text>
          <Text style={s.bio}>{bio}</Text>
        </View>

        {/* Estatísticas */}
        <View style={s.estatRow}>
          <EstatCard valor={stats.filmes} label="filmes" />
          <EstatCard valor={stats.categorias} label="categorias" />
          <EstatCard valor={stats.reviews} label="reviews" />
          <EstatCard valor={stats.watchlist} label="watchlist" />
          <EstatCard
            valor={stats.seguidores}
            label="seguidores"
            onPress={() => router.push(`/(autenticado)/seguidores?aba=seguidores&username=${username}` as any)}
          />
          <EstatCard
            valor={stats.seguindo}
            label="seguindo"
            onPress={() => router.push(`/(autenticado)/seguidores?aba=seguindo&username=${username}` as any)}
          />
        </View>

        {/* Tabs internas */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.tabsScroll}
          contentContainerStyle={s.tabsContent}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[s.tab, abaAtiva === tab && s.tabAtiva]}
              onPress={() => setAbaAtiva(tab)}
            >
              <Text style={[s.tabTxt, abaAtiva === tab && s.tabTxtAtiva]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Aba: perfil ── */}
        {abaAtiva === 'perfil' && (
          <View style={s.conteudo}>

            {/* Filmes favoritos */}
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
              ) : (
                <Text style={s.vazio}>Nenhum favorito ainda.</Text>
              )}
            </View>

            {/* Recentes */}
            <View style={s.secao}>
              <Text style={s.secaoTitulo}>recentes</Text>
              {filmesVistos.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={s.posterRow}>
                    {filmesVistos.map((f) => (
                      <FilmePoster
                        key={f.id}
                        posterPath={f.poster_path}
                        titulo={f.title}
                        onPress={() => router.push(`/(autenticado)/filmes/${f.id}` as any)}
                        badge={
                          f.estatuetas > 0 ? (
                            <View style={s.badgeWrap}>
                              <Text style={s.badgeIcon}>
                                <Image
                                  source={require('../../../assets/images/oscar2.png')}
                                  style={s.imgOscar}
                                  accessibilityLabel="Oscar"
                                />
                              </Text>
                              <Text style={s.badgeNum}>{f.estatuetas}</Text>
                            </View>
                          ) : undefined
                        }
                      />
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <Text style={s.vazio}>Nenhuma atividade ainda.</Text>
              )}
            </View>

            {/* Categorias recentes — substitui reviews recentes */}
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
                  <LogCategoriaCard
                    key={log.objectId}
                    log={log}
                    onPress={() => abrirModalCategoria(log)}
                  />
                ))
              ) : (
                <Text style={s.vazio}>Nenhum log de categoria ainda.</Text>
              )}
            </View>

          </View>
        )}

        {/* ── Aba: categorias ── */}
        {abaAtiva === 'categorias' && (
          <View style={s.conteudo}>
            {logsCategorias.length === 0 ? (
              <Text style={s.vazio}>Nenhum log de categoria ainda.</Text>
            ) : (
              anosOrdenados.map((ano) => (
                <View key={ano} style={s.secao}>
                  <Text style={s.secaoTitulo}>{ano}</Text>
                  {logsPorAno[ano].map((log) => (
                    <LogCategoriaCard
                      key={log.objectId}
                      log={log}
                      onPress={() => abrirModalCategoria(log)}
                    />
                  ))}
                </View>
              ))
            )}
          </View>
        )}

        {/* ── Outras abas ── */}
        {abaAtiva !== 'perfil' && abaAtiva !== 'categorias' && (
          <View style={s.conteudo}>
            <Text style={s.vazio}>Em breve: {abaAtiva}</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal — visivel começa false */}
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

const POSTER_W = (SCREEN_W - 48 - 30) / 4;
const POSTER_H = POSTER_W * 1.5;
const BANNER_H = 200;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  loadingWrap: { flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  topBarNome: {
    fontFamily: 'serif',
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Banner
  bannerWrap: { position: 'relative', height: BANNER_H },
  bannerImg: { width: '100%', height: BANNER_H, resizeMode: 'cover' },
  bannerPlaceholder: { width: '100%', height: BANNER_H, backgroundColor: '#1a1610' },
  bannerFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: BANNER_H * 0.7, // fade ocupa 70% de baixo do banner
  },
  avatarWrap: {
    position: 'absolute',
    bottom: 16,
    left: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderColor: 'rgba(201,168,76,0.4)',
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: CARD_BG,
    borderWidth: 2,
    borderColor: 'rgba(201,168,76,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetra: { color: GOLD, fontSize: 28, fontWeight: '600' },

  // Info — sem marginTop grande pq o avatar agora fica dentro do banner
  infoWrap: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 },
  nome: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 2 },
  bio: { color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 18, fontFamily: 'Poppins-Regular'},

  // Estatísticas
  estatRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
    marginTop: 4,
  },
  estatCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  estatValor: {
    fontFamily: 'serif',
    fontSize: 20,
    fontWeight: '700',
    color: GOLD,
    lineHeight: 22,
  },
  estatLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 2,
    textAlign: 'center',
  },

  // Tabs
  tabsScroll: { borderBottomWidth: 1, borderBottomColor: BORDER },
  tabsContent: { paddingHorizontal: 16, gap: 4 },
  tab: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabAtiva: { borderBottomColor: GOLD },
  tabTxt: { fontSize: 13, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: 0.5, fontFamily: 'Poppins-Regular' },
  tabTxtAtiva: { color: GOLD },

  // Conteúdo
  conteudo: { padding: 20, gap: 32 },
  secao: { gap: 12 },
  secaoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  secaoTitulo: {
    fontFamily: 'CormorantGaramond-MediumItalic',
    fontSize: 30,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: 0.3,
  },
  secaoVerTudo: {
    fontSize: 12,
    color: GOLD,
    letterSpacing: 0.3,
    fontFamily: 'Poppins-Regular',
  },
  vazio: {
    color: 'rgba(255,255,255,0.3)',
    fontStyle: 'italic',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },

  // Posters
  posterRow: { flexDirection: 'row', gap: 8 },
  poster: {
    width: POSTER_W,
    height: POSTER_H,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    position: 'relative',
  },
  posterImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  posterPlaceholder: {
    backgroundColor: CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    flex: 1,
  },
  posterPlaceholderTxt: { color: 'rgba(255,255,255,0.3)', fontSize: 10, textAlign: 'center' },
  badgeWrap: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10,9,6,0.85)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 2,
  },
  badgeIcon: { fontSize: 10 },
  badgeNum: { color: GOLD, fontSize: 11, fontWeight: '700' },
  imgOscar: { paddingHorizontal: 10, width: 19, height: 19 },

  // ── Log Categoria Card ──
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
  logCatAno: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    fontFamily: 'serif',
  },

  // Fotos em linha
  fotoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  fotoSlotWrap: {
    flex: 1,
    gap: 5,
    alignItems: 'flex-start',
  },
  fotoSlot: {
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
  },
  fotoSlotPessoa: {
    aspectRatio: 2 / 3,
  },
  fotoSlotFilme: {
    aspectRatio: 2 / 3,
  },
  fotoSlotDestaque: {
    borderColor: 'rgba(201,168,76,0.5)',
  },
  fotoSlotImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
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
  fotoSlotNomeDestaque: {
    color: GOLD,
  },

  // Review
  logCatReviewWrap: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
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