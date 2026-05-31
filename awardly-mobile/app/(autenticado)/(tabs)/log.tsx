import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Keyboard,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Parse from '../../../lib/parseClient';
import { getFilme, getImageURL } from '../../../lib/tmdb';
import { colors, fonts, spacing, radius } from '../../../constants/theme';
import NovoLogFilmeModal from '../../../components/NovoLogFilmeModal'; // <- Modal Novo

const TMDB_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;

// ─── Tipos ────────────────────────────────────────────────────

interface FilmeResultado {
  objectId?: string;
  tmdbId: number;
  titulo: string;
  ano: string | number;
  categorias: string[];
  poster?: string | null;
  tituloOriginal?: string;
}

// ─── Busca ────────────────────────────────────────────────────

async function buscarFilmesParse(termo: string): Promise<FilmeResultado[]> {
  if (!termo.trim()) return [];
  const Filme = Parse.Object.extend('Filme');
  const query = new Parse.Query(Filme);
  query.matches('titulo', termo, 'i');
  query.limit(20);
  const res = await query.find();
  return res.map((f: any) => ({
    objectId: f.id,
    tmdbId: f.get('tmdbId'),
    titulo: f.get('titulo'),
    ano: f.get('ano'),
    categorias: f.get('categorias') || [],
  }));
}

