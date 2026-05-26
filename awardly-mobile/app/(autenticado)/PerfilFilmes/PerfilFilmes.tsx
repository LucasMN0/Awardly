import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  ScrollView,
  Modal,
} from 'react-native';
import Parse from '../../../lib/parseClient';
import { getFilme, getImageURL } from '../../../lib/tmdb';

const GOLD = '#C9A84C';
const BG = '#0a0906';
const CARD_BG = '#111008';
const BORDER = 'rgba(201,168,76,0.15)';
const { width: SCREEN_W } = Dimensions.get('window');

// 3 colunas com padding lateral
const COL = 3;
const GAP = 8;
const PAD = 16;
const CARD_W = (SCREEN_W - PAD * 2 - GAP * (COL - 1)) / COL;
const CARD_H = CARD_W * 1.5;

// ─── Tipos ────────────────────────────────────────────────────

interface LogItem {
  id: string;
  filmeId: number | string;
  filme: any; // objeto TMDB
  estatuetas: number;
  like: boolean;
  dataAssistido: Date | null;
  review: string;
}

type Ordenacao = 'recente' | 'nota_desc' | 'nota_asc';

// ─── Estatuetas ───────────────────────────────────────────────

function Estatuetas({ valor }: { valor: number }) {
  if (valor <= 0) return null;
  const cheia = Math.floor(valor);
  const meia = valor % 1 >= 0.5;
  const vazia = 5 - cheia - (meia ? 1 : 0);

  return (
    <View style={e.row}>
      {Array.from({ length: cheia }).map((_, i) => (
        <Image key={`c${i}`} source={require('../../../assets/images/oscar2.png')} style={e.img} />
      ))}
      {meia && (
        <View style={e.meiaWrap}>
            <View style={e.meiaCheia}>
            <Image source={require('../../../assets/images/oscar2.png')} style={e.img} />
            </View>
            <View style={e.meiaVazia}>
            {/* imagem deslocada pra mostrar a metade direita */}
            <Image source={require('../../../assets/images/oscar2.png')} style={[e.img, { marginLeft: -6 }]} />
            </View>
        </View>
      )}
      {Array.from({ length: vazia }).map((_, i) => (
        <Image key={`v${i}`} source={require('../../../assets/images/oscar2.png')} style={[e.img, e.imgVazia]} />
      ))}
      <Text style={e.valor}>{valor}</Text>
    </View>
  );
}

const e = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 },
  img: { width: 12, height: 12, resizeMode: 'contain' },
  imgVazia: { opacity: 0.2 },
  meiaWrap: { width: 12, height: 12, flexDirection: 'row' },
  meiaCheia: { width: 6, height: 12, overflow: 'hidden' },
  meiaVazia: { width: 6, height: 12, overflow: 'hidden', opacity: 0.2 },
  valor: { fontFamily: 'Poppins-Medium', fontSize: 10.5, color: GOLD, marginLeft: 2 },
});

// ─── Card de filme ────────────────────────────────────────────

