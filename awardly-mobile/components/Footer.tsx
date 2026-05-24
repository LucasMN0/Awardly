// components/Footer.tsx
// No web era um <footer> fixo no rodapé da página.
// No mobile fica no final do ScrollView de cada tela que precisar.
// O link do TMDB usa Linking.openURL em vez de <a href>.

import React from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '../constants/theme';

export default function Footer() {
  return (
    <View style={styles.footer}>
      <Text style={styles.copy}>
        © 2026 Awardly — Todos os direitos reservados
      </Text>
      <Text style={styles.tmdb}>
        This product uses the{' '}
        <Text
          style={styles.link}
          onPress={() => Linking.openURL('https://www.themoviedb.org')}
        >
          TMDB API
        </Text>
        {' '}but is not endorsed or certified by TMDB.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,200,0,0.1)',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    marginTop: 64,
    gap: spacing.sm,
  },
  copy: {
    fontFamily: fonts.poppins,
    fontSize: 12,
    color: colors.white35,
    letterSpacing: 0.5,
  },
  tmdb: {
    fontFamily: fonts.poppins,
    fontSize: 12,
    color: colors.white35,
  },
  link: {
    color: colors.gold,
  },
});