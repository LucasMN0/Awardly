
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Parse from '../../../lib/parseClient';
import { getPessoa, getPessoaCreditos, getImageURL } from '../../../lib/tmdb';
import { colors, fonts, spacing, radius } from '../../../constants/theme';
import { useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2 - 8;

// ─── Helpers (idênticos ao web) ──────────────────────────────────────────────

async function buscarFilmesOscarDoAtor(tmdbIdAtor: string | number, creditosAtor: { cast?: any[]; crew?: any[] }) {
  const query = new Parse.Query('Filme');
  query.limit(1000);
  const todos = await query.find();

  const idsDoAtor = new Set([
    ...(creditosAtor.cast || []).map((c) => c.id),
    ...(creditosAtor.crew || []).map((c) => c.id),
  ]);

  return todos
    .filter((f) => idsDoAtor.has(Number(f.get('tmdbId'))))
    .map((f) => ({
      tmdbId: f.get('tmdbId'),
      titulo: f.get('titulo'),
      categorias: f.get('categorias') || [],
      vencedores: f.get('vencedores') || [],
      atoresIndicados: f.get('atoresIndicados') || {},
      ano: f.get('ano'),
    }));
}

function calcularIdade(nascimento?: string, falecimento?: string) {
  if (!nascimento) return null;
  const fim = falecimento ? new Date(falecimento) : new Date();
  const nasc = new Date(nascimento);
  let idade = fim.getFullYear() - nasc.getFullYear();
  const m = fim.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && fim.getDate() < nasc.getDate())) idade--;
  return idade;
}

