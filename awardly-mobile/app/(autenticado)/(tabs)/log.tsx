import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SectionList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Parse from '../../../lib/parseClient';
import { useFilmes } from '../../../hooks/useFilmes';
import FilmeCard from '../../../components/FilmeCard';
import LogCategoriaModal from '../../../components/LogCategoriaModal';
import { colors, fonts, spacing, radius } from '../../../constants/theme';
import type { Filme } from '../../../hooks/useFilmes';

const ANOS = [2023, 2024, 2025, 2026];

const ORDEM_CATEGORIAS = [
  'Melhor Filme', 'Melhor Diretor', 'Melhor Ator', 'Melhor Atriz',
  'Melhor Ator Coadjuvante', 'Melhor Atriz Coadjuvante',
  'Melhor Roteiro Original', 'Melhor Roteiro Adaptado',
  'Melhor Filme Internacional', 'Melhor Animação',
  'Melhor Documentário (Longa)', 'Melhor Documentário (Curta)',
  'Melhor Curta de Animação', 'Melhor Curta-Metragem (Live Action)',
  'Melhor Fotografia', 'Melhor Edição', 'Melhor Montagem',
  'Melhor Trilha Sonora', 'Melhor Canção Original',
  'Melhor Design de Produção', 'Melhor Figurino',
  'Melhor Maquiagem e Penteados', 'Melhor Som',
  'Melhores Efeitos Visuais', 'Melhor Direção de Elenco',
];

const CATEGORIAS_ATUACAO = [
  'Melhor Ator', 'Melhor Atriz',
  'Melhor Ator Coadjuvante', 'Melhor Atriz Coadjuvante',
];

const CATEGORIAS_ROTEIRO = ['Melhor Roteiro Original', 'Melhor Roteiro Adaptado'];

type FilmeComMeta = Filme & { _itemForcado?: string | null; _venceuItem?: boolean };

interface Secao {
  title: string;
  data: FilmeComMeta[][];  // SectionList espera array; usamos [[...filmes]] por seção
}

