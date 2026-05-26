import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import Parse from '../../../lib/parseClient';
import {
  getFilme,
  getFilmeCreditos,
  getFilmeImagens,
  getImageURL,
} from '../../../lib/tmdb';

const GOLD = '#C9A84C';
const BG = '#0a0906';
const CARD_BG = '#111008';
const BORDER = 'rgba(201,168,76,0.15)';
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const BACKDROP_H = SCREEN_H * 0.38;

const TMDB_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const TMDB_BASE = process.env.EXPO_PUBLIC_TMDB_BASE_URL || 'https://api.themoviedb.org/3';

// ─── Helpers Parse ────────────────────────────────────────────

async function verificarWatchlist(tmdbId: number) {
  const user = await Parse.User.currentAsync();
  if (!user) return false;
  const q = new Parse.Query('Watchlist');
  q.equalTo('usuarioId', user);
  q.equalTo('filmeId', tmdbId);
  return !!(await q.first());
}

async function toggleWatchlist(tmdbId: number, estaNA: boolean) {
  const user = await Parse.User.currentAsync();
  if (!user) return;
  if (estaNA) {
    const q = new Parse.Query('Watchlist');
    q.equalTo('usuarioId', user);
    q.equalTo('filmeId', tmdbId);
    const obj = await q.first();
    if (obj) await obj.destroy();
  } else {
    const Watchlist = Parse.Object.extend('Watchlist');
    const item = new Watchlist();
    item.set('usuarioId', user);
    item.set('filmeId', tmdbId);
    item.set('oscarAno', 0);
    const acl = new Parse.ACL();
    acl.setPublicReadAccess(true);
    acl.setWriteAccess(user, true);
    item.setACL(acl);
    await item.save();
  }
}

async function buscarCategoriasFilme(tmdbId: number) {
  const Filme = Parse.Object.extend('Filme');
  const query = new Parse.Query(Filme);
  query.equalTo('tmdbId', tmdbId);
  const resultados = await query.find();
  const todasCategorias = new Set<string>();
  const todosVencedores = new Set<string>();
  resultados.forEach((f: any) => {
    (f.get('categorias') || []).forEach((c: string) => todasCategorias.add(c));
    (f.get('vencedores') || []).forEach((v: string) => todosVencedores.add(v));
  });
  return {
    categorias: [...todasCategorias],
    vencedores: [...todosVencedores],
  };
}

// ─── Estatuetas interativas ───────────────────────────────────

function Estatuetas({ valor, onChange }: { valor: number; onChange: (v: number) => void }) {
  // No mobile usamos toque simples: toque na metade esquerda = meia, direita = cheia
  // Implementado via 5 botões divididos em 2 zonas cada
  return (
    <View style={est.row}>
      {[1, 2, 3, 4, 5].map((i) => {
        const cheia = valor >= i;
        const meia = !cheia && valor >= i - 0.5;
        return (
          <View key={i} style={est.slotWrap}>
            {/* zona esquerda = meia estatueta */}
            <TouchableOpacity
              style={est.zonaEsq}
              onPress={() => onChange(valor === i - 0.5 ? 0 : i - 0.5)}
              activeOpacity={0.7}
            />
            {/* zona direita = estatueta cheia */}
            <TouchableOpacity
              style={est.zonaDireita}
              onPress={() => onChange(valor === i ? 0 : i)}
              activeOpacity={0.7}
            />
            {/* imagem renderizada em cima, sem capturar eventos */}
            <View pointerEvents="none" style={est.imgWrap}>
              {cheia ? (
                <Image source={require('../../../assets/images/oscar2.png')} style={est.img} />
              ) : meia ? (
                <View style={est.meiaWrap}>
                  <Image source={require('../../../assets/images/oscar2.png')} style={[est.img, est.meiaCheia]} />
                  <Image source={require('../../../assets/images/oscar2.png')} style={[est.img, est.meiaVazia]} />
                </View>
              ) : (
                <Image source={require('../../../assets/images/oscar2.png')} style={[est.img, est.imgVazia]} />
              )}
            </View>
          </View>
        );
      })}
      {valor > 0 && <Text style={est.valor}>{valor}</Text>}
    </View>
  );
}

