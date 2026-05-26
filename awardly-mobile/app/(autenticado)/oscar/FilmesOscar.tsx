// app/(autenticado)/(tabs)/index.tsx  ← ou filmes/index.tsx conforme sua estrutura
// Mudanças principais:
// - div → View/ScrollView
// - FlatList com numColumns={2} em vez de grid CSS 5 colunas
//   (no mobile 2 colunas é o padrão; ajuste para 3 em tablets via useWindowDimensions)
// - <input> → TextInput
// - window.scrollTo(0,0) → ref no FlatList com scrollToOffset
// - Botão limpar busca: ícone ✕ dentro do TextInput via InputAccessory

import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useFilmes } from '../../../hooks/useFilmes';
import FilmeCard from '../../../components/FilmeCard';
import { colors, fonts, spacing, radius } from '../../../constants/theme';

const ANOS = [2023, 2024, 2025, 2026];
const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 14) / 2;

export default function FilmesOscar() {
  const [anoSelecionado, setAnoSelecionado] = useState<number | null>(null);
  const [busca, setBusca] = useState('');
  const { filmes, loading, erro } = useFilmes(anoSelecionado);
  const listRef = useRef<FlatList>(null);

  const filmesFiltrados = useMemo(() => {
    if (!busca.trim()) return filmes;
    const termo = busca.toLowerCase().trim();
    return filmes.filter(
      (f) =>
        f.titulo?.toLowerCase().includes(termo) ||
        f.tituloOriginal?.toLowerCase().includes(termo)
    );
  }, [filmes, busca]);

  function handleAnoPress(ano: number) {
    setAnoSelecionado(anoSelecionado === ano ? null : ano);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }

  const ListHeader = (
    <View>
      <Text style={styles.titulo}>Filmes Indicados ao Oscar</Text>

      {/* Filtros de ano */}
      <View style={styles.filtros}>
        <TouchableOpacity
          style={[styles.filtroBtnWrapper, anoSelecionado === null && styles.filtroBtnAtivo]}
          onPress={() => setAnoSelecionado(null)}
        >
          <Text style={[styles.filtroBtnText, anoSelecionado === null && styles.filtroBtnTextAtivo]}>
            TODOS
          </Text>
        </TouchableOpacity>
        {ANOS.map((ano) => (
          <TouchableOpacity
            key={ano}
            style={[styles.filtroBtnWrapper, anoSelecionado === ano && styles.filtroBtnAtivo]}
            onPress={() => handleAnoPress(ano)}
          >
            <Text style={[styles.filtroBtnText, anoSelecionado === ano && styles.filtroBtnTextAtivo]}>
              {ano}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Campo de busca */}
      <View style={styles.buscaWrapper}>
        <TextInput
          style={styles.buscaInput}
          placeholder="Buscar filme..."
          placeholderTextColor={colors.white35}
          value={busca}
          onChangeText={setBusca}
        />
        {busca.length > 0 && (
          <TouchableOpacity style={styles.buscaLimpar} onPress={() => setBusca('')}>
            <Text style={styles.buscaLimparText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Estados de loading / erro */}
      {loading && (
        <View style={styles.centrado}>
          <ActivityIndicator color={colors.gold} />
          <Text style={styles.mensagem}>Carregando filmes...</Text>
        </View>
      )}
      {erro && <Text style={[styles.mensagem, styles.mensagemErro]}>Erro: {erro}</Text>}
    </View>
  );

  const ListEmpty = !loading && !erro ? (
    <View style={styles.vazio}>
      <Text style={styles.vazioTitulo}>Nenhum filme encontrado.</Text>
      <Text style={styles.vazioSub}>Tente buscar por outro título.</Text>
    </View>
  ) : null;

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={!loading && !erro ? filmesFiltrados : []}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        renderItem={({ item }) => (
          <FilmeCard filme={item} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  titulo: {
    fontFamily: fonts.cormorantItalic,
    fontSize: 30,
    color: colors.text,
    marginTop: spacing.xxxl,
    marginBottom: spacing.xxl,
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  // Filtros
  filtros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xxxl,
  },
  filtroBtnWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  filtroBtnAtivo: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  filtroBtnText: {
    fontFamily: fonts.poppinsMedium,
    fontSize: 12,
    color: colors.white45,
    letterSpacing: 1.5,
  },
  filtroBtnTextAtivo: {
    color: '#0a0a0a',
  },

  // Busca
  buscaWrapper: {
    position: 'relative',
    marginBottom: spacing.xxl,
  },
  buscaInput: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    fontFamily: fonts.poppins,
    fontSize: 13,
    letterSpacing: 0.5,
    paddingVertical: 10,
    paddingHorizontal: 16,
    paddingRight: 40,
  },
  buscaLimpar: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -10,
  },
  buscaLimparText: {
    color: colors.white35,
    fontSize: 14,
  },

  // Grid
  row: {
    gap: 14,
    marginBottom: 14,
  },

  // Estados
  centrado: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  mensagem: {
    fontFamily: fonts.poppins,
    fontSize: 14,
    color: colors.white45,
    textAlign: 'center',
    paddingVertical: spacing.xxxl,
  },
  mensagemErro: {
    color: colors.error,
  },
  vazio: {
    alignItems: 'center',
    paddingVertical: 64,
    gap: spacing.sm,
  },
  vazioTitulo: {
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
  },
  vazioSub: {
    fontFamily: fonts.poppins,
    fontSize: 13,
    color: colors.white35,
  },
});