export default function Categorias() {
  const [anoSelecionado, setAnoSelecionado] = useState<number | null>(null);
  const { filmes, loading, erro } = useFilmes(anoSelecionado);
  const [usuario, setUsuario] = useState<any>(null);
  const [modalAberto, setModalAberto] = useState<{ categoria: string; filmes: FilmeComMeta[] } | null>(null);
  const [logsFeitos, setLogsFeitos] = useState<Set<string>>(new Set());
  const listRef = useRef<SectionList>(null);

  useEffect(() => {
    setUsuario(Parse.User.current());
  }, []);

  useEffect(() => {
    async function carregarLogs() {
      const user = Parse.User.current();
      if (!user || !anoSelecionado) return;
      const query = new Parse.Query('LogCategoria');
      query.equalTo('usuarioId', user);
      query.equalTo('ano', anoSelecionado);
      query.limit(100);
      const resultados = await query.find();
      setLogsFeitos(new Set(resultados.map((r: any) => r.get('categoria'))));
    }
    carregarLogs();
  }, [anoSelecionado]);

  // Monta as seções agrupando filmes por categoria (mesma lógica do web)
  const secoes: Secao[] = React.useMemo(() => {
    const categoriasAgrupadas: Record<string, FilmeComMeta[]> = {};

    filmes.forEach((filme) => {
      filme.categorias.forEach((cat) => {
        if (!categoriasAgrupadas[cat]) categoriasAgrupadas[cat] = [];

        if (CATEGORIAS_ATUACAO.includes(cat)) {
          const atores = filme.atoresIndicados?.[cat];
          if (Array.isArray(atores) && atores.length > 1) {
            atores.forEach((ator) => {
              const venceu = filme.vencedores?.includes(`${cat}::${ator}`);
              categoriasAgrupadas[cat].push({ ...filme, _itemForcado: ator, _venceuItem: venceu });
            });
          } else {
            const ator = Array.isArray(atores) ? atores[0] : atores;
            categoriasAgrupadas[cat].push({
              ...filme,
              _itemForcado: ator || null,
              _venceuItem: filme.vencedores?.includes(cat),
            });
          }
        } else if (cat === 'Melhor Diretor') {
          categoriasAgrupadas[cat].push({
            ...filme,
            _itemForcado: filme.diretor || null,
            _venceuItem: filme.vencedores?.includes(cat),
          });
        } else if (cat === 'Melhor Canção Original') {
          const cancoes = filme.cancao?.[cat];
          if (Array.isArray(cancoes) && cancoes.length > 1) {
            cancoes.forEach((cancao) => {
              const venceu = filme.vencedores?.includes(`${cat}::${cancao}`);
              categoriasAgrupadas[cat].push({ ...filme, _itemForcado: cancao, _venceuItem: venceu });
            });
          } else {
            const cancao = Array.isArray(cancoes) ? cancoes[0] : cancoes;
            categoriasAgrupadas[cat].push({
              ...filme,
              _itemForcado: cancao || null,
              _venceuItem: filme.vencedores?.includes(cat),
            });
          }
        } else if (CATEGORIAS_ROTEIRO.includes(cat)) {
          categoriasAgrupadas[cat].push({
            ...filme,
            _itemForcado: filme.roteiristas || null,
            _venceuItem: filme.vencedores?.includes(cat),
          });
        } else {
          categoriasAgrupadas[cat].push({
            ...filme,
            _venceuItem: filme.vencedores?.includes(cat),
          });
        }
      });
    });

    const ordenadas = ORDEM_CATEGORIAS
      .filter((cat) => categoriasAgrupadas[cat])
      .map((cat) => ({ title: cat, data: [categoriasAgrupadas[cat]] }));

    const extras = Object.entries(categoriasAgrupadas)
      .filter(([cat]) => !ORDEM_CATEGORIAS.includes(cat))
      .map(([cat, filmes]) => ({ title: cat, data: [filmes] }));

    return [...ordenadas, ...extras];
  }, [filmes]);

  function handleAbrirModal(cat: string, filmesCategoria: FilmeComMeta[]) {
    if (!usuario) return;
    setModalAberto({ categoria: cat, filmes: filmesCategoria });
  }

  function handleFecharModal(resultado?: string) {
    if (resultado === '__salvo__' && modalAberto) {
      setLogsFeitos((prev) => new Set([...prev, modalAberto.categoria]));
    } else if (resultado === '__deletado__' && modalAberto) {
      setLogsFeitos((prev) => {
        const next = new Set(prev);
        next.delete(modalAberto.categoria);
        return next;
      });
    }
    setModalAberto(null);
  }

  const ListHeader = (
    <View>
      <Text style={styles.titulo}>Categorias do Oscar</Text>
      <View style={styles.filtros}>
        {ANOS.map((ano) => (
          <TouchableOpacity
            key={ano}
            style={[styles.filtroBtnWrapper, anoSelecionado === ano && styles.filtroBtnAtivo]}
            onPress={() => setAnoSelecionado(ano === anoSelecionado ? null : ano)}
          >
            <Text style={[styles.filtroBtnText, anoSelecionado === ano && styles.filtroBtnTextAtivo]}>
              {ano}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!anoSelecionado && (
        <View style={styles.selecione}>
          <Text style={styles.selecioneText}>Selecione o ano</Text>
        </View>
      )}
      {loading && anoSelecionado && (
        <View style={styles.centrado}>
          <ActivityIndicator color={colors.gold} />
        </View>
      )}
      {erro && <Text style={[styles.mensagem, styles.mensagemErro]}>Erro: {erro}</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      <SectionList
        ref={listRef}
        sections={!loading && !erro && anoSelecionado ? secoes : []}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={ListHeader}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <View style={styles.categoriaHeader}>
            <View style={styles.categoriaHeaderRow}>
              <View style={styles.categoriaLinhaOuro} />
              <Text style={styles.categoriaNome}>{section.title}</Text>
            </View>
            {usuario && (
              <TouchableOpacity
                style={[styles.btnLog, logsFeitos.has(section.title) && styles.btnLogFeito]}
                onPress={() => handleAbrirModal(section.title, section.data[0])}
              >
                <Text style={[styles.btnLogText, logsFeitos.has(section.title) && styles.btnLogTextFeito]}>
                  {logsFeitos.has(section.title) ? '✓ logado' : '+ log'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        renderItem={({ item: filmesCategoria }) => (
          <View style={styles.filmesRow}>
            {filmesCategoria.map((filme, i) => (
              <FilmeCard
                key={`${filme.id}-${filme._itemForcado ?? ''}-${i}`}
                filme={filme}
                itemForcado={filme._itemForcado ?? null}
                venceu={filme._venceuItem ?? false}
              />
            ))}
          </View>
        )}
        SectionSeparatorComponent={() => <View style={{ height: 48 }} />}
      />

      {modalAberto && (
        <LogCategoriaModal
          categoria={modalAberto.categoria}
          ano={anoSelecionado!}
          filmes={modalAberto.filmes}
          onClose={handleFecharModal}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  listContent: {
    paddingBottom: 56,
  },
  titulo: {
    fontFamily: fonts.cormorantItalic,
    fontSize: 30,
    color: colors.text,
    marginTop: spacing.xxxl,
    marginBottom: spacing.xxl,
    letterSpacing: 0.3,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  filtros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xxxl,
    paddingHorizontal: 24,
  },
  filtroBtnWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxl,
  },
  filtroBtnAtivo: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  filtroBtnText: {
    fontFamily: fonts.poppinsBold,
    fontSize: 12,
    color: colors.white45,
    letterSpacing: 1.5,
  },
  filtroBtnTextAtivo: {
    color: '#0a0a0a',
  },
  selecione: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  selecioneText: {
    fontFamily: fonts.cormorantItalic,
    fontSize: 28,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.5,
  },
  centrado: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
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

  // Seção de categoria
  categoriaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: spacing.lg,
  },
  categoriaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  categoriaLinhaOuro: {
    width: 24,
    height: 1,
    backgroundColor: colors.gold,
    opacity: 0.7,
  },
  categoriaNome: {
    fontFamily: fonts.cormorantItalic,
    fontSize: 22,
    color: colors.text,
    letterSpacing: 0.3,
    flex: 1,
  },
  btnLog: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  btnLogFeito: {
    borderColor: colors.gold,
    backgroundColor: colors.gold10,
  },
  btnLogText: {
    fontFamily: fonts.poppinsMedium,
    fontSize: 12,
    color: colors.white45,
    letterSpacing: 0.5,
  },
  btnLogTextFeito: {
    color: colors.gold,
  },

  // Grid de filmes por categoria — 2 colunas com wrap
  filmesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 24,
  },
});