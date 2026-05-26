import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Parse from '../../../lib/parseClient';
import { getImageURL } from '../../../lib/tmdb';

const GOLD = '#C9A84C';
const BG = '#0a0906';
const CARD_BG = '#111008';
const BORDER = 'rgba(201,168,76,0.15)';
const { width: SCREEN_W } = Dimensions.get('window');

const ANOS = [2023, 2024, 2025, 2026];
const COL = 3;
const GAP = 8;
const PAD = 16;
const CARD_W = (SCREEN_W - PAD * 2 - GAP * (COL - 1)) / COL;
const CARD_H = CARD_W * 1.5;

// ─── Hook: busca filmes no Parse ──────────────────────────────

interface FilmeParse {
  id: string;
  tmdbId: number;
  titulo: string;
  tituloOriginal: string;
  ano: number;
  poster: string | null;
}

function useFilmes(ano: number | null) {
  const [filmes, setFilmes] = useState<FilmeParse[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      setErro(null);

      const Filme = Parse.Object.extend('Filme');
      const query = new Parse.Query(Filme);
      if (ano) query.equalTo('ano', ano);
      query.ascending('titulo');
      query.limit(1000);
      const resultados = await query.find();

      // Deduplica por tmdbId (mesmo filme pode ter múltiplas categorias)
      const vistos = new Set<number>();
      const lista: FilmeParse[] = [];
      for (const f of resultados) {
        const tmdbId = f.get('tmdbId');
        if (vistos.has(tmdbId)) continue;
        vistos.add(tmdbId);
        lista.push({
          id: f.id!,
          tmdbId,
          titulo: f.get('titulo') || '',
          tituloOriginal: f.get('tituloOriginal') || '',
          ano: f.get('ano') || 0,
          poster: f.get('poster') || null,
        });
      }
      setFilmes(lista);
    } catch (e: any) {
      setErro(e.message || 'Erro ao carregar filmes.');
    } finally {
      setLoading(false);
    }
  }, [ano]);

  useEffect(() => { carregar(); }, [carregar]);

  return { filmes, loading, erro };
}

// ─── Card de filme ────────────────────────────────────────────

function FilmeCard({ filme, onPress }: { filme: FilmeParse; onPress: () => void }) {
  const url = filme.poster ? getImageURL(filme.poster, 'w342') : null;

  return (
    <TouchableOpacity style={c.card} onPress={onPress} activeOpacity={0.8}>
      {url ? (
        <Image source={{ uri: url }} style={c.poster} />
      ) : (
        <View style={c.posterPlaceholder}>
          <Text style={c.posterPlaceholderTxt} numberOfLines={3}>
            {filme.titulo}
          </Text>
        </View>
      )}
      <View style={c.info}>
        <Text style={c.titulo} numberOfLines={2}>{filme.titulo}</Text>
        {filme.ano > 0 && <Text style={c.ano}>{filme.ano}</Text>}
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
    padding: 8,
  },
  posterPlaceholderTxt: {
    fontFamily: 'Poppins-Regular',
    color: 'rgba(255,255,255,0.25)',
    fontSize: 10,
    textAlign: 'center',
  },
  info: { paddingTop: 5, gap: 2 },
  titulo: {
    fontFamily: 'Poppins-Medium',
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 13,
  },
  ano: {
    fontFamily: 'Poppins-Regular',
    fontSize: 9,
    color: 'rgba(255,255,255,0.3)',
  },
});

// ─── Tela principal ───────────────────────────────────────────

