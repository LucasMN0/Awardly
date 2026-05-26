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
  Alert,
} from 'react-native';
import Parse from '../../../lib/parseClient';
import { getFilme, getImageURL } from '../../../lib/tmdb';

const GOLD = '#C9A84C';
const BG = '#0a0906';
const CARD_BG = '#111008';
const BORDER = 'rgba(201,168,76,0.15)';
const { width: SCREEN_W } = Dimensions.get('window');

const COL = 3;
const GAP = 8;
const PAD = 16;
const CARD_W = (SCREEN_W - PAD * 2 - GAP * (COL - 1)) / COL;
const CARD_H = CARD_W * 1.5;

// ─── Tipos ────────────────────────────────────────────────────

interface WatchlistItem {
  id: string;           // objectId do Parse
  filmeId: number | string;
  filme: any;           // objeto TMDB
  addedAt: Date | null;
}

type Ordenacao = 'recente' | 'titulo_asc' | 'titulo_desc';

// ─── Card de filme ────────────────────────────────────────────

function CardWatchlist({
  item,
  onPress,
  onRemover,
}: {
  item: WatchlistItem;
  onPress: () => void;
  onRemover: () => void;
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

      {/* Botão: remover da watchlist */}
      <TouchableOpacity
        style={c.btnRemover}
        onPress={onRemover}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Text style={c.btnRemoverTxt}>✕</Text>
      </TouchableOpacity>

      {/* Info abaixo do poster */}
      <View style={c.info}>
        <Text style={c.titulo} numberOfLines={1}>{item.filme?.title}</Text>
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
  btnRemover: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(10,9,6,0.75)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  btnRemoverTxt: {
    fontFamily: 'Poppins-Medium',
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 14,
  },
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
      <View style={fs.grupo}>
        <Text style={fs.grupoLabel}>{label}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={fs.chips}>
          {opcoes.map((op) => (
            <TouchableOpacity
              key={op.valor}
              style={[fs.chip, valor === op.valor && fs.chipAtivo]}
              onPress={() => onChange(op.valor)}
              activeOpacity={0.7}
            >
              <Text style={[fs.chipTxt, valor === op.valor && fs.chipTxtAtivo]}>{op.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={onFechar}>
      <TouchableOpacity style={fs.overlay} activeOpacity={1} onPress={onFechar} />
      <View style={fs.sheet}>
        <View style={fs.handle} />
        <Text style={fs.titulo}>filtros</Text>

        <ChipRow
          label="ordenar por"
          opcoes={[
            { valor: 'recente' as Ordenacao, label: 'mais recentes' },
            { valor: 'titulo_asc' as Ordenacao, label: 'a → z' },
            { valor: 'titulo_desc' as Ordenacao, label: 'z → a' },
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

        <TouchableOpacity style={fs.btnAplicar} onPress={onFechar} activeOpacity={0.8}>
          <Text style={fs.btnAplicarTxt}>aplicar</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const fs = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
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
}

export default function PerfilWatchlist({ onAbrirFilme }: Props) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  const [ordenacao, setOrdenacao] = useState<Ordenacao>('recente');
  const [filtroAno, setFiltroAno] = useState('');
  const [filtroGenero, setFiltroGenero] = useState('');

  const carregar = useCallback(async () => {
    try {
      setCarregando(true);
      const user = await Parse.User.currentAsync();
      if (!user) return;

      const query = new Parse.Query('Watchlist');
      query.equalTo('usuarioId', user);
      query.descending('createdAt');
      query.limit(1000);
      const resultados = await query.find();

      const comDetalhes = await Promise.allSettled(
        resultados.map(async (r: any) => {
          const filme = await getFilme(r.get('filmeId'));
          return {
            id: r.id,
            filmeId: r.get('filmeId'),
            filme,
            addedAt: r.createdAt || null,
          } as WatchlistItem;
        })
      );

      setItems(
        comDetalhes
          .filter((r): r is PromiseFulfilledResult<WatchlistItem> => r.status === 'fulfilled' && !!r.value.filme)
          .map((r) => r.value)
      );
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const remover = useCallback(async (item: WatchlistItem) => {
    Alert.alert(
      'Remover da watchlist',
      `Remover "${item.filme?.title}" da sua watchlist?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              const obj = Parse.Object.extend('Watchlist');
              const ref = new obj();
              ref.id = item.id;
              await ref.destroy();
              setItems((prev) => prev.filter((i) => i.id !== item.id));
            } catch (e) {
              console.error(e);
            }
          },
        },
      ]
    );
  }, []);

  // ─── Derivados ───────────────────────────────────────────────

  const anos = useMemo(() => {
    const set = new Set(
      items.filter((i) => i.filme?.release_date).map((i) => i.filme.release_date.slice(0, 4))
    );
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [items]);

  const generos = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.filme?.genres?.forEach((g: any) => set.add(g.name)));
    return Array.from(set).sort();
  }, [items]);

  const itemsFiltrados = useMemo(() => {
    let lista = [...items];
    if (filtroAno) lista = lista.filter((i) => i.filme?.release_date?.startsWith(filtroAno));
    if (filtroGenero) lista = lista.filter((i) => i.filme?.genres?.some((g: any) => g.name === filtroGenero));
    if (ordenacao === 'titulo_asc') lista.sort((a, b) => (a.filme?.title || '').localeCompare(b.filme?.title || ''));
    else if (ordenacao === 'titulo_desc') lista.sort((a, b) => (b.filme?.title || '').localeCompare(a.filme?.title || ''));
    // 'recente' já vem ordenado por createdAt desc do Parse
    return lista;
  }, [items, ordenacao, filtroAno, filtroGenero]);

  // Monta linhas de 3 para o FlatList
  const linhas = useMemo(() => {
    const rows: WatchlistItem[][] = [];
    for (let i = 0; i < itemsFiltrados.length; i += COL) {
      rows.push(itemsFiltrados.slice(i, i + COL));
    }
    return rows;
  }, [itemsFiltrados]);

  const filtrosAtivos =
    (filtroAno ? 1 : 0) + (filtroGenero ? 1 : 0) + (ordenacao !== 'recente' ? 1 : 0);

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
          {itemsFiltrados.length} filme{itemsFiltrados.length !== 1 ? 's' : ''}
        </Text>

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

      {/* Grade de filmes */}
      {itemsFiltrados.length === 0 ? (
        <View style={p.vazioWrap}>
          <Text style={p.vazioTxt}>
            {items.length === 0 ? 'Watchlist vazia.' : 'Nenhum filme encontrado.'}
          </Text>
          <Text style={p.vazioDica}>
            {items.length === 0 ? 'Adicione filmes que quer assistir.' : 'Tente mudar os filtros.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={linhas}
          keyExtractor={(_, i) => String(i)}
          scrollEnabled={false}
          contentContainerStyle={p.grade}
          renderItem={({ item: linha }) => (
            <View style={p.linha}>
              {linha.map((item) => (
                <CardWatchlist
                  key={item.id}
                  item={item}
                  onPress={() => onAbrirFilme(item.filmeId)}
                  onRemover={() => remover(item)}
                />
              ))}
              {linha.length < COL &&
                Array.from({ length: COL - linha.length }).map((_, i) => (
                  <View key={`empty${i}`} style={{ width: CARD_W }} />
                ))}
            </View>
          )}
        />
      )}

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

  grade: { padding: PAD },
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