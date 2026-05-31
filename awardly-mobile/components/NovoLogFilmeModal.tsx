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
import { colors, fonts } from '../constants/theme';

// ─── Tipos ────────────────────────────────────────────────────

interface FilmeResultado {
  objectId?: string;
  tmdbId: number;
  titulo: string;
}

interface Props {
  filme: FilmeResultado | null;
  onClose: (resultado?: string) => void;
}

// ─── Estatuetas interativas ───────────────────────────────────

const SLOT = 36;

function Estatuetas({ valor, onChange }: { valor: number; onChange: (v: number) => void }) {
  return (
    <View style={est.row}>
      {[1, 2, 3, 4, 5].map((i) => {
        const cheia = valor >= i;
        const meia = !cheia && valor >= i - 0.5;

        return (
          <View key={i} style={est.slot}>
            <View style={est.imgWrap} pointerEvents="none">
              {cheia ? (
                <Image source={require('../assets/images/oscar2.png')} style={est.img} />
              ) : meia ? (
                <>
                  <Image source={require('../assets/images/oscar2.png')} style={est.img} />
                  <View style={est.meiaVaziaOverlay} />
                </>
              ) : (
                <Image source={require('../assets/images/oscar2.png')} style={[est.img, est.imgVazia]} />
              )}
            </View>
            <Pressable style={est.meiaEsq} onPress={() => onChange(valor === i - 0.5 ? 0 : i - 0.5)} />
            <Pressable style={est.meiaDir} onPress={() => onChange(valor === i ? 0 : i)} />
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
    position: 'absolute', right: 0, top: 0, width: SLOT / 2, height: SLOT,
    backgroundColor: colors.bg, opacity: 0.65,
  },
  meiaEsq: { position: 'absolute', left: 0, top: 0, width: SLOT / 2, height: SLOT, zIndex: 10 },
  meiaDir: { position: 'absolute', right: 0, top: 0, width: SLOT / 2, height: SLOT, zIndex: 10 },
  valor: { fontFamily: fonts.poppinsMedium, fontSize: 13, color: colors.gold, marginLeft: 8 },
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
      <Text style={[lk.txt, ativo && lk.txtAtivo]}>{ativo ? 'curtido' : 'curtir'}</Text>
    </TouchableOpacity>
  );
}

const lk = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 4,
    borderWidth: 1, borderColor: colors.gold15, backgroundColor: colors.cardBg,
  },
  btnAtivo: { borderColor: colors.gold40, backgroundColor: colors.gold10 },
  img: { width: 20, height: 20, resizeMode: 'contain', opacity: 0.4 },
  imgAtivo: { opacity: 1 },
  txt: { fontFamily: fonts.poppinsMedium, fontSize: 13, color: colors.white35 },
  txtAtivo: { color: colors.gold },
});

// ─── Modal principal ──────────────────────────────────────────