async function buscarFilmesTMDB(termo: string): Promise<FilmeResultado[]> {
  if (!termo.trim()) return [];
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(termo)}&language=pt-BR`
    );
    const data = await res.json();
    const tmdbIds = (data.results || []).slice(0, 20).map((m: any) => m.id);
    if (!tmdbIds.length) return [];
    const Filme = Parse.Object.extend('Filme');
    const query = new Parse.Query(Filme);
    query.containedIn('tmdbId', tmdbIds);
    query.limit(20);
    const resultados = await query.find();
    return resultados.map((f: any) => ({
      objectId: f.id,
      tmdbId: f.get('tmdbId'),
      titulo: f.get('titulo'),
      ano: f.get('ano'),
      categorias: f.get('categorias') || [],
    }));
  } catch {
    return [];
  }
}

async function buscarFilmes(termo: string): Promise<FilmeResultado[]> {
  const [r1, r2] = await Promise.allSettled([
    buscarFilmesParse(termo),
    buscarFilmesTMDB(termo),
  ]);
  const l1 = r1.status === 'fulfilled' ? r1.value : [];
  const l2 = r2.status === 'fulfilled' ? r2.value : [];
  const seen = new Set<string>();
  const merged: FilmeResultado[] = [];
  
  for (const f of [...l1, ...l2]) {
    if (!seen.has(f.objectId as string)) {
      if (f.objectId) seen.add(f.objectId);
      merged.push(f);
    }
  }
  return merged;
}

// ─── Card de resultado ────────────────────────────────────────

function FilmeCard({
  filme,
  detalhe,
  onPress,
}: {
  filme: FilmeResultado;
  detalhe: any;
  onPress: () => void;
}) {
  const posterUrl = detalhe?.poster_path
    ? getImageURL(detalhe.poster_path, 'w185')
    : null;
  const ano = detalhe?.release_date?.slice(0, 4) || filme.ano;
  const tituloOriginal =
    detalhe?.original_title && detalhe.original_title !== filme.titulo
      ? detalhe.original_title
      : null;

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.75}>
      <View style={s.posterWrap}>
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={s.poster} resizeMode="cover" />
        ) : (
          <View style={s.posterPlaceholder}>
            <Ionicons name="film-outline" size={22} color={colors.muted} />
          </View>
        )}
      </View>

      <View style={s.info}>
        <Text style={s.titulo} numberOfLines={2}>{filme.titulo}</Text>
        <Text style={s.ano}>
          {ano}
          {tituloOriginal ? `  ·  ${tituloOriginal}` : ''}
        </Text>
        {filme.categorias.length > 0 && (
          <View style={s.tags}>
            {filme.categorias.slice(0, 2).map((cat, i) => (
              <View key={i} style={s.tag}>
                <Text style={s.tagTxt}>{cat}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={s.logBtn}>
        <Ionicons name="add-circle-outline" size={26} color={colors.gold} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Tela principal ───────────────────────────────────────────

export default function LogScreen() {
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');
  const [termo, setTermo] = useState('');
  const [filmes, setFilmes] = useState<FilmeResultado[]>([]);
  const [detalhes, setDetalhes] = useState<Record<number, any>>({});
  const [buscando, setBuscando] = useState(false);
  
  // Alterado para passar o objeto FilmeResultado inteiro
  const [filmeSelecionado, setFilmeSelecionado] = useState<FilmeResultado | null>(null);
  
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!input.trim()) {
      setTermo('');
      setFilmes([]);
      setDetalhes({});
      return;
    }
    debounceRef.current = setTimeout(() => {
      setTermo(input.trim());
    }, 450);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input]);

  useEffect(() => {
    if (!termo) return;
    setBuscando(true);
    buscarFilmes(termo)
      .then(async (lista) => {
        setFilmes(lista);
        const map: Record<number, any> = {};
        await Promise.allSettled(
          lista.map(async (f) => {
            try { map[f.tmdbId] = await getFilme(f.tmdbId); } catch {}
          })
        );
        setDetalhes(map);
      })
      .finally(() => setBuscando(false));
  }, [termo]);

  function handleLimpar() {
    setInput('');
    setTermo('');
    setFilmes([]);
    setDetalhes({});
    inputRef.current?.focus();
  }

  function handleSalvo(resultado?: string) {
    setFilmeSelecionado(null);
    if (resultado === '__salvo__') {
      // Limpa os resultados apenas se tiver salvado com sucesso
      setInput('');
      setTermo('');
      setFilmes([]);
      setDetalhes({});
    }
  }

  const pesquisando = !!termo;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 16 }]}>
        <Text style={s.headerTitulo}>Novo Log</Text>

        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <TextInput
            ref={inputRef}
            style={s.searchInput}
            placeholder="Buscar filme para logar..."
            placeholderTextColor={colors.muted}
            value={input}
            onChangeText={setInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
          />
          {input.length > 0 && (
            <TouchableOpacity
              onPress={handleLimpar}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Conteúdo */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!pesquisando && (
          <View style={s.emptyWrap}>
            <Ionicons name="book-outline" size={52} color={colors.gold} style={{ opacity: 0.15 }} />
            <Text style={s.emptyTitulo}>registre o que assistiu</Text>
            <Text style={s.emptySub}>
              Busque o filme acima e registre sua nota, like e review.
            </Text>
          </View>
        )}

        {pesquisando && buscando && (
          <View style={s.centrado}>
            <ActivityIndicator color={colors.gold} size="large" />
          </View>
        )}

        {pesquisando && !buscando && (
          <>
            {filmes.length === 0 ? (
              <View style={s.centrado}>
                <Text style={s.semResultado}>Nenhum filme encontrado.</Text>
              </View>
            ) : (
              <>
                <Text style={s.resultadosLabel}>
                  {filmes.length} filme{filmes.length !== 1 ? 's' : ''} para "{termo}"
                </Text>
                {filmes.map((filme) => (
                  <FilmeCard
                    key={filme.objectId || filme.tmdbId.toString()}
                    filme={filme}
                    detalhe={detalhes[filme.tmdbId]}
                    onPress={() => setFilmeSelecionado(filme)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Usando o NovoLogFilmeModal */}
      <NovoLogFilmeModal
        filme={filmeSelecionado}
        onClose={handleSalvo}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.gold15, gap: spacing.md },
  headerTitulo: { fontFamily: fonts.cormorantItalic, fontSize: 32, color: colors.text, letterSpacing: 0.5 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.gold25,
    paddingHorizontal: spacing.md, height: 46, gap: spacing.sm,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, fontFamily: fonts.poppins, paddingVertical: 0 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 80 },
  emptyWrap: { alignItems: 'center', paddingTop: 80, gap: spacing.md },
  emptyTitulo: { fontFamily: fonts.cormorantItalic, fontSize: 24, color: colors.white35, letterSpacing: 0.3 },
  emptySub: { fontFamily: fonts.poppins, fontSize: 13, color: colors.muted, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 },
  resultadosLabel: { fontFamily: fonts.poppins, fontSize: 11, color: colors.muted, marginTop: spacing.lg, marginBottom: spacing.xs, letterSpacing: 0.3 },
  centrado: { paddingTop: 60, alignItems: 'center' },
  semResultado: { fontFamily: fonts.cormorantItalic, fontSize: 18, color: colors.white35 },
  card: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gold15, gap: spacing.md },
  posterWrap: { width: 52, height: 78, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexShrink: 0 },
  poster: { width: '100%', height: '100%' },
  posterPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: spacing.xs },
  titulo: { fontFamily: fonts.cormorantRegular, fontSize: 17, color: colors.text, lineHeight: 22 },
  ano: { fontFamily: fonts.poppins, fontSize: 12, color: colors.muted },
  tags: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', marginTop: 2 },
  tag: { backgroundColor: colors.gold10, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: colors.gold15 },
  tagTxt: { fontFamily: fonts.poppinsMedium, fontSize: 9, color: colors.gold, letterSpacing: 0.5, textTransform: 'uppercase' },
  logBtn: { padding: 4 },
});