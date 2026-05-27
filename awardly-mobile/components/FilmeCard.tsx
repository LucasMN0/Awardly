// components/FilmeCard.tsx
// Mudanças principais:
// - div → TouchableOpacity
// - img → Image (com fallback local para poster null)
// - useRouter do next/navigation → useRouter do expo-router
// - CSS classes → StyleSheet
// - Overlay e efeito vencedor: no RN não tem :hover, então o overlay
//   fica sempre visível com opacidade reduzida (comportamento mobile natural)

import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fonts, radius } from '../constants/theme';
import type { Filme } from '../hooks/useFilmes';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Calcula largura do card baseado na grade de 2 colunas com gap
// (pode ser sobrescrito pela prop style se necessário)
const CARD_WIDTH = (width - 48 - 14) / 2; // padding 24 cada lado + 1 gap de 14

interface FilmeCardProps {
  filme: Filme & { _itemForcado?: string | null; _venceuItem?: boolean };
  categoriaAtual?: string;
  itemForcado?: string | string[] | null;
  venceu?: boolean;
}

export default function FilmeCard({
  filme,
  itemForcado,
  venceu = false,
}: FilmeCardProps) {
  const router = useRouter();

  const nomeItem = Array.isArray(itemForcado)
    ? itemForcado.join(', ')
    : itemForcado;

  return (
    <TouchableOpacity
      style={[styles.card, venceu && styles.cardVencedor]}
      onPress={() => router.push(`/filmes/${filme.tmdbId}` as any)}
      activeOpacity={0.85}
    >
      {/* Poster */}
      {filme.poster ? (
        <Image
          source={{ uri: filme.poster }}
          style={styles.poster}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.posterPlaceholder} />
      )}

      {/* Badge vencedor */}
      {venceu && (
        <View style={styles.wrapperOscar}>
          <Text style={styles.textoVencedor}>VENCEDOR</Text>
          <Image
            source={require('../assets/images/oscar2.png')}
            style={styles.iconeOscar}
            resizeMode="contain"
          />
        </View>
      )}

      {/* Overlay de informações — sempre visível no mobile */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.99)']}
        style={styles.overlay}
      >
        <Text style={styles.titulo} numberOfLines={2}>{filme.titulo}</Text>
        {nomeItem ? (
          <Text style={styles.atorIndicado} numberOfLines={1}>{nomeItem}</Text>
        ) : (
          <Text style={styles.ano}>{filme.anoLancamento}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    aspectRatio: 2 / 3,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardVencedor: {
    borderColor: colors.gold25,
  },
  poster: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  posterPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
    position: 'absolute',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 8,
    paddingTop: 32,
  },
  titulo: {
    fontFamily: fonts.poppinsBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.text,
    marginBottom: 2,
  },
  ano: {
    fontSize: 11,
    color: colors.gold,
    letterSpacing: 0.5,
    fontFamily: fonts.poppins,
  },
  atorIndicado: {
    fontSize: 11,
    color: colors.gold,
    letterSpacing: 0.5,
    fontStyle: 'italic',
    fontFamily: fonts.poppins,
  },

  // Vencedor
  wrapperOscar: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 4,
    zIndex: 3,
  },
  textoVencedor: {
    fontFamily: fonts.poppinsBold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    color: colors.gold,
  },
  iconeOscar: {
    width: 36,
    height: 46,
  },
});

// Nota sobre gradiente:
// Para reproduzir fielmente o gradiente do web (de transparent até rgba(0,0,0,0.99)):
//
// import { LinearGradient } from 'expo-linear-gradient';
//
// Substitua a View overlay por:
// <LinearGradient
//   colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.99)']}
//   style={styles.overlay}
// >
//   ... textos ...
// </LinearGradient>
//
// Instalar: npx expo install expo-linear-gradient