export default function NovoLogFilmeModal({ filme, onClose }: Props) {
  const [detalhes, setDetalhes] = useState<any>(null);
  const [carregandoFilme, setCarregandoFilme] = useState(false);

  const [data, setData] = useState('');
  const [estatuetas, setEstatuetas] = useState(0);
  const [like, setLike] = useState(false);
  const [review, setReview] = useState('');

  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!filme) {
      setDetalhes(null);
      setData('');
      setEstatuetas(0);
      setLike(false);
      setReview('');
      setMensagem('');
      setErro('');
      return;
    }

    setData(new Date().toISOString().split('T')[0]);
    setEstatuetas(0);
    setLike(false);
    setReview('');
    setMensagem('');
    setErro('');

    setCarregandoFilme(true);
    getFilme(filme.tmdbId)
      .then(setDetalhes)
      .catch(console.error)
      .finally(() => setCarregandoFilme(false));
  }, [filme]);

  async function handleSalvar() {
    if (!filme) return;
    setSalvando(true);
    setErro('');

    try {
      const user = Parse.User.current();
      if (!user) throw new Error('Usuário não autenticado.');

      const Log = Parse.Object.extend('Log');
      const novoLog = new Log();

      novoLog.set('usuarioId', user);
      novoLog.set('filmeId', filme.tmdbId);

      if (filme.objectId) {
        const FilmePointer = Parse.Object.extend('Filme');
        novoLog.set('filme', FilmePointer.createWithoutData(filme.objectId));
      }

      novoLog.set('dataAssistido', new Date(data + 'T12:00:00'));
      novoLog.set('estatuetas', estatuetas);
      novoLog.set('like', like);
      if (review.trim()) novoLog.set('review', review.trim());

      await novoLog.save();

      setMensagem('Log criado com sucesso!');
      setTimeout(() => onClose('__salvo__'), 700);
    } catch (e: any) {
      setErro(e.message || 'Erro ao criar log.');
    } finally {
      setSalvando(false);
    }
  }

  const posterUrl = getImageURL(detalhes?.poster_path, 'w185');

  return (
    <Modal visible={!!filme} animationType="slide" transparent onRequestClose={() => onClose()}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.overlay}>
        <TouchableOpacity style={s.overlayBg} activeOpacity={1} onPress={() => onClose()} />

        <View style={s.sheet}>
          <View style={s.handle} />

          <View style={s.header}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={s.headerTitulo}>novo log</Text>
              {filme?.titulo && (
                <Text style={s.headerSub} numberOfLines={1}>{filme.titulo}</Text>
              )}
            </View>
            <TouchableOpacity onPress={() => onClose()} style={s.btnFechar}>
              <Ionicons name="close" size={20} color={colors.white45} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {carregandoFilme ? (
              <ActivityIndicator color={colors.gold} />
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

            <View style={s.campo}>
              <Text style={s.campoLabel}>quando você assistiu?</Text>
              <TextInput
                style={s.inputData}
                value={data}
                onChangeText={setData}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={colors.white35}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            <View style={s.campo}>
              <Text style={s.campoLabel}>sua nota</Text>
              <Estatuetas valor={estatuetas} onChange={setEstatuetas} />
            </View>

            <View style={s.campo}>
              <Text style={s.campoLabel}>curtiu?</Text>
              <BotaoLike ativo={like} onChange={setLike} />
            </View>

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
                placeholderTextColor={colors.white35}
                multiline
                numberOfLines={3}
                maxLength={500}
                textAlignVertical="top"
              />
              {review.length > 0 && <Text style={s.contador}>{review.length}/500</Text>}
            </View>

            {mensagem ? <Text style={[s.msg, s.msgSucesso]}>{mensagem}</Text> : null}
            {erro ? <Text style={[s.msg, s.msgErro]}>{erro}</Text> : null}

            <View style={s.acoes}>
              <TouchableOpacity style={s.btnSalvar} onPress={handleSalvar} disabled={salvando}>
                <Text style={s.btnSalvarTxt}>
                  {salvando ? 'salvando...' : 'salvar log'}
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

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay70 },
  sheet: {
    backgroundColor: colors.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: '90%', borderTopWidth: 1, borderColor: colors.gold15,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: colors.white10,
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: 20, borderBottomWidth: 1, borderBottomColor: colors.gold15,
  },
  headerTitulo: { fontFamily: fonts.cormorantRegular, fontSize: 30, color: colors.text },
  headerSub: { fontFamily: fonts.poppins, fontSize: 13, color: colors.white45, marginTop: 7 },
  btnFechar: { padding: 4 },
  scrollContent: { padding: 20, gap: 20, paddingBottom: 40 },
  filmeRow: {
    flexDirection: 'row', gap: 14, backgroundColor: colors.cardBg, borderWidth: 1,
    borderColor: colors.gold15, borderRadius: 6, padding: 12,
  },
  poster: { width: 60, height: 90, borderRadius: 4, resizeMode: 'cover' },
  posterPlaceholder: {
    width: 60, height: 90, borderRadius: 4, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', padding: 6,
  },
  posterPlaceholderTxt: { fontFamily: fonts.poppins, fontSize: 10, color: colors.white35, textAlign: 'center' },
  filmeInfo: { flex: 1, gap: 3 },
  filmeTitulo: { fontFamily: fonts.poppinsSemiBold, fontSize: 14, color: colors.text, lineHeight: 18 },
  filmeAno: { fontFamily: fonts.poppins, fontSize: 12, color: colors.white35 },
  filmeSinopse: { fontFamily: fonts.poppins, fontSize: 11, color: colors.white35, lineHeight: 16, marginTop: 2 },
  campo: { gap: 10 },
  campoLabelRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  campoLabel: {
    fontFamily: fonts.poppinsMedium, fontSize: 11, textTransform: 'uppercase',
    letterSpacing: 1, color: colors.white45,
  },
  opcional: { fontFamily: fonts.poppins, fontSize: 10, color: colors.white35, fontStyle: 'italic' },
  inputData: {
    borderWidth: 1, borderColor: colors.gold15, borderRadius: 4, paddingHorizontal: 12,
    paddingVertical: 10, color: colors.text, fontFamily: fonts.poppins,
    fontSize: 13, backgroundColor: colors.cardBg,
  },
  textarea: {
    borderWidth: 1, borderColor: colors.gold15, borderRadius: 4, padding: 12,
    color: colors.text, fontFamily: fonts.poppins, fontSize: 13, lineHeight: 20,
    minHeight: 80, backgroundColor: colors.cardBg, textAlignVertical: 'top',
  },
  contador: { fontFamily: fonts.poppins, fontSize: 10, color: colors.white35, textAlign: 'right', marginTop: -4 },
  msg: { fontFamily: fonts.poppins, fontSize: 13, textAlign: 'center', borderRadius: 4, padding: 10 },
  msgSucesso: { color: colors.gold, backgroundColor: colors.gold10 },
  msgErro: { color: colors.error, backgroundColor: colors.errorBg },
  acoes: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 4 },
  btnSalvar: { flex: 1, paddingVertical: 12, backgroundColor: colors.gold, borderRadius: 4, alignItems: 'center' },
  btnSalvarTxt: { fontFamily: fonts.poppinsSemiBold, fontSize: 13, color: colors.black },
});