const est = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 4 },
  slotWrap: { width: 38, height: 38, position: 'relative' },
  zonaEsq: { position: 'absolute', left: 0, top: 0, width: 19, height: 38, zIndex: 2 },
  zonaDireita: { position: 'absolute', right: 0, top: 0, width: 19, height: 38, zIndex: 2 },
  imgWrap: { position: 'absolute', left: 0, top: 0, width: 38, height: 38, zIndex: 1 },
  img: { width: 38, height: 38, resizeMode: 'contain' },
  imgVazia: { opacity: 0.25 },
  meiaWrap: { width: 38, height: 38, position: 'relative' },
  meiaCheia: { position: 'absolute', left: 0, top: 0 },
  meiaVazia: { position: 'absolute', left: 0, top: 0, opacity: 0.25 },
  valor: { fontFamily: 'Poppins-SemiBold', fontSize: 16, color: GOLD, marginLeft: 6 },
});

// ─── Painel de log (novo) ─────────────────────────────────────

function PainelLog({
  tmdbId,
  onSalvo,
  onFechar,
}: {
  tmdbId: number;
  onSalvo: () => void;
  onFechar: () => void;
}) {
  const hoje = new Date().toISOString().split('T')[0];
  const [data, setData] = useState(hoje);
  const [estatuetas, setEstatuetas] = useState(0);
  const [like, setLike] = useState(false);
  const [review, setReview] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar() {
    const user = await Parse.User.currentAsync();
    if (!user) { Alert.alert('Erro', 'Você precisa estar logado.'); return; }
    setSalvando(true);
    try {
      const Log = Parse.Object.extend('Log');
      const log = new Log();
      log.set('usuarioId', user);
      log.set('filmeId', tmdbId);
      log.set('dataAssistido', new Date(data + 'T12:00:00'));
      log.set('estatuetas', estatuetas);
      log.set('like', like);
      if (review.trim()) log.set('review', review.trim());
      const acl = new Parse.ACL();
      acl.setPublicReadAccess(true);
      acl.setWriteAccess(user, true);
      log.setACL(acl);
      await log.save();
      // Remove da watchlist se estava
      try {
        const qW = new Parse.Query('Watchlist');
        qW.equalTo('usuarioId', user);
        qW.equalTo('filmeId', tmdbId);
        const item = await qW.first();
        if (item) await item.destroy();
      } catch {}
      onSalvo();
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível registrar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <View style={pl.painel}>
      {/* Data */}
      <View style={pl.campo}>
        <Text style={pl.label}>quando assistiu?</Text>
        <TextInput
          style={pl.inputData}
          value={data}
          onChangeText={setData}
          placeholder="AAAA-MM-DD"
          placeholderTextColor="rgba(255,255,255,0.2)"
          keyboardType="numeric"
          maxLength={10}
        />
      </View>

      {/* Nota */}
      <View style={pl.campo}>
        <Text style={pl.label}>nota</Text>
        <Estatuetas valor={estatuetas} onChange={setEstatuetas} />
      </View>

      {/* Like */}
      <View style={pl.campo}>
        <Text style={pl.label}>curtiu?</Text>
        <TouchableOpacity
          style={[pl.btnLike, like && pl.btnLikeAtivo]}
          onPress={() => setLike((v) => !v)}
          activeOpacity={0.7}
        >
          <Image
            source={
              like
                ? require('../../../assets/images/envelopecoracao.png')
                : require('../../../assets/images/envelope.png')
            }
            style={pl.envelope}
          />
          <Text style={[pl.btnLikeTxt, like && pl.btnLikeTxtAtivo]}>
            {like ? 'amei!' : 'gostei?'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Review */}
      <View style={pl.campo}>
        <Text style={pl.label}>
          review <Text style={pl.opcional}>(opcional)</Text>
        </Text>
        <TextInput
          style={pl.textarea}
          value={review}
          onChangeText={setReview}
          placeholder="O que você achou?"
          placeholderTextColor="rgba(255,255,255,0.2)"
          multiline
          numberOfLines={3}
          maxLength={500}
          textAlignVertical="top"
        />
      </View>

      {/* Ações */}
      <View style={pl.acoes}>
        <TouchableOpacity style={pl.btnCancelar} onPress={onFechar} activeOpacity={0.7}>
          <Text style={pl.btnCancelarTxt}>cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={pl.btnSalvar} onPress={handleSalvar} disabled={salvando} activeOpacity={0.8}>
          {salvando
            ? <ActivityIndicator color={BG} size="small" />
            : <Text style={pl.btnSalvarTxt}>registrar</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const pl = StyleSheet.create({
  painel: {
    backgroundColor: '#13110c',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 14,
    marginTop: 12,
  },
  campo: { gap: 6 },
  label: {
    fontFamily: 'Poppins-Medium',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.35)',
  },
  opcional: {
    fontFamily: 'Poppins-Regular',
    fontSize: 10,
    color: 'rgba(255,255,255,0.2)',
    textTransform: 'none',
  },
  inputData: {
    fontFamily: 'Poppins-Regular',
    color: '#fff',
    fontSize: 14,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  btnLike: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_BG,
    alignSelf: 'flex-start',
  },
  btnLikeAtivo: {
    borderColor: 'rgba(201,168,76,0.4)',
    backgroundColor: 'rgba(201,168,76,0.08)',
  },
  envelope: { width: 20, height: 20, resizeMode: 'contain' },
  btnLikeTxt: { fontFamily: 'Poppins-Regular', fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  btnLikeTxtAtivo: { color: GOLD },
  textarea: {
    fontFamily: 'Poppins-Regular',
    color: '#fff',
    fontSize: 13,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 72,
  },
  acoes: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btnCancelar: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
  },
  btnCancelarTxt: { fontFamily: 'Poppins-Medium', fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  btnSalvar: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSalvarTxt: { fontFamily: 'Poppins-SemiBold', fontSize: 13, color: BG },
});

// ─── Tela principal ───────────────────────────────────────────

export default function FilmeDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const tmdbId = Number(id);

  const [filme, setFilme] = useState<any>(null);
  const [elenco, setElenco] = useState<any[]>([]);
  const [imagens, setImagens] = useState<any[]>([]);
  const [trailer, setTrailer] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [vencedores, setVencedores] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [naWatchlist, setNaWatchlist] = useState(false);
  const [salvandoWatch, setSalvandoWatch] = useState(false);
  const [logAberto, setLogAberto] = useState(false);
  const [logExistente, setLogExistente] = useState<any>(null);

  const [imagemAberta, setImagemAberta] = useState<string | null>(null);
  const [trailerAberto, setTrailerAberto] = useState(false);

  useEffect(() => {
    async function carregar() {
      try {
        const [detalhes, creditos, releases, videos, imgs, dadosOscar] = await Promise.all([
          getFilme(tmdbId),
          getFilmeCreditos(tmdbId),
          fetch(`${TMDB_BASE}/movie/${tmdbId}/release_dates?api_key=${TMDB_KEY}`).then((r) => r.json()),
          fetch(`${TMDB_BASE}/movie/${tmdbId}/videos?api_key=${TMDB_KEY}&language=pt-BR`).then((r) => r.json()),
          getFilmeImagens(tmdbId),
          buscarCategoriasFilme(tmdbId),
        ]);

        const brRelease = releases.results?.find((r: any) => r.iso_3166_1 === 'BR');
        const classificacaoBR = brRelease?.release_dates?.[0]?.certification || null;

        const trailerYT =
          videos.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') ||
          videos.results?.find((v: any) => v.site === 'YouTube');

        const JOBS_ROT = ['Screenplay', 'Story', 'Writer', 'Original Story', 'Idea'];
        const diretores = creditos.crew
          ?.filter((p: any) => p.job === 'Director')
          .map((p: any) => p.name)
          .join(', ') || null;
        const roteiristas = creditos.crew
          ?.filter((p: any) => JOBS_ROT.includes(p.job))
          .map((p: any) => p.name)
          .filter((n: string, i: number, arr: string[]) => arr.indexOf(n) === i)
          .join(', ') || null;

        setFilme({
          titulo: detalhes.title,
          tituloOriginal: detalhes.original_title,
          sinopse: detalhes.overview,
          backdrop: getImageURL(detalhes.backdrop_path, 'original'),
          poster: getImageURL(detalhes.poster_path, 'w342'),
          ano: detalhes.release_date?.split('-')[0],
          duracao: detalhes.runtime
            ? `${Math.floor(detalhes.runtime / 60)}h ${detalhes.runtime % 60}min`
            : null,
          nota: detalhes.vote_average?.toFixed(1),
          generos: detalhes.genres?.map((g: any) => g.name) || [],
          classificacao: classificacaoBR,
          diretor: diretores,
          roteiristas,
          tmdbId: detalhes.id,
        });

        setElenco(creditos.cast?.filter((a: any) => a.profile_path).slice(0, 20) || []);
        setTrailer(trailerYT?.key || null);
        setImagens(imgs.backdrops?.slice(0, 20) || []);
        setCategorias(dadosOscar.categorias);
        setVencedores(dadosOscar.vencedores);

        const user = await Parse.User.currentAsync();
        if (user) {
          const [naW, logRecente] = await Promise.all([
            verificarWatchlist(tmdbId),
            (async () => {
              const q = new Parse.Query('Log');
              q.equalTo('usuarioId', user);
              q.equalTo('filmeId', tmdbId);
              q.descending('createdAt');
              return q.first();
            })(),
          ]);
          setNaWatchlist(naW);
          if (logRecente) {
            setLogExistente({
              id: logRecente.id,
              estatuetas: logRecente.get('estatuetas') || 0,
              like: logRecente.get('like') || false,
              review: logRecente.get('review') || '',
              data: logRecente.get('dataAssistido')
                ? new Date(logRecente.get('dataAssistido')).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0],
            });
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, [tmdbId]);

  async function recarregarLog() {
    const user = await Parse.User.currentAsync();
    if (!user) return;
    const q = new Parse.Query('Log');
    q.equalTo('usuarioId', user);
    q.equalTo('filmeId', tmdbId);
    q.descending('createdAt');
    const l = await q.first();
    if (l) {
      setLogExistente({
        id: l.id,
        estatuetas: l.get('estatuetas') || 0,
        like: l.get('like') || false,
        review: l.get('review') || '',
        data: l.get('dataAssistido')
          ? new Date(l.get('dataAssistido')).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
      });
    } else {
      setLogExistente(null);
    }
  }

  async function handleWatchlist() {
    if (salvandoWatch) return;
    setSalvandoWatch(true);
    try {
      await toggleWatchlist(tmdbId, naWatchlist);
      setNaWatchlist((v) => !v);
    } catch (e) {
      console.error(e);
    } finally {
      setSalvandoWatch(false);
    }
  }

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator color={GOLD} size="large" />
      </View>
    );
  }

  if (!filme) {
    return (
      <View style={s.loadingWrap}>
        <Text style={s.erroTxt}>Filme não encontrado.</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Botão voltar fixo */}
      <TouchableOpacity style={s.btnVoltar} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Hero: backdrop + fade + poster ── */}
        <View style={s.heroWrap}>
          {filme.backdrop ? (
            <Image source={{ uri: filme.backdrop }} style={s.backdrop} />
          ) : (
            <View style={[s.backdrop, { backgroundColor: '#1a1610' }]} />
          )}
          <LinearGradient
            colors={['transparent', BG]}
            style={s.backdropFade}
            pointerEvents="none"
          />
          <View style={s.heroConteudo}>
            <Image source={{ uri: filme.poster }} style={s.poster} />
            <View style={s.heroInfo}>
              <Text style={s.titulo}>{filme.titulo}</Text>
              {filme.tituloOriginal !== filme.titulo && (
                <Text style={s.tituloOriginal}>{filme.tituloOriginal}</Text>
              )}
              <Text style={s.meta}>
                {[filme.ano, filme.duracao, filme.nota ? `⭐ ${filme.nota}` : null, filme.classificacao]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              {/* Gêneros */}
              <View style={s.tagsRow}>
                {filme.generos.map((g: string) => (
                  <View key={g} style={s.tag}>
                    <Text style={s.tagTxt}>{g}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={s.corpo}>

          {/* Créditos */}
          {(filme.diretor || filme.roteiristas) && (
            <View style={s.creditos}>
              {filme.diretor && (
                <View style={s.creditoItem}>
                  <Text style={s.creditoLabel}>Direção</Text>
                  <Text style={s.creditoValor}>{filme.diretor}</Text>
                </View>
              )}
              {filme.roteiristas && (
                <View style={s.creditoItem}>
                  <Text style={s.creditoLabel}>Roteiro</Text>
                  <Text style={s.creditoValor}>{filme.roteiristas}</Text>
                </View>
              )}
            </View>
          )}

          {/* Ações: registrar + watchlist */}
          <View style={s.acoesRow}>
            <TouchableOpacity
              style={[s.btnAcao, logAberto && s.btnAcaoAtivo]}
              onPress={() => setLogAberto((v) => !v)}
              activeOpacity={0.8}
            >
              <Text style={[s.btnAcaoTxt, logAberto && s.btnAcaoTxtAtivo]}>
                {logAberto ? '✕ cancelar' : logExistente ? '✎ editar log' : '+ registrar'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btnAcao, naWatchlist && s.btnAcaoAtivo]}
              onPress={handleWatchlist}
              disabled={salvandoWatch}
              activeOpacity={0.8}
            >
              {salvandoWatch
                ? <ActivityIndicator color={GOLD} size="small" />
                : <Text style={[s.btnAcaoTxt, naWatchlist && s.btnAcaoTxtAtivo]}>
                    {naWatchlist ? '✓ watchlist' : '+ watchlist'}
                  </Text>
              }
            </TouchableOpacity>
          </View>

          {/* Painel de log */}
          {logAberto && (
            <PainelLog
              tmdbId={tmdbId}
              onFechar={() => setLogAberto(false)}
              onSalvo={() => {
                setLogAberto(false);
                setNaWatchlist(false);
                recarregarLog();
              }}
            />
          )}

          {/* Prêmios Oscar */}
          {categorias.length > 0 && (
            <View style={s.secao}>
              <Text style={s.secaoTitulo}>Prêmios e Indicações</Text>
              <View style={s.categoriasWrap}>
                {categorias.map((cat) => {
                  const venceu = vencedores.includes(cat);
                  return (
                    <View key={cat} style={[s.catTag, venceu && s.catTagVencedor]}>
                      {venceu && (
                        <Image
                          source={require('../../../assets/images/oscar2.png')}
                          style={s.catOscarImg}
                        />
                      )}
                      <Text style={[s.catTagTxt, venceu && s.catTagTxtVencedor]}>{cat}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Sinopse */}
          {filme.sinopse && (
            <View style={s.secao}>
              <Text style={s.secaoTitulo}>Sinopse</Text>
              <Text style={s.sinopse}>{filme.sinopse}</Text>
            </View>
          )}

          {/* Elenco */}
          {elenco.length > 0 && (
            <View style={s.secao}>
              <Text style={s.secaoTitulo}>Elenco</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.elencoScroll}>
                {elenco.map((ator) => (
                  <TouchableOpacity
                    key={ator.id}
                    style={s.atorCard}
                    onPress={() => router.push(`/(autenticado)/atores/${ator.id}` as any)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: getImageURL(ator.profile_path, 'w185') || '' }}
                      style={s.atorFoto}
                    />
                    <Text style={s.atorNome} numberOfLines={2}>{ator.name}</Text>
                    <Text style={s.atorPersonagem} numberOfLines={1}>{ator.character}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Trailer */}
          {trailer && (
            <View style={s.secao}>
              <Text style={s.secaoTitulo}>Trailer</Text>
              <TouchableOpacity style={s.trailerThumb} onPress={() => setTrailerAberto(true)} activeOpacity={0.8}>
                <Image
                  source={{ uri: `https://img.youtube.com/vi/${trailer}/hqdefault.jpg` }}
                  style={s.trailerThumbImg}
                />
                <View style={s.playBtn}>
                  <Ionicons name="play" size={28} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Imagens */}
          {imagens.length > 0 && (
            <View style={s.secao}>
              <Text style={s.secaoTitulo}>Imagens</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {imagens.map((img, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setImagemAberta(getImageURL(img.file_path, 'original'))}
                    activeOpacity={0.85}
                    style={s.imgCard}
                  >
                    <Image
                      source={{ uri: getImageURL(img.file_path, 'w780') || '' }}
                      style={s.imgCardImg}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Lightbox de imagem */}
      <Modal visible={!!imagemAberta} transparent animationType="fade" onRequestClose={() => setImagemAberta(null)}>
        <TouchableOpacity style={s.lightbox} activeOpacity={1} onPress={() => setImagemAberta(null)}>
          <TouchableOpacity
            style={s.lightboxFechar}
            onPress={() => setImagemAberta(null)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          {imagemAberta && (
            <Image
              source={{ uri: imagemAberta }}
              style={s.lightboxImg}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
      </Modal>

      {/* Modal trailer */}
      <Modal visible={trailerAberto} transparent animationType="slide" onRequestClose={() => setTrailerAberto(false)}>
        <View style={s.trailerModal}>
          <TouchableOpacity style={s.trailerFechar} onPress={() => setTrailerAberto(false)}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          {trailer && (
            <WebView
              style={s.trailerWebview}
              source={{ uri: `https://www.youtube.com/embed/${trailer}?autoplay=1` }}
              allowsFullscreenVideo
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const POSTER_W = 110;
const POSTER_H = POSTER_W * 1.5;
const ATOR_W = 90;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  loadingWrap: { flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
  erroTxt: { fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.4)', fontSize: 14 },

  btnVoltar: {
    position: 'absolute',
    top: 52,
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(10,9,6,0.7)',
    borderRadius: 20,
    padding: 8,
  },

  // Hero
  heroWrap: { position: 'relative', height: BACKDROP_H + POSTER_H * 0.5 },
  backdrop: { width: '100%', height: BACKDROP_H, resizeMode: 'cover' },
  backdropFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: BACKDROP_H * 0.75,
  },
  heroConteudo: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-end',
  },
  poster: {
    width: POSTER_W,
    height: POSTER_H,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.25)',
  },
  heroInfo: { flex: 1, gap: 5, paddingBottom: 4 },
  titulo: {
    fontFamily: 'CormorantGaramond-Regular',
    fontSize: 22,
    color: '#fff',
    lineHeight: 26,
  },
  tituloOriginal: {
    fontFamily: 'CormorantGaramond-LightItalic',
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
  },
  meta: {
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: BORDER,
  },
  tagTxt: { fontFamily: 'Poppins-Regular', fontSize: 10, color: 'rgba(255,255,255,0.5)' },

  // Corpo
  corpo: { paddingHorizontal: 16, paddingTop: 20, gap: 24 },

  // Créditos
  creditos: { gap: 8 },
  creditoItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  creditoLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: GOLD,
    width: 56,
    paddingTop: 1,
  },
  creditoValor: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    flex: 1,
  },

  // Ações
  acoesRow: { flexDirection: 'row', gap: 10 },
  btnAcao: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAcaoAtivo: {
    borderColor: 'rgba(201,168,76,0.4)',
    backgroundColor: 'rgba(201,168,76,0.1)',
  },
  btnAcaoTxt: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  btnAcaoTxtAtivo: { color: GOLD },

  // Seções
  secao: { gap: 12 },
  secaoTitulo: {
    fontFamily: 'CormorantGaramond-MediumItalic',
    fontSize: 20,
    color: '#fff',
    letterSpacing: 0.3,
  },

  // Categorias Oscar
  categoriasWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_BG,
  },
  catTagVencedor: {
    borderColor: 'rgba(201,168,76,0.4)',
    backgroundColor: 'rgba(201,168,76,0.08)',
  },
  catOscarImg: { width: 14, height: 14, resizeMode: 'contain' },
  catTagTxt: {
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  catTagTxtVencedor: { color: GOLD },

  // Sinopse
  sinopse: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 21,
  },

  // Elenco
  elencoScroll: { marginHorizontal: -16, paddingHorizontal: 16 },
  atorCard: { width: ATOR_W, marginRight: 12 },
  atorFoto: {
    width: ATOR_W,
    height: ATOR_W * 1.5,
    borderRadius: 4,
    resizeMode: 'cover',
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 5,
  },
  atorNome: {
    fontFamily: 'Poppins-Medium',
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 13,
  },
  atorPersonagem: {
    fontFamily: 'Poppins-Regular',
    fontSize: 9,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 2,
  },

  // Trailer
  trailerThumb: {
    width: '100%',
    height: (SCREEN_W - 32) * (9 / 16),
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: BORDER,
  },
  trailerThumbImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  playBtn: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -28 }, { translateY: -28 }],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Imagens
  imgCard: { marginRight: 10 },
  imgCardImg: {
    width: SCREEN_W * 0.65,
    height: (SCREEN_W * 0.65) * (9 / 16),
    borderRadius: 6,
    resizeMode: 'cover',
    borderWidth: 1,
    borderColor: BORDER,
  },

  // Lightbox
  lightbox: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxFechar: {
    position: 'absolute',
    top: 52,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  lightboxImg: {
    width: SCREEN_W,
    height: SCREEN_H * 0.7,
  },

  // Modal trailer
  trailerModal: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  trailerFechar: {
    position: 'absolute',
    top: 52,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  trailerWebview: {
    width: SCREEN_W,
    height: SCREEN_W * (9 / 16),
  },
});