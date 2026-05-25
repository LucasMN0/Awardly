import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Parse from '../lib/parseClient';
import { getFilme, getImageURL } from '../lib/tmdb';

const GOLD = '#C9A84C';
const BG = '#0a0906';
const CARD_BG = '#111008';
const BORDER = 'rgba(201,168,76,0.15)';
const { width: SCREEN_W } = Dimensions.get('window');

const SLOT_W = (SCREEN_W - 40 - 24) / 4; // 4 slots com gap
const SLOT_H = SLOT_W * 1.5;

// ─── Parse + TMDB helpers ────────────────────────────────────

const TMDB_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;

async function buscarFilmesPorTitulo(termo: string) {
  if (!termo.trim()) return [];
  const Filme = Parse.Object.extend('Filme');
  const query = new Parse.Query(Filme);
  query.matches('titulo', new RegExp(termo, 'i'));
  query.limit(8);
  const resultados = await query.find();
  return resultados.map((f: any) => ({
    objectId: f.id,
    tmdbId: f.get('tmdbId'),
    titulo: f.get('titulo'),
    ano: f.get('ano'),
  }));
}

async function buscarFilmesPorTituloOriginal(termo: string) {
  if (!termo.trim() || !TMDB_KEY) return [];
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(termo)}&language=pt-BR`
    );
    const data = await res.json();
    const tmdbIds = (data.results || []).slice(0, 10).map((m: any) => m.id);
    if (tmdbIds.length === 0) return [];

    const Filme = Parse.Object.extend('Filme');
    const query = new Parse.Query(Filme);
    query.containedIn('tmdbId', tmdbIds);
    query.limit(8);
    const resultados = await query.find();
    return resultados.map((f: any) => ({
      objectId: f.id,
      tmdbId: f.get('tmdbId'),
      titulo: f.get('titulo'),
      ano: f.get('ano'),
    }));
  } catch {
    return [];
  }
}

async function buscarFilmes(termo: string) {
  const [r1, r2] = await Promise.allSettled([
    buscarFilmesPorTitulo(termo),
    buscarFilmesPorTituloOriginal(termo),
  ]);
  const lista1 = r1.status === 'fulfilled' ? r1.value : [];
  const lista2 = r2.status === 'fulfilled' ? r2.value : [];
  const vistos = new Set<string>();
  const merged: any[] = [];
  for (const f of [...lista1, ...lista2]) {
    if (!vistos.has(f.objectId)) {
      vistos.add(f.objectId);
      merged.push(f);
    }
  }
  return merged.slice(0, 8);
}

// ─── Tipos ───────────────────────────────────────────────────

export interface FilmeFavorito {
  objectId: string;
  tmdbId: number | string;
  titulo: string;
  ano?: number;
  poster_path: string | null;
}

interface Props {
  valor: FilmeFavorito[];
  onChange: (filmes: FilmeFavorito[]) => void;
}

// ─── Modal de busca ──────────────────────────────────────────

function ModalBusca({
  visivel,
  valor,
  onSelecionar,
  onFechar,
}: {
  visivel: boolean;
  valor: FilmeFavorito[];
  onSelecionar: (filme: any) => void;
  onFechar: () => void;
}) {
  const [termo, setTermo] = useState('');
  const [resultados, setResultados] = useState<any[]>([]);
  const [buscando, setBuscando] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visivel) { setTermo(''); setResultados([]); }
  }, [visivel]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!termo.trim()) { setResultados([]); return; }
    timerRef.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const filmes = await buscarFilmes(termo);
        setResultados(filmes);
      } catch (e) {
        console.error(e);
      } finally {
        setBuscando(false);
      }
    }, 350);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [termo]);

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={onFechar}>
      <View style={m.overlay}>
        <View style={m.sheet}>
          {/* Header */}
          <View style={m.header}>
            <Text style={m.titulo}>buscar filme</Text>
            <TouchableOpacity onPress={onFechar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={m.btnFechar}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Input */}
          <View style={m.inputWrap}>
            <TextInput
              style={m.input}
              value={termo}
              onChangeText={setTermo}
              placeholder="Digite o nome do filme..."
              placeholderTextColor="rgba(255,255,255,0.25)"
              autoFocus
            />
          </View>

          {/* Resultados */}
          {buscando && (
            <ActivityIndicator color={GOLD} style={{ marginVertical: 24 }} />
          )}
          {!buscando && termo.trim() !== '' && resultados.length === 0 && (
            <Text style={m.semResultado}>Nenhum filme encontrado.</Text>
          )}
          <FlatList
            data={resultados}
            keyExtractor={(item) => item.objectId}
            style={{ maxHeight: 320 }}
            renderItem={({ item }) => {
              const duplicado = valor.some((v) => v.tmdbId === item.tmdbId);
              return (
                <TouchableOpacity
                  style={[m.item, duplicado && m.itemDesabilitado]}
                  onPress={() => !duplicado && onSelecionar(item)}
                  activeOpacity={duplicado ? 1 : 0.7}
                >
                  <View style={m.itemInfo}>
                    <Text style={m.itemNome} numberOfLines={1}>{item.titulo}</Text>
                    {item.ano ? <Text style={m.itemAno}>{item.ano}</Text> : null}
                  </View>
                  <Text style={[m.itemAdd, duplicado && m.itemAddOk]}>
                    {duplicado ? '✓' : '+'}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── Slot individual ─────────────────────────────────────────

function Slot({
  filme,
  indice,
  onAdd,
  onRemover,
}: {
  filme: FilmeFavorito | null;
  indice: number;
  onAdd: () => void;
  onRemover: () => void;
}) {
  if (filme) {
    const url = getImageURL(filme.poster_path, 'w342');
    return (
      <View style={sl.wrap}>
        {url ? (
          <Image source={{ uri: url }} style={sl.img} />
        ) : (
          <View style={sl.placeholder}>
            <Text style={sl.placeholderTxt} numberOfLines={2}>{filme.titulo}</Text>
          </View>
        )}
        <TouchableOpacity style={sl.btnRemover} onPress={onRemover} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Text style={sl.btnRemoverTxt}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity style={sl.vazio} onPress={onAdd} activeOpacity={0.7}>
      <Text style={sl.mais}>+</Text>
      <Text style={sl.label}>favorito {indice + 1}</Text>
    </TouchableOpacity>
  );
}

// ─── Componente principal ────────────────────────────────────

export default function FilmesFavoritos({ valor = [], onChange }: Props) {
  const [modalAberto, setModalAberto] = useState(false);
  const [indiceEditando, setIndiceEditando] = useState<number | null>(null);

  const slots: (FilmeFavorito | null)[] = Array.from({ length: 4 }, (_, i) => valor[i] || null);

  function abrirModal(indice: number) {
    setIndiceEditando(indice);
    setModalAberto(true);
  }

  async function handleSelecionar(filme: any) {
    if (indiceEditando === null) return;
    const jaExiste = slots.some((s, i) => s?.tmdbId === filme.tmdbId && i !== indiceEditando);
    if (jaExiste) return;

    let poster_path: string | null = null;
    try {
      const detalhes = await getFilme(filme.tmdbId);
      poster_path = detalhes?.poster_path || null;
    } catch (e) {
      console.error('Erro ao buscar poster:', e);
    }

    const filmeCompleto: FilmeFavorito = { ...filme, poster_path };
    const novos = [...slots];
    novos[indiceEditando] = filmeCompleto;
    onChange(novos.filter(Boolean) as FilmeFavorito[]);
    setModalAberto(false);
    setIndiceEditando(null);
  }

  function handleRemover(indice: number) {
    const novos = [...slots];
    novos[indice] = null;
    onChange(novos.filter(Boolean) as FilmeFavorito[]);
  }

  return (
    <View style={c.container}>
      <View style={c.grade}>
        {slots.map((filme, i) => (
          <Slot
            key={i}
            filme={filme}
            indice={i}
            onAdd={() => abrirModal(i)}
            onRemover={() => handleRemover(i)}
          />
        ))}
      </View>

      <ModalBusca
        visivel={modalAberto}
        valor={valor}
        onSelecionar={handleSelecionar}
        onFechar={() => { setModalAberto(false); setIndiceEditando(null); }}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const c = StyleSheet.create({
  container: { gap: 8 },
  grade: {
    flexDirection: 'row',
    gap: 8,
  },
});

const sl = StyleSheet.create({
  wrap: {
    width: SLOT_W,
    height: SLOT_H,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    position: 'relative',
  },
  img: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholder: {
    flex: 1,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  placeholderTxt: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    textAlign: 'center',
  },
  btnRemover: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(10,9,6,0.8)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnRemoverTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },
  vazio: {
    width: SLOT_W,
    height: SLOT_H,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: CARD_BG,
  },
  mais: { color: GOLD, fontSize: 20 },
  label: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});

const m = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#13110c',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: BORDER,
    paddingBottom: 32,
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  titulo: {
    fontFamily: 'serif',
    fontSize: 18,
    fontStyle: 'italic',
    color: '#fff',
  },
  btnFechar: { color: 'rgba(255,255,255,0.4)', fontSize: 16 },
  inputWrap: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  input: {
    backgroundColor: '#1a1712',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  semResultado: {
    color: 'rgba(255,255,255,0.3)',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 13,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  itemDesabilitado: { opacity: 0.4 },
  itemInfo: { flex: 1, gap: 2 },
  itemNome: { color: '#fff', fontSize: 14, fontWeight: '500' },
  itemAno: { color: 'rgba(255,255,255,0.35)', fontSize: 12 },
  itemAdd: { color: GOLD, fontSize: 20, fontWeight: '300', marginLeft: 12 },
  itemAddOk: { color: 'rgba(201,168,76,0.5)' },
});