import { useState, useEffect } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity,
  TextInput, Image, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Parse from '../lib/parseClient';
import { colors, fonts, spacing, radius } from '../constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');

const TMDB_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const TMDB_IMAGE = process.env.EXPO_PUBLIC_TMDB_IMAGE_BASE;

const CATEGORIAS_ATOR = ['Melhor Ator', 'Melhor Atriz', 'Melhor Ator Coadjuvante', 'Melhor Atriz Coadjuvante'];
const CATEGORIAS_DIRETOR = ['Melhor Diretor'];
const CATEGORIAS_ROTEIRO = ['Melhor Roteiro Original', 'Melhor Roteiro Adaptado'];
const CATEGORIA_CANCAO = 'Melhor Canção Original';

function tipoCategoria(categoria: string) {
  if (CATEGORIAS_ATOR.includes(categoria)) return 'ator';
  if (CATEGORIAS_DIRETOR.includes(categoria)) return 'diretor';
  if (CATEGORIAS_ROTEIRO.includes(categoria)) return 'roteiro';
  if (categoria === CATEGORIA_CANCAO) return 'cancao';
  return 'filme';
}

async function buscarFotoPessoa(nome: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.themoviedb.org/3/search/person?api_key=${TMDB_KEY}&query=${encodeURIComponent(nome)}&language=pt-BR`);
    const data = await res.json();
    const person = data.results?.[0];
    return person?.profile_path ? `${TMDB_IMAGE}/w185${person.profile_path}` : null;
  } catch { return null; }
}

async function buscarPosterFilme(tmdbId: string | number): Promise<string | null> {
  if (!tmdbId) return null;
  try {
    const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_KEY}&language=pt-BR`);
    const data = await res.json();
    return data?.poster_path ? `${TMDB_IMAGE}/w342${data.poster_path}` : null;
  } catch { return null; }
}

interface Indicado { nomeItem: string | null; filme: string; foto: string | null; venceu: boolean; }

function CardIndicado({ nomeItem, filme, tipo, foto, selecionado, onPress }: {
  nomeItem: string | null; filme: string; tipo: string;
  foto: string | null; selecionado: boolean; onPress: () => void;
}) {
  const ehPessoa = tipo === 'ator' || tipo === 'diretor';
  const CARD_W = (SCREEN_W - 48 - 24) / 3;

  return (
    <TouchableOpacity
      style={[s.cardIndicado, selecionado && s.cardIndicadoSel, { width: CARD_W }]}
      onPress={onPress} activeOpacity={0.8}
    >
      <View style={[s.cardImgWrap, { aspectRatio: ehPessoa ? 1 : 2 / 3 }]}>
        {foto ? (
          <Image source={{ uri: foto }} style={s.cardImg} />
        ) : (
          <View style={s.cardImgPlaceholder}>
            <Text style={s.cardImgPlaceholderTxt}>{(nomeItem || filme || '?')[0]}</Text>
          </View>
        )}
        {selecionado && (
          <View style={s.cardCheck}>
            <Ionicons name="checkmark" size={14} color="#0a0906" />
          </View>
        )}
      </View>
      <Text style={s.cardNome} numberOfLines={2}>{nomeItem || filme}</Text>
      {(ehPessoa || tipo === 'cancao') && <Text style={s.cardSub} numberOfLines={1}>{filme}</Text>}
    </TouchableOpacity>
  );
}

interface Props {
  visivel: boolean;
  categoria: string;
  ano: number;
  filmes: any[];
  onClose: (resultado?: string) => void;
}

export default function LogCategoriaModal({ visivel, categoria, ano, filmes, onClose }: Props) {
  const tipo = tipoCategoria(categoria);
  const [indicados, setIndicados] = useState<Indicado[]>([]);
  const [deveria, setDeveria] = useState<string | null>(null);
  const [queria, setQueria] = useState<string | null>(null);
  const [review, setReview] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [deletando, setDeletando] = useState(false);
  const [confirmarDelete, setConfirmarDelete] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [jaLogado, setJaLogado] = useState<any>(null);
  const [montando, setMontando] = useState(false);

  useEffect(() => {
    if (!visivel) {
        setIndicados([]);
        setDeveria(null);
        setQueria(null);
        setReview('');
        setMensagem('');
        setJaLogado(null);
        setConfirmarDelete(false);
        return;
    }
    montar();
  }, [visivel, categoria, ano]);

  async function montar() {
    setMontando(true);
    setMensagem('');
    setConfirmarDelete(false);
    try {   
      const lista: Indicado[] = [];

      for (const filme of filmes) {
        const posterUrl = filme.poster || await buscarPosterFilme(filme.tmdbId);

        if (tipo === 'ator') {
          const atores = filme.atoresIndicados?.[categoria];
          const nomes = Array.isArray(atores) ? atores : atores ? [atores] : [];
          for (const nome of nomes) {
            const foto = await buscarFotoPessoa(nome);
            const vencedores = filme.vencedores || [];
            const temDetalhado = vencedores.some((v: string) => v.startsWith(`${categoria}::`));
            const venceu = temDetalhado ? vencedores.includes(`${categoria}::${nome}`) : vencedores.includes(categoria);
            lista.push({ nomeItem: nome, filme: filme.titulo, foto, venceu });
          }
        } else if (tipo === 'diretor') {
          const nome = filme.diretor;
          if (nome) {
            const foto = await buscarFotoPessoa(nome);
            lista.push({ nomeItem: nome, filme: filme.titulo, foto, venceu: (filme.vencedores || []).includes(categoria) });
          }
        } else if (tipo === 'roteiro') {
          const nomes = Array.isArray(filme.roteiristas) ? filme.roteiristas.join(', ') : filme.roteiristas;
          lista.push({ nomeItem: nomes, filme: filme.titulo, foto: posterUrl, venceu: (filme.vencedores || []).includes(categoria) });
        } else if (tipo === 'cancao') {
          const cancoes = filme.cancao?.[categoria];
          const nms = Array.isArray(cancoes) ? cancoes : cancoes ? [cancoes] : [];
          for (const cancao of nms) {
            const venceu = (filme.vencedores || []).some((v: string) => v === `${categoria}::${cancao}` || v === categoria);
            lista.push({ nomeItem: cancao, filme: filme.titulo, foto: posterUrl, venceu });
          }
        } else {
          lista.push({ nomeItem: null, filme: filme.titulo, foto: posterUrl, venceu: (filme.vencedores || []).includes(categoria) });
        }
      }

      // Remove duplicatas
      const unicos = lista.filter((item, idx, arr) =>
        arr.findIndex((i) => i.nomeItem === item.nomeItem && i.filme === item.filme) === idx
      );
      setIndicados(unicos);

      // Carrega log existente
      const user = Parse.User.current();
      if (!user) return;
      const query = new Parse.Query('LogCategoria');
      query.equalTo('usuarioId', user);
      query.equalTo('categoria', categoria);
      query.equalTo('ano', ano);
      const existing = await query.first();
      if (existing) {
        setJaLogado(existing);
        setDeveria(existing.get('deveriaTerGanhado') || null);
        setQueria(existing.get('queriaQueGanhasse') || null);
        setReview(existing.get('review') || '');
      } else {
        setJaLogado(null);
        setDeveria(null);
        setQueria(null);
        setReview('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMontando(false);
    }
  }

  const vencedorReal = indicados.find((i) => i.venceu);
  const vencedorLabel = vencedorReal ? (vencedorReal.nomeItem ?? vencedorReal.filme) : '';

  async function handleSalvar() {
    if (!deveria || !queria) { setMensagem('Selecione as duas opções antes de salvar.'); return; }
    setSalvando(true); setMensagem('');
    try {
      const user = Parse.User.current();
      if (!user) throw new Error('Você precisa estar logado.');
      const LogCategoria = Parse.Object.extend('LogCategoria');
      const obj = jaLogado || new LogCategoria();
      obj.set('usuarioId', user);
      obj.set('categoria', categoria);
      obj.set('ano', ano);
      obj.set('vencedorReal', vencedorLabel);
      obj.set('deveriaTerGanhado', deveria);
      obj.set('queriaQueGanhasse', queria);
      obj.set('review', review);
      await obj.save();
      setMensagem('Log salvo!');
      setTimeout(() => onClose('__salvo__'), 700);
    } catch (e: any) {
      setMensagem(e.message || 'Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  }

  async function handleDeletar() {
    if (!jaLogado) return;
    if (!confirmarDelete) { setConfirmarDelete(true); return; }
    setDeletando(true);
    try {
      await jaLogado.destroy();
      onClose('__deletado__');
    } catch (e: any) {
      setMensagem(e.message || 'Erro ao deletar.');
      setDeletando(false);
    }
  }

  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={() => onClose()}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.overlay}>
        <TouchableOpacity style={s.overlayBg} activeOpacity={1} onPress={() => onClose()} />

        <View style={s.sheet}>
          {/* Handle */}
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.headerTitulo}>log da categoria</Text>
              <Text style={s.headerSub}>{categoria} · {ano}</Text>
            </View>
            <TouchableOpacity onPress={() => onClose()} style={s.btnFechar}>
              <Ionicons name="close" size={20} color={colors.white45} />
            </TouchableOpacity>
          </View>

          {montando ? (
            <View style={s.montandoWrap}>
              <ActivityIndicator color={colors.gold} />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

              {/* Vencedor real */}
              {vencedorReal && (
                <View style={s.vencedorBox}>
                  {vencedorReal.foto ? (
                    <Image source={{ uri: vencedorReal.foto }} style={s.vencedorFoto} />
                  ) : (
                    <View style={s.vencedorFotoPlaceholder}>
                      <Text style={{ fontSize: 20 }}>🏆</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.vencedorLabel}>vencedor real</Text>
                    <Text style={s.vencedorNome}>{vencedorLabel}</Text>
                    {vencedorReal.nomeItem && <Text style={s.vencedorFilme}>{vencedorReal.filme}</Text>}
                  </View>
                </View>
              )}

              {/* Deveria ter ganhado */}
              <View style={s.secao}>
                <Text style={s.secaoLabel}>quem deveria ter ganhado?</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={s.cardsRow}>
                    {indicados.map((ind, i) => (
                      <CardIndicado key={i} tipo={tipo} nomeItem={ind.nomeItem} filme={ind.filme}
                        foto={ind.foto} selecionado={deveria === (ind.nomeItem ?? ind.filme)}
                        onPress={() => setDeveria(ind.nomeItem ?? ind.filme)} />
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Queria que ganhasse */}
              <View style={s.secao}>
                <Text style={s.secaoLabel}>quem você queria que ganhasse?</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={s.cardsRow}>
                    {indicados.map((ind, i) => (
                      <CardIndicado key={i} tipo={tipo} nomeItem={ind.nomeItem} filme={ind.filme}
                        foto={ind.foto} selecionado={queria === (ind.nomeItem ?? ind.filme)}
                        onPress={() => setQueria(ind.nomeItem ?? ind.filme)} />
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Review */}
              <View style={s.secao}>
                <Text style={s.secaoLabel}>review</Text>
                <TextInput
                  style={s.textarea}
                  placeholder="Escreva sua opinião..."
                  placeholderTextColor={colors.white35}
                  value={review}
                  onChangeText={setReview}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                />
              </View>

              {/* Mensagem */}
              {mensagem ? (
                <Text style={[s.mensagem, mensagem === 'Log salvo!' ? s.mensagemSucesso : s.mensagemErro]}>
                  {mensagem}
                </Text>
              ) : null}

              {/* Ações */}
              <View style={s.acoes}>
                {jaLogado && (
                  <TouchableOpacity
                    style={[s.btnDeletar, confirmarDelete && s.btnDeletarConfirmar]}
                    onPress={handleDeletar} disabled={deletando}
                  >
                    <Text style={[s.btnDeletarTxt, confirmarDelete && s.btnDeletarTxtConfirmar]}>
                      {deletando ? 'excluindo...' : confirmarDelete ? 'confirmar exclusão' : 'excluir log'}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.btnSalvar} onPress={handleSalvar} disabled={salvando}>
                  <Text style={s.btnSalvarTxt}>
                    {salvando ? 'salvando...' : jaLogado ? 'atualizar log' : 'salvar log'}
                  </Text>
                </TouchableOpacity>
              </View>

            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: '90%', borderTopWidth: 1, borderColor: colors.border,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitulo: { fontFamily: fonts.cormorantItalic, fontSize: 22, color: colors.text },
  headerSub: { fontFamily: fonts.poppins, fontSize: 13, color: colors.white45, marginTop: 2 },
  btnFechar: { padding: 4 },
  montandoWrap: { padding: 40, alignItems: 'center' },
  scrollContent: { padding: 20, gap: 24, paddingBottom: 40 },

  // Vencedor
  vencedorBox: {
    flexDirection: 'row', gap: 12, alignItems: 'center',
    backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.gold30,
    borderRadius: 6, padding: 12,
  },
  vencedorFoto: { width: 52, height: 52, borderRadius: 6, resizeMode: 'cover' },
  vencedorFotoPlaceholder: { width: 52, height: 52, borderRadius: 6, backgroundColor: colors.cardBg, alignItems: 'center', justifyContent: 'center' },
  vencedorLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: colors.white35, fontFamily: fonts.poppins },
  vencedorNome: { fontFamily: fonts.poppinsBold, fontSize: 15, color: colors.text, marginTop: 2 },
  vencedorFilme: { fontFamily: fonts.poppins, fontSize: 12, color: colors.white45, marginTop: 1 },

  // Seções
  secao: { gap: 10 },
  secaoLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: colors.white45, fontFamily: fonts.poppinsMedium },
  cardsRow: { flexDirection: 'row', gap: 10, paddingBottom: 4 },

  // Card indicado
  cardIndicado: { gap: 6 },
  cardIndicadoSel: {},
  cardImgWrap: { borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  cardImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardImgPlaceholder: { width: '100%', height: '100%', backgroundColor: colors.cardBg, alignItems: 'center', justifyContent: 'center' },
  cardImgPlaceholderTxt: { color: colors.white35, fontSize: 22, fontFamily: fonts.cormorant },
  cardCheck: {
    position: 'absolute', top: 6, right: 6, width: 22, height: 22,
    borderRadius: 11, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center',
  },
  cardNome: { fontFamily: fonts.poppinsMedium, fontSize: 11, color: colors.text, lineHeight: 14 },
  cardSub: { fontFamily: fonts.poppins, fontSize: 10, color: colors.white45 },

  // Textarea
  textarea: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 4, padding: 12,
    color: colors.text, fontFamily: fonts.poppins, fontSize: 13, lineHeight: 20,
    minHeight: 80, backgroundColor: colors.cardBg, textAlignVertical: 'top',
  },

  // Mensagem
  mensagem: { fontSize: 13, textAlign: 'center', fontFamily: fonts.poppins, borderRadius: 4, padding: 10 },
  mensagemSucesso: { color: colors.gold, backgroundColor: colors.gold10 },
  mensagemErro: { color: colors.error, backgroundColor: colors.errorBg },

  // Ações
  acoes: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 4 },
  btnDeletar: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 4, borderWidth: 1, borderColor: colors.border },
  btnDeletarConfirmar: { borderColor: colors.error, backgroundColor: colors.errorBg },
  btnDeletarTxt: { fontFamily: fonts.poppinsMedium, fontSize: 13, color: colors.white45 },
  btnDeletarTxtConfirmar: { color: colors.error },
  btnSalvar: { flex: 1, paddingVertical: 12, backgroundColor: colors.gold, borderRadius: 4, alignItems: 'center' },
  btnSalvarTxt: { fontFamily: fonts.poppinsBold, fontSize: 13, color: '#0a0906' },
});