function formatarData(data?: string) {
  if (!data) return null;
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

// ─── Componente de card de filme simples (carrega poster individualmente) ────

function FilmeCardSimples({ tmdbId, titulo }: { tmdbId: string | number; titulo: string }) {
  const [poster, setPoster] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!tmdbId) return;
    fetch(
      `${process.env.EXPO_PUBLIC_TMDB_BASE_URL}/movie/${tmdbId}?api_key=${process.env.EXPO_PUBLIC_TMDB_API_KEY}&language=pt-BR`
    )
      .then((r) => r.json())
      .then((d) => setPoster(getImageURL(d.poster_path, 'w342')))
      .catch(() => {});
  }, [tmdbId]);

  return (
    <TouchableOpacity
      style={[styles.filmeCard, { width: CARD_WIDTH, height: CARD_WIDTH * 1.5 }]}
      onPress={() => router.push(`/(autenticado)/filmes/${String(tmdbId)}` as any)}
      activeOpacity={0.8}
    >
      {poster ? (
        <Image source={{ uri: poster }} style={styles.filmePoster} resizeMode="cover" />
      ) : (
        <View style={[styles.filmePoster, { backgroundColor: colors.surface }]} />
      )}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={styles.filmeOverlay}
      >
        <Text style={styles.filmeTitulo} numberOfLines={2}>{titulo}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Tela principal ───────────────────────────────────────────────────────────

export default function AtorUnico() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  
  const [ator, setAtor] = useState<any>(null);
  const [filmesOscar, setFilmesOscar] = useState<any[]>([]);
  const [indicacoes, setIndicacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bioExpandida, setBioExpandida] = useState(false);

  useEffect(() => {
    async function carregar() {
      try {
        const [pessoa, creditos] = await Promise.all([
          getPessoa(id),
          getPessoaCreditos(id),
        ]);

        const filmes = await buscarFilmesOscarDoAtor(id, creditos);
        
        setAtor({
          nome: pessoa.name,
          foto: getImageURL(pessoa.profile_path, 'w342'),
          biografia: pessoa.biography,
          genero: pessoa.gender === 1 ? 'Feminino' : pessoa.gender === 2 ? 'Masculino' : 'Não informado',
          nascimento: pessoa.birthday,
          falecimento: pessoa.deathday,
          localNascimento: pessoa.place_of_birth,
          tambemConhecidoPor: pessoa.also_known_as || [],
          creditadoEm:
            pessoa.known_for_department === 'Acting' ? 'Atuação'
            : pessoa.known_for_department === 'Directing' ? 'Direção'
            : pessoa.known_for_department === 'Writing' ? 'Roteiro'
            : pessoa.known_for_department === 'Production' ? 'Produção'
            : pessoa.known_for_department || null,
          totalCreditos: (creditos.cast?.length || 0) + (creditos.crew?.length || 0),
        });

        const inds: any[] = [];
        filmes.forEach((filme: any) => {
          Object.entries(filme.atoresIndicados).forEach(([cat, atores]) => {
            const lista = Array.isArray(atores) ? atores : [atores];
            lista.forEach((nomeAtor: any) => {
              if (
                typeof nomeAtor === 'string' &&
                nomeAtor.toLowerCase().includes(pessoa.name.toLowerCase().split(' ')[0])
              ) {
                const venceu = filme.vencedores?.some(
                  (v: string) => v === cat || v === `${cat}::${nomeAtor}`
                );
                inds.push({ categoria: cat, filme: filme.titulo, tmdbId: filme.tmdbId, ano: filme.ano, venceu });
              }
            });
          });
        });

        setIndicacoes(inds);
        setFilmesOscar(filmes);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  if (!ator) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.vazioText}>Ator não encontrado.</Text>
      </View>
    );
  }

  const idade = calcularIdade(ator.nascimento, ator.falecimento);
  const BIO_LIMITE = 400;
  const bioLonga = ator.biografia?.length > BIO_LIMITE;

  const MetaItem = ({ label, valor }: { label: string; valor: string }) => (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValor}>{valor}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── Hero ── */}
      <View style={styles.hero}>
        {ator.foto ? (
          <Image source={{ uri: ator.foto }} style={styles.foto} resizeMode="cover" />
        ) : (
          <View style={[styles.foto, { backgroundColor: colors.surface }]} />
        )}

        <View style={styles.info}>
          <Text style={styles.nome}>{ator.nome}</Text>

          <View style={styles.meta}>
            {ator.creditadoEm && (
              <MetaItem label="Creditado(a) em" valor={`${ator.totalCreditos} filmes`} />
            )}
            {ator.genero && <MetaItem label="Gênero" valor={ator.genero} />}
            {ator.nascimento && (
              <MetaItem
                label="Nascimento"
                valor={`${formatarData(ator.nascimento)}${idade !== null && !ator.falecimento ? ` (${idade} anos)` : ''}`}
              />
            )}
            {ator.falecimento && (
              <MetaItem
                label="Falecimento"
                valor={`${formatarData(ator.falecimento)}${idade !== null ? ` (${idade} anos)` : ''}`}
              />
            )}
            {ator.localNascimento && (
              <MetaItem label="Local de nascimento" valor={ator.localNascimento} />
            )}
          </View>

          {/* Aliases */}
          {ator.tambemConhecidoPor.length > 0 && (
            <View style={styles.aliasesContainer}>
              <Text style={styles.metaLabel}>Também conhecido(a) por</Text>
              <View style={styles.aliases}>
                {ator.tambemConhecidoPor.slice(0, 5).map((nome: string, i: number) => (
                  <View key={i} style={styles.aliasTag}>
                    <Text style={styles.aliasTagText}>{nome}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Biografia */}
          {ator.biografia && (
            <View style={styles.bioContainer}>
              <Text
                style={styles.bioTexto}
                numberOfLines={bioExpandida ? undefined : 5}
              >
                {ator.biografia}
              </Text>
              {bioLonga && (
                <TouchableOpacity onPress={() => setBioExpandida(!bioExpandida)}>
                  <Text style={styles.bioBtnText}>
                    {bioExpandida ? 'Ver menos' : 'Ver mais'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>

      {/* ── Indicações ao Oscar ── */}
      <View style={styles.secao}>
        <View style={styles.secaoHeader}>
          <View style={styles.secaoLinha} />
          <Text style={styles.secaoTitulo}>Indicações ao Oscar</Text>
        </View>

        {indicacoes.length === 0 ? (
          <Text style={styles.vazioText}>O ator nunca foi indicado ao Oscar.</Text>
        ) : (
          <View style={styles.indicacoes}>
            {indicacoes.map((ind, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.indicacaoCard, ind.venceu && styles.indicacaoVencedor]}
                onPress={() => router.push(`/filmes/${ind.tmdbId}` as any)}
                activeOpacity={0.8}
              >
                {ind.venceu && (
                  <Image
                    source={require('../../../assets/images/oscar2.png')}
                    style={styles.indicacaoIcone}
                    resizeMode="contain"
                  />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.indicacaoCategoria}>
                    {ind.categoria}{ind.ano ? ` • ${ind.ano}` : ''}
                  </Text>
                  <Text style={styles.indicacaoFilme}>{ind.filme}</Text>
                </View>
                {ind.venceu && (
                  <View style={styles.badgeVencedor}>
                    <Text style={styles.badgeVencedorText}>VENCEDOR</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* ── Filmes com Indicação ── */}
      <View style={styles.secao}>
        <View style={styles.secaoHeader}>
          <View style={styles.secaoLinha} />
          <Text style={styles.secaoTitulo}>Filmes com Indicação ao Oscar</Text>
        </View>

        {filmesOscar.length === 0 ? (
          <Text style={styles.vazioText}>
            O ator não participou de nenhum filme indicado ao Oscar.
          </Text>
        ) : (
          <View style={styles.filmesGrid}>
            {filmesOscar.map((filme: any, i: number) => (
              <FilmeCardSimples
                key={`${filme.tmdbId ?? 'noid'}-${i}`}
                tmdbId={filme.tmdbId}
                titulo={filme.titulo}
              />
            ))}
          </View>
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingBottom: 64,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero
  hero: {
    flexDirection: 'row',
    gap: spacing.xl,
    padding: spacing.xl,
    paddingTop: spacing.xxxl,
    alignItems: 'flex-start',
  },
  foto: {
    width: 120,
    aspectRatio: 2 / 3,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  info: {
    flex: 1,
    gap: spacing.lg,
  },
  nome: {
    fontFamily: fonts.cormorantItalic,
    fontSize: 28,
    color: colors.text,
    lineHeight: 32,
    letterSpacing: 0.3,
  },
  meta: {
    gap: spacing.md,
  },
  metaItem: {
    gap: 2,
  },
  metaLabel: {
    fontFamily: fonts.poppinsMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.white35,
  },
  metaValor: {
    fontFamily: fonts.poppins,
    fontSize: 13,
    color: colors.white85,
  },
  aliasesContainer: {
    gap: spacing.sm,
  },
  aliases: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  aliasTag: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  aliasTagText: {
    fontFamily: fonts.poppinsMedium,
    fontSize: 10,
    color: colors.gold,
    letterSpacing: 0.8,
  },
  bioContainer: {
    gap: spacing.sm,
  },
  bioTexto: {
    fontFamily: fonts.poppins,
    fontSize: 13,
    lineHeight: 22,
    color: colors.white65,
  },
  bioBtnText: {
    fontFamily: fonts.poppins,
    fontSize: 13,
    color: colors.gold,
    letterSpacing: 0.5,
    paddingTop: 4,
  },

  // Seções
  secao: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    gap: spacing.lg,
  },
  secaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  secaoLinha: {
    width: 24,
    height: 1,
    backgroundColor: colors.gold,
    opacity: 0.7,
  },
  secaoTitulo: {
    fontFamily: fonts.cormorantItalic,
    fontSize: 22,
    color: colors.text,
    letterSpacing: 0.3,
  },
  vazioText: {
    fontFamily: fonts.poppins,
    fontSize: 14,
    color: colors.white35,
    fontStyle: 'italic',
  },

  // Indicações
  indicacoes: {
    gap: 10,
  },
  indicacaoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gold15,
    borderRadius: radius.md,
  },
  indicacaoVencedor: {
    borderColor: colors.gold25,
    backgroundColor: colors.gold06,
  },
  indicacaoIcone: {
    width: 28,
    height: 28,
  },
  indicacaoCategoria: {
    fontFamily: fonts.poppinsMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.gold,
    marginBottom: 2,
  },
  indicacaoFilme: {
    fontFamily: fonts.poppins,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  badgeVencedor: {
    backgroundColor: colors.gold,
    borderRadius: radius.sm,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  badgeVencedorText: {
    fontFamily: fonts.poppinsBold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#0a0a0a',
  },

  // Grid de filmes do ator — 3 colunas
  filmesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filmeCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.5,
    aspectRatio: 2 / 3,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  filmePoster: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  filmeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  filmeTitulo: {
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 11,
    color: '#fff',
    lineHeight: 15,
  },
});