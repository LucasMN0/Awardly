// app/(autenticado)/(tabs)/oscar.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '../../../constants/theme';
import FilmesOscar from '../oscar/FilmesOscar';
import CategoriasOscar from '../oscar/CategoriasOscar';

type Aba = 'filmes' | 'categorias';

export default function OscarScreen() {
  const [aba, setAba] = useState<Aba>('filmes');

  return (
    <View style={s.root}>
      {/* Header fixo */}
      <View style={s.header}>
        <Text style={s.titulo}>Oscars</Text>
        <View style={s.toggle}>
          <TouchableOpacity
            style={[s.toggleBtn, aba === 'filmes' && s.toggleBtnAtivo]}
            onPress={() => setAba('filmes')}
            activeOpacity={0.8}
          >
            <Text style={[s.toggleTxt, aba === 'filmes' && s.toggleTxtAtivo]}>
              Filmes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.toggleBtn, aba === 'categorias' && s.toggleBtnAtivo]}
            onPress={() => setAba('categorias')}
            activeOpacity={0.8}
          >
            <Text style={[s.toggleTxt, aba === 'categorias' && s.toggleTxtAtivo]}>
              Categorias
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Conteúdo */}
      <View style={s.conteudo}>
        {aba === 'filmes' ? <FilmesOscar /> : <CategoriasOscar />}
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
    gap: spacing.lg,
  },
  titulo: {
    fontFamily: fonts.cormorantItalic,
    fontSize: 32,
    color: colors.text,
    letterSpacing: 0.5,
  },
  toggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.25)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  toggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 32,
    backgroundColor: 'transparent',
  },
  toggleBtnAtivo: {
    backgroundColor: colors.gold,
  },
  toggleTxt: {
    fontFamily: fonts.poppinsMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5,
  },
  toggleTxtAtivo: {
    color: '#0a0a0a',
  },
  conteudo: {
    flex: 1,
  },
});