export default function FilmesScreen() {
  const router = useRouter();
  const [anoSelecionado, setAnoSelecionado] = useState<number | null>(null);
  const [busca, setBusca] = useState('');
  const { filmes, loading, erro } = useFilmes(anoSelecionado);

  const filmesFiltrados = useMemo(() => {
    if (!busca.trim()) return filmes;
    const termo = busca.toLowerCase().trim();
    return filmes.filter(
      (f) =>
        f.titulo?.toLowerCase().includes(termo) ||
        f.tituloOriginal?.toLowerCase().includes(termo)
    );
  }, [filmes, busca]);

  // Monta linhas de 3 para o FlatList
  const linhas = useMemo(() => {
    const rows: FilmeParse[][] = [];
    for (let i = 0; i < filmesFiltrados.length; i += COL) {
      rows.push(filmesFiltrados.slice(i, i + COL));
    }
    return rows;
  }, [filmesFiltrados]);

  return (
    <View style={s.root}>
      {/* TopBar */}
      <View style={s.topBar}>
        <Text style={s.topBarTitulo}>filmes</Text>
      </View>

      <FlatList
        data={linhas}
        keyExtractor={(_, i) => String(i)}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={s.header}>
            {/* Título */}
            <Text style={s.titulo}>Indicados ao Oscar</Text>

            {/* Filtro de anos */}
            <View style={s.anosRow}>
              <TouchableOpacity
                style={[s.anoChip, anoSelecionado === null && s.anoChipAtivo]}
                onPress={() => setAnoSelecionado(null)}
                activeOpacity={0.7}
              >
                <Text style={[s.anoChipTxt, anoSelecionado === null && s.anoChipTxtAtivo]}>
                  todos
                </Text>
              </TouchableOpacity>
              {ANOS.map((ano) => (
                <TouchableOpacity
                  key={ano}
                  style={[s.anoChip, anoSelecionado === ano && s.anoChipAtivo]}
                  onPress={() => setAnoSelecionado(ano)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.anoChipTxt, anoSelecionado === ano && s.anoChipTxtAtivo]}>
                    {ano}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Busca */}
            <View style={s.buscaWrap}>
              <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.3)" style={s.buscaIcon} />
              <TextInput
                style={s.buscaInput}
                value={busca}
                onChangeText={setBusca}
                placeholder="buscar filme..."
                placeholderTextColor="rgba(255,255,255,0.2)"
                autoCorrect={false}
              />
              {busca.length > 0 && (
                <TouchableOpacity onPress={() => setBusca('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>
              )}
            </View>

            {/* Estado: loading / erro / vazio */}
            {loading && (
              <View style={s.centrado}>
                <ActivityIndicator color={GOLD} />
              </View>
            )}
            {erro && !loading && (
              <View style={s.centrado}>
                <Text style={s.erroTxt}>Erro ao carregar filmes.</Text>
              </View>
            )}
            {!loading && !erro && filmesFiltrados.length === 0 && (
              <View style={s.centrado}>
                <Text style={s.vazioTitulo}>Nenhum filme encontrado.</Text>
                <Text style={s.vazioDica}>Tente buscar por outro título.</Text>
              </View>
            )}

            {/* Contagem */}
            {!loading && filmesFiltrados.length > 0 && (
              <Text style={s.contagem}>
                {filmesFiltrados.length} filme{filmesFiltrados.length !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
        }
        contentContainerStyle={s.listContent}
        renderItem={({ item: linha }) => (
          <View style={s.linha}>
            {linha.map((filme) => (
              <FilmeCard
                key={filme.id}
                filme={filme}
                onPress={() => router.push(`/(autenticado)/filmes/${filme.tmdbId}` as any)}
              />
            ))}
            {linha.length < COL &&
              Array.from({ length: COL - linha.length }).map((_, i) => (
                <View key={`empty${i}`} style={{ width: CARD_W }} />
              ))}
          </View>
        )}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  topBar: {
    paddingHorizontal: PAD,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  topBarTitulo: {
    fontFamily: 'CormorantGaramond-LightItalic',
    fontSize: 22,
    color: '#fff',
    letterSpacing: 0.3,
  },

  header: { paddingHorizontal: PAD, paddingTop: 20, gap: 16, paddingBottom: 8 },
  titulo: {
    fontFamily: 'CormorantGaramond-Light',
    fontSize: 28,
    color: '#fff',
    letterSpacing: 0.3,
  },

  anosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  anoChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_BG,
  },
  anoChipAtivo: {
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderColor: 'rgba(201,168,76,0.5)',
  },
  anoChipTxt: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
  },
  anoChipTxtAtivo: { color: GOLD },

  buscaWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  buscaIcon: { marginRight: 2 },
  buscaInput: {
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: '#fff',
  },

  contagem: {
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
  },

  centrado: { paddingVertical: 40, alignItems: 'center', gap: 8 },
  erroTxt: { fontFamily: 'Poppins-Regular', fontSize: 13, color: '#e05252' },
  vazioTitulo: {
    fontFamily: 'CormorantGaramond-LightItalic',
    fontSize: 18,
    color: 'rgba(255,255,255,0.3)',
  },
  vazioDica: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.2)',
  },

  listContent: { paddingBottom: 40 },
  linha: {
    flexDirection: 'row',
    gap: GAP,
    paddingHorizontal: PAD,
    marginBottom: 0,
  },
});