function CardFilme({
  item,
  onPress,
  onEditar,
}: {
  item: LogItem;
  onPress: () => void;
  onEditar: () => void;
}) {
  const url = getImageURL(item.filme?.poster_path, 'w342');

  return (
    <TouchableOpacity style={c.card} onPress={onPress} activeOpacity={0.8}>
      {/* Poster */}
      {url ? (
        <Image source={{ uri: url }} style={c.poster} />
      ) : (
        <View style={c.posterPlaceholder}>
          <Text style={c.posterPlaceholderTxt} numberOfLines={2}>
            {item.filme?.title}
          </Text>
        </View>
      )}

      {/* Badge like */}
      {item.like && (
        <View style={c.likeBadge}>
          <Image source={require('../../../assets/images/envelopecoracao.png')} style={c.likeBadgeImg} />
        </View>
      )}

      {/* Botão editar */}
      <TouchableOpacity style={c.btnEditar} onPress={onEditar} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
        <Image source={require('../../../assets/images/lapis.png')} style={c.lapisImg} />
      </TouchableOpacity>

      {/* Info abaixo do poster */}
      <View style={c.info}>
        <Text style={c.titulo} numberOfLines={1}>{item.filme?.title}</Text>
        <Estatuetas valor={item.estatuetas} />
        {item.filme?.release_date && (
          <Text style={c.ano}>{item.filme.release_date.slice(0, 4)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const c = StyleSheet.create({
  card: { width: CARD_W, marginBottom: 16 },
  poster: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 4,
    resizeMode: 'cover',
    borderWidth: 1,
    borderColor: BORDER,
  },
  posterPlaceholder: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 4,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  posterPlaceholderTxt: {
    fontFamily: 'Poppins-Regular',
    color: 'rgba(255,255,255,0.25)',
    fontSize: 10,
    textAlign: 'center',
  },
  likeBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(10,9,6,0.75)',
    borderRadius: 4,
    padding: 3,
  },
  likeBadgeImg: { width: 14, height: 14, resizeMode: 'contain' },
  btnEditar: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(10,9,6,0.75)',
    borderRadius: 4,
    padding: 4,
  },
  lapisImg: { width: 12, height: 12, resizeMode: 'contain' },
  info: { paddingTop: 5, gap: 1 },
  titulo: {
    fontFamily: 'Poppins-Medium',
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 14,
  },
  ano: {
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
  },
});

// ─── Sheet de filtros ─────────────────────────────────────────

function FiltrosSheet({
  visivel,
  onFechar,
  ordenacao,
  setOrdenacao,
  filtroAno,
  setFiltroAno,
  filtroGenero,
  setFiltroGenero,
  anos,
  generos,
}: {
  visivel: boolean;
  onFechar: () => void;
  ordenacao: Ordenacao;
  setOrdenacao: (v: Ordenacao) => void;
  filtroAno: string;
  setFiltroAno: (v: string) => void;
  filtroGenero: string;
  setFiltroGenero: (v: string) => void;
  anos: string[];
  generos: string[];
}) {
  function ChipRow<T extends string>({
    label,
    opcoes,
    valor,
    onChange,
  }: {
    label: string;
    opcoes: { valor: T; label: string }[];
    valor: T;
    onChange: (v: T) => void;
  }) {
    return (
      <View style={f.grupo}>
        <Text style={f.grupoLabel}>{label}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={f.chips}>
          {opcoes.map((op) => (
            <TouchableOpacity
              key={op.valor}
              style={[f.chip, valor === op.valor && f.chipAtivo]}
              onPress={() => onChange(op.valor)}
              activeOpacity={0.7}
            >
              <Text style={[f.chipTxt, valor === op.valor && f.chipTxtAtivo]}>{op.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={onFechar}>
      <TouchableOpacity style={f.overlay} activeOpacity={1} onPress={onFechar} />
      <View style={f.sheet}>
        <View style={f.handle} />
        <Text style={f.titulo}>filtros</Text>

        <ChipRow
          label="ordenar por"
          opcoes={[
            { valor: 'recente' as Ordenacao, label: 'mais recentes' },
            { valor: 'nota_desc' as Ordenacao, label: 'maior nota' },
            { valor: 'nota_asc' as Ordenacao, label: 'menor nota' },
          ]}
          valor={ordenacao}
          onChange={setOrdenacao}
        />

        {anos.length > 0 && (
          <ChipRow
            label="ano"
            opcoes={[{ valor: '', label: 'todos' }, ...anos.map((a) => ({ valor: a, label: a }))]}
            valor={filtroAno}
            onChange={setFiltroAno}
          />
        )}

        {generos.length > 0 && (
          <ChipRow
            label="gênero"
            opcoes={[{ valor: '', label: 'todos' }, ...generos.map((g) => ({ valor: g, label: g }))]}
            valor={filtroGenero}
            onChange={setFiltroGenero}
          />
        )}

        <TouchableOpacity style={f.btnAplicar} onPress={onFechar} activeOpacity={0.8}>
          <Text style={f.btnAplicarTxt}>aplicar</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const f = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#13110c',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  titulo: {
    fontFamily: 'CormorantGaramond-LightItalic',
    fontSize: 30,
    color: '#fff',
  },
  grupo: { gap: 10 },
  grupoLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.35)',
  },
  chips: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_BG,
  },
  chipAtivo: {
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderColor: 'rgba(201,168,76,0.5)',
  },
  chipTxt: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
  chipTxtAtivo: { color: GOLD },
  btnAplicar: {
    backgroundColor: 'rgba(201,168,76,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnAplicarTxt: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: GOLD,
    letterSpacing: 0.5,
  },
});

// ─── Componente principal ─────────────────────────────────────

interface Props {
  onAbrirFilme: (tmdbId: number | string) => void;
  onAbrirEditar: (item: LogItem) => void;
}

export default function PerfilFilmes({ onAbrirFilme, onAbrirEditar }: Props) {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  const [ordenacao, setOrdenacao] = useState<Ordenacao>('recente');
  const [filtroLike, setFiltroLike] = useState(false);
  const [filtroAno, setFiltroAno] = useState('');
  const [filtroGenero, setFiltroGenero] = useState('');

  const carregar = useCallback(async () => {
    try {
      setCarregando(true);
      const user = await Parse.User.currentAsync();
      if (!user) return;

      const query = new Parse.Query('Log');
      query.equalTo('usuarioId', user);
      query.descending('dataAssistido');
      query.limit(1000);
      const resultados = await query.find();

      const comDetalhes = await Promise.allSettled(
        resultados.map(async (r: any) => {
          const filme = await getFilme(r.get('filmeId'));
          return {
            id: r.id,
            filmeId: r.get('filmeId'),
            filme,
            estatuetas: r.get('estatuetas') || 0,
            like: r.get('like') || false,
            dataAssistido: r.get('dataAssistido') || null,
            review: r.get('review') || '',
          } as LogItem;
        })
      );

      setLogs(
        comDetalhes
          .filter((r): r is PromiseFulfilledResult<LogItem> => r.status === 'fulfilled' && !!r.value.filme)
          .map((r) => r.value)
      );
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const anos = useMemo(() => {
    const set = new Set(
      logs.filter((l) => l.filme?.release_date).map((l) => l.filme.release_date.slice(0, 4))
    );
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [logs]);

  const generos = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => l.filme?.genres?.forEach((g: any) => set.add(g.name)));
    return Array.from(set).sort();
  }, [logs]);

  const logsFiltrados = useMemo(() => {
    let lista = [...logs];
    if (filtroLike) lista = lista.filter((l) => l.like);
    if (filtroAno) lista = lista.filter((l) => l.filme?.release_date?.startsWith(filtroAno));
    if (filtroGenero) lista = lista.filter((l) => l.filme?.genres?.some((g: any) => g.name === filtroGenero));
    if (ordenacao === 'nota_desc') lista.sort((a, b) => b.estatuetas - a.estatuetas);
    else if (ordenacao === 'nota_asc') lista.sort((a, b) => a.estatuetas - b.estatuetas);
    return lista;
  }, [logs, ordenacao, filtroLike, filtroAno, filtroGenero]);

  // Monta linhas de 3 para o FlatList
  const linhas = useMemo(() => {
    const rows: LogItem[][] = [];
    for (let i = 0; i < logsFiltrados.length; i += COL) {
      rows.push(logsFiltrados.slice(i, i + COL));
    }
    return rows;
  }, [logsFiltrados]);

  // Conta filtros ativos para o badge
  const filtrosAtivos =
    (filtroLike ? 1 : 0) + (filtroAno ? 1 : 0) + (filtroGenero ? 1 : 0) + (ordenacao !== 'recente' ? 1 : 0);

  if (carregando) {
    return (
      <View style={p.loadingWrap}>
        <ActivityIndicator color={GOLD} />
      </View>
    );
  }

  return (
    <View style={p.root}>
      {/* Barra de controles */}
      <View style={p.bar}>
        <Text style={p.contagem}>
          {logsFiltrados.length} filme{logsFiltrados.length !== 1 ? 's' : ''}
        </Text>

        <View style={p.barDireita}>
          {/* Like toggle */}
          <TouchableOpacity
            style={[p.btnLike, filtroLike && p.btnLikeAtivo]}
            onPress={() => setFiltroLike((v) => !v)}
            activeOpacity={0.7}
          >
            <Image
              source={require('../../../assets/images/envelopecoracao.png')}
              style={[p.likeImg, filtroLike && p.likeImgAtivo]}
            />
          </TouchableOpacity>

          {/* Filtros */}
          <TouchableOpacity
            style={[p.btnFiltros, filtrosAtivos > 0 && p.btnFiltrosAtivo]}
            onPress={() => setFiltrosAbertos(true)}
            activeOpacity={0.7}
          >
            <Text style={[p.btnFiltrosTxt, filtrosAtivos > 0 && p.btnFiltrosTxtAtivo]}>
              filtros{filtrosAtivos > 0 ? ` (${filtrosAtivos})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Grade de filmes */}
      {logsFiltrados.length === 0 ? (
        <View style={p.vazioWrap}>
          <Text style={p.vazioTxt}>Nenhum filme encontrado.</Text>
          <Text style={p.vazioDica}>Tente mudar os filtros.</Text>
        </View>
      ) : (
        <FlatList
          data={linhas}
          keyExtractor={(_, i) => String(i)}
          scrollEnabled={false} // scroll fica no pai (perfil.tsx)
          contentContainerStyle={p.grade}
          renderItem={({ item: linha }) => (
            <View style={p.linha}>
              {linha.map((item) => (
                <CardFilme
                  key={item.id}
                  item={item}
                  onPress={() => onAbrirFilme(item.filmeId)}
                  onEditar={() => onAbrirEditar(item)}
                />
              ))}
              {/* Preenche colunas vazias na última linha */}
              {linha.length < COL &&
                Array.from({ length: COL - linha.length }).map((_, i) => (
                  <View key={`empty${i}`} style={{ width: CARD_W }} />
                ))}
            </View>
          )}
        />
      )}

      {/* Sheet de filtros */}
      <FiltrosSheet
        visivel={filtrosAbertos}
        onFechar={() => setFiltrosAbertos(false)}
        ordenacao={ordenacao}
        setOrdenacao={setOrdenacao}
        filtroAno={filtroAno}
        setFiltroAno={setFiltroAno}
        filtroGenero={filtroGenero}
        setFiltroGenero={setFiltroGenero}
        anos={anos}
        generos={generos}
      />
    </View>
  );
}

const p = StyleSheet.create({
  root: { flex: 1 },
  loadingWrap: { paddingVertical: 48, alignItems: 'center' },

  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PAD,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  contagem: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.35)',
  },
  barDireita: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  btnLike: {
    padding: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_BG,
  },
  btnLikeAtivo: {
    borderColor: 'rgba(201,168,76,0.4)',
    backgroundColor: 'rgba(201,168,76,0.1)',
  },
  likeImg: { width: 18, height: 18, resizeMode: 'contain', opacity: 0.4 },
  likeImgAtivo: { opacity: 1 },

  btnFiltros: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_BG,
  },
  btnFiltrosAtivo: {
    borderColor: 'rgba(201,168,76,0.4)',
    backgroundColor: 'rgba(201,168,76,0.1)',
  },
  btnFiltrosTxt: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  btnFiltrosTxtAtivo: { color: GOLD },

  grade: { padding: PAD, gap: 0 },
  linha: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: 0,
  },

  vazioWrap: { paddingVertical: 48, alignItems: 'center', gap: 6 },
  vazioTxt: {
    fontFamily: 'CormorantGaramond-LightItalic',
    fontSize: 18,
    color: 'rgba(255,255,255,0.3)',
  },
  vazioDica: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.2)',
  },
});