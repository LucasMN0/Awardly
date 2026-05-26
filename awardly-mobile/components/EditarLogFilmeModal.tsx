import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  Image,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Parse from '../lib/parseClient';
import { getFilme, getImageURL } from '../lib/tmdb';

// ─── Tipos ────────────────────────────────────────────────────

interface LogItem {
  id: string;
  filmeId: number | string;
  filme: any;
  estatuetas: number;
  like: boolean;
  dataAssistido: Date | null;
  review: string;
}

interface Props {
  log: LogItem | null;
  onClose: (resultado?: string) => void;
}

// ─── Estatuetas interativas ───────────────────────────────────
// Cada slot tem duas metades (Pressable) lado a lado
// metade esquerda = i-0.5, metade direita = i

const SLOT = 36;

function Estatuetas({ valor, onChange }: { valor: number; onChange: (v: number) => void }) {
  return (
    <View style={est.row}>
      {[1, 2, 3, 4, 5].map((i) => {
        const cheia = valor >= i;
        const meia = !cheia && valor >= i - 0.5;

        return (
          <View key={i} style={est.slot}>
            {/* Visual — fica atrás dos Pressables */}
            <View style={est.imgWrap} pointerEvents="none">
              {cheia ? (
                <Image source={require('../assets/images/oscar2.png')} style={est.img} />
              ) : meia ? (
                <>
                  <Image source={require('../assets/images/oscar2.png')} style={est.img} />
                  {/* cobre a metade direita pra parecer meia */}
                  <View style={est.meiaVaziaOverlay} />
                </>
              ) : (
                <Image source={require('../assets/images/oscar2.png')} style={[est.img, est.imgVazia]} />
              )}
            </View>

            {/* Toque esquerdo → meia estatueta */}
            <Pressable
              style={est.meiaEsq}
              onPress={() => onChange(valor === i - 0.5 ? 0 : i - 0.5)}
            />
            {/* Toque direito → estatueta cheia */}
            <Pressable
              style={est.meiaDir}
              onPress={() => onChange(valor === i ? 0 : i)}
            />
          </View>
        );
      })}

      {valor > 0 && <Text style={est.valor}>{valor}</Text>}
    </View>
  );
}

const est = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  slot: { width: SLOT, height: SLOT, position: 'relative' },
  imgWrap: { position: 'absolute', top: 0, left: 0, width: SLOT, height: SLOT },
  img: { width: SLOT, height: SLOT, resizeMode: 'contain' },
  imgVazia: { opacity: 0.18 },
  meiaVaziaOverlay: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: SLOT / 2,
    height: SLOT,
    backgroundColor: '#0f0d09',
    opacity: 0.65,
  },
  meiaEsq: {
    position: 'absolute', left: 0, top: 0,
    width: SLOT / 2, height: SLOT, zIndex: 10,
  },
  meiaDir: {
    position: 'absolute', right: 0, top: 0,
    width: SLOT / 2, height: SLOT, zIndex: 10,
  },
  valor: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    color: '#C9A84C',
    marginLeft: 8,
  },
});

// ─── Botão like ───────────────────────────────────────────────

function BotaoLike({ ativo, onChange }: { ativo: boolean; onChange: (v: boolean) => void }) {
  return (
    <TouchableOpacity
      style={[lk.btn, ativo && lk.btnAtivo]}
      onPress={() => onChange(!ativo)}
      activeOpacity={0.75}
    >
      <Image
        source={
          ativo
            ? require('../assets/images/envelopecoracao.png')
            : require('../assets/images/envelope.png')
        }
        style={[lk.img, ativo && lk.imgAtivo]}
      />
      <Text style={[lk.txt, ativo && lk.txtAtivo]}>
        {ativo ? 'curtido' : 'curtir'}
      </Text>
    </TouchableOpacity>
  );
}

const lk = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 4,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.15)', backgroundColor: '#111008',
  },
  btnAtivo: { borderColor: 'rgba(201,168,76,0.5)', backgroundColor: 'rgba(201,168,76,0.08)' },
  img: { width: 20, height: 20, resizeMode: 'contain', opacity: 0.4 },
  imgAtivo: { opacity: 1 },
  txt: { fontFamily: 'Poppins-Medium', fontSize: 13, color: 'rgba(255,255,255,0.35)' },
  txtAtivo: { color: '#C9A84C' },
});

// ─── Modal principal ──────────────────────────────────────────

export default function EditarLogFilmeModal({ log, onClose }: Props) {
  const [detalhes, setDetalhes] = useState<any>(null);
  const [carregandoFilme, setCarregandoFilme] = useState(false);

  const [data, setData] = useState('');
  const [estatuetas, setEstatuetas] = useState(0);
  const [like, setLike] = useState(false);
  const [review, setReview] = useState('');

  const [salvando, setSalvando] = useState(false);
  const [deletando, setDeletando] = useState(false);
  const [confirmarDelete, setConfirmarDelete] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!log) {
      setDetalhes(null);
      setData('');
      setEstatuetas(0);
      setLike(false);
      setReview('');
      setMensagem('');
      setErro('');
      setConfirmarDelete(false);
      return;
    }

    setEstatuetas(log.estatuetas);
    setLike(log.like);
    setReview(log.review || '');
    setConfirmarDelete(false);
    setMensagem('');
    setErro('');

    if (log.dataAssistido) {
      const d = new Date(log.dataAssistido);
      setData(d.toISOString().split('T')[0]);
    } else {
      setData(new Date().toISOString().split('T')[0]);
    }

    if (log.filme) {
      setDetalhes(log.filme);
    } else {
      setCarregandoFilme(true);
      getFilme(log.filmeId)
        .then(setDetalhes)
        .catch(console.error)
        .finally(() => setCarregandoFilme(false));
    }
  }, [log?.id]);

  async function handleSalvar() {
    if (!log) return;
    setSalvando(true); setErro('');
    try {
      const query = new Parse.Query('Log');
      const obj = await query.get(log.id);
      obj.set('dataAssistido', new Date(data + 'T12:00:00'));
      obj.set('estatuetas', estatuetas);
      obj.set('like', like);
      if (review.trim()) obj.set('review', review.trim());
      else obj.unset('review');
      await obj.save();
      setMensagem('Log salvo!');
      setTimeout(() => onClose('__salvo__'), 700);
    } catch (e: any) {
      setErro(e.message || 'Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  }

  async function handleDeletar() {
    if (!log) return;
    if (!confirmarDelete) { setConfirmarDelete(true); return; }
    setDeletando(true);
    try {
      const query = new Parse.Query('Log');
      const obj = await query.get(log.id);
      await obj.destroy();
      onClose('__deletado__');
    } catch (e: any) {
      setErro(e.message || 'Erro ao deletar.');
      setDeletando(false);
    }
  }

  const posterUrl = getImageURL(detalhes?.poster_path, 'w185');

  return (
    <Modal visible={!!log} animationType="slide" transparent onRequestClose={() => onClose()}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.overlay}>
        <TouchableOpacity style={s.overlayBg} activeOpacity={1} onPress={() => onClose()} />

        <View style={s.sheet}>
          <View style={s.handle} />

          <View style={s.header}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={s.headerTitulo}>editar log</Text>
              {detalhes?.title && (
                <Text style={s.headerSub} numberOfLines={1}>{detalhes.title}</Text>
              )}
            </View>
            <TouchableOpacity onPress={() => onClose()} style={s.btnFechar}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.45)" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Info do filme */}
            {carregandoFilme ? (
              <ActivityIndicator color="#C9A84C" />
            ) : detalhes ? (
              <View style={s.filmeRow}>
                {posterUrl ? (
                  <Image source={{ uri: posterUrl }} style={s.poster} />
                ) : (
                  <View style={s.posterPlaceholder}>
                    <Text style={s.posterPlaceholderTxt} numberOfLines={2}>{detalhes.title}</Text>
                  </View>
                )}
                <View style={s.filmeInfo}>
                  <Text style={s.filmeTitulo} numberOfLines={2}>{detalhes.title}</Text>
                  {detalhes.release_date && (
                    <Text style={s.filmeAno}>{detalhes.release_date.slice(0, 4)}</Text>
                  )}
                  {detalhes.overview && (
                    <Text style={s.filmeSinopse} numberOfLines={3}>{detalhes.overview}</Text>
                  )}
                </View>
              </View>
            ) : null}

            {/* Data */}
            <View style={s.campo}>
              <Text style={s.campoLabel}>quando você assistiu?</Text>
              <TextInput
                style={s.inputData}
                value={data}
                onChangeText={setData}
                placeholder="AAAA-MM-DD"
                placeholderTextColor="rgba(255,255,255,0.25)"
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            {/* Nota */}
            <View style={s.campo}>
              <Text style={s.campoLabel}>sua nota</Text>
              <Estatuetas valor={estatuetas} onChange={setEstatuetas} />
            </View>

            {/* Like */}
            <View style={s.campo}>
              <Text style={s.campoLabel}>curtiu?</Text>
              <BotaoLike ativo={like} onChange={setLike} />
            </View>

            {/* Review */}
            <View style={s.campo}>
              <View style={s.campoLabelRow}>
                <Text style={s.campoLabel}>review</Text>
                <Text style={s.opcional}>opcional</Text>
              </View>
              <TextInput
                style={s.textarea}
                value={review}
                onChangeText={setReview}
                placeholder="O que você achou do filme?"
                placeholderTextColor="rgba(255,255,255,0.25)"
                multiline
                numberOfLines={3}
                maxLength={500}
                textAlignVertical="top"
              />
              {review.length > 0 && (
                <Text style={s.contador}>{review.length}/500</Text>
              )}
            </View>

            {mensagem ? <Text style={[s.msg, s.msgSucesso]}>{mensagem}</Text> : null}
            {erro ? <Text style={[s.msg, s.msgErro]}>{erro}</Text> : null}

            <View style={s.acoes}>
              <TouchableOpacity
                style={[s.btnDeletar, confirmarDelete && s.btnDeletarConfirmar]}
                onPress={handleDeletar}
                disabled={deletando}
              >
                <Text style={[s.btnDeletarTxt, confirmarDelete && s.btnDeletarTxtConfirmar]}>
                  {deletando ? 'excluindo...' : confirmarDelete ? 'confirmar exclusão' : 'excluir log'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.btnSalvar} onPress={handleSalvar} disabled={salvando}>
                <Text style={s.btnSalvarTxt}>
                  {salvando ? 'salvando...' : 'salvar alterações'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const GOLD = '#C9A84C';
const CARD_BG = '#111008';
const BORDER = 'rgba(201,168,76,0.15)';

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
  sheet: {
    backgroundColor: '#0f0d09',
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: '90%', borderTopWidth: 1, borderColor: BORDER,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: 20, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  headerTitulo: { fontFamily: 'CormorantGaramond-MediumItalic', fontSize: 30, color: '#fff' },
  headerSub: { fontFamily: 'Poppins-Regular', fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 7 },
  btnFechar: { padding: 4 },

  scrollContent: { padding: 20, gap: 20, paddingBottom: 40 },

  filmeRow: {
    flexDirection: 'row', gap: 14,
    backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER,
    borderRadius: 6, padding: 12,
  },
  poster: { width: 60, height: 90, borderRadius: 4, resizeMode: 'cover' },
  posterPlaceholder: {
    width: 60, height: 90, borderRadius: 4, backgroundColor: '#1a1712',
    alignItems: 'center', justifyContent: 'center', padding: 6,
  },
  posterPlaceholderTxt: { fontFamily: 'Poppins-Regular', fontSize: 10, color: 'rgba(255,255,255,0.25)', textAlign: 'center' },
  filmeInfo: { flex: 1, gap: 3 },
  filmeTitulo: { fontFamily: 'Poppins-SemiBold', fontSize: 14, color: '#fff', lineHeight: 18 },
  filmeAno: { fontFamily: 'Poppins-Regular', fontSize: 12, color: 'rgba(255,255,255,0.35)' },
  filmeSinopse: { fontFamily: 'Poppins-Regular', fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 16, marginTop: 2 },

  campo: { gap: 10 },
  campoLabelRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  campoLabel: {
    fontFamily: 'Poppins-Medium', fontSize: 11,
    textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.45)',
  },
  opcional: { fontFamily: 'Poppins-Regular', fontSize: 10, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' },
  inputData: {
    borderWidth: 1, borderColor: BORDER, borderRadius: 4,
    paddingHorizontal: 12, paddingVertical: 10,
    color: '#fff', fontFamily: 'Poppins-Regular', fontSize: 13, backgroundColor: CARD_BG,
  },
  textarea: {
    borderWidth: 1, borderColor: BORDER, borderRadius: 4, padding: 12,
    color: '#fff', fontFamily: 'Poppins-Regular', fontSize: 13, lineHeight: 20,
    minHeight: 80, backgroundColor: CARD_BG, textAlignVertical: 'top',
  },
  contador: { fontFamily: 'Poppins-Regular', fontSize: 10, color: 'rgba(255,255,255,0.25)', textAlign: 'right', marginTop: -4 },

  msg: { fontFamily: 'Poppins-Regular', fontSize: 13, textAlign: 'center', borderRadius: 4, padding: 10 },
  msgSucesso: { color: GOLD, backgroundColor: 'rgba(201,168,76,0.08)' },
  msgErro: { color: '#e05c5c', backgroundColor: 'rgba(224,92,92,0.08)' },

  acoes: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 4 },
  btnDeletar: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 4, borderWidth: 1, borderColor: BORDER },
  btnDeletarConfirmar: { borderColor: '#e05c5c', backgroundColor: 'rgba(224,92,92,0.08)' },
  btnDeletarTxt: { fontFamily: 'Poppins-Medium', fontSize: 13, color: 'rgba(255,255,255,0.45)' },
  btnDeletarTxtConfirmar: { color: '#e05c5c' },
  btnSalvar: { flex: 1, paddingVertical: 12, backgroundColor: GOLD, borderRadius: 4, alignItems: 'center' },
  btnSalvarTxt: { fontFamily: 'Poppins-SemiBold', fontSize: 13, color: '#0a0906' },
});