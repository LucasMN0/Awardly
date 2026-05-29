import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '../../../constants/theme';
import FilmesOscar from '../oscar/FilmesOscar';

export default function FilmesScreen() {
  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.titulo}>Filmes</Text>
      </View>
      <View style={s.conteudo}>
        <FilmesOscar />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201,168,76,0.15)',
    alignItems: 'center',
  },
  titulo: {
    fontFamily: fonts.cormorantItalic,
    fontSize: 32,
    color: colors.text,
    letterSpacing: 0.5,
  },
  conteudo: {
    flex: 1,
  },
});