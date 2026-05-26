import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Parse from '../../../lib/parseClient';
import LogCategoriaModal from '../../../components/LogCategoriaModal';

// ─── Constantes ───────────────────────────────────────────────

const GOLD = '#C9A84C';
const BG = '#0a0906';
const CARD_BG = '#111008';
const BORDER = 'rgba(201,168,76,0.15)';
const TMDB_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const TMDB_IMAGE = process.env.EXPO_PUBLIC_TMDB_IMAGE_BASE;

const CATEGORIAS_PESSOA = [
  'Melhor Ator',
  'Melhor Atriz',
  'Melhor Ator Coadjuvante',
  'Melhor Atriz Coadjuvante',
  'Melhor Diretor',
];

// ─── Tipos ────────────────────────────────────────────────────

interface LogCategoriaItem {
  objectId: string;
  categoria: string;
  ano: number;
  vencedorReal: string | null;
  deveriaTerGanhado: string | null;
  queriaQueGanhasse: string | null;
  review: string | null;
  filmes: any[];
  fotoVencedor: string | null;
  fotoDeveria: string | null;
  fotoQueria: string | null;
}

interface Props {
  /** Chamado após salvar ou deletar um log, para que o pai possa recarregar os stats */
  onRecarregar?: () => void;
}

// ─── Helpers TMDB ─────────────────────────────────────────────

async function fetchFotoPessoa(nome: string): Promise<string | null> {
  if (!nome || !TMDB_KEY) return null;
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/person?api_key=${TMDB_KEY}&query=${encodeURIComponent(nome)}&language=pt-BR`
    );
    const data = await res.json();
    const person = data.results?.[0];
    return person?.profile_path ? `${TMDB_IMAGE}/w185${person.profile_path}` : null;
  } catch {
    return null;
  }
}

async function fetchPosterFilme(tmdbId: string | number): Promise<string | null> {
  if (!tmdbId || !TMDB_KEY) return null;
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_KEY}&language=pt-BR`
    );
    const data = await res.json();
    return data?.poster_path ? `${TMDB_IMAGE}/w342${data.poster_path}` : null;
  } catch {
    return null;
  }
}

// Busca o tmdbId de um filme pelo título exato dentro de uma categoria+ano
async function fetchTmdbIdPorTitulo(
  categoria: string,
  ano: number,
  titulo: string | null
): Promise<string | number | undefined> {
  if (!titulo) return undefined;
  try {
    const q = new Parse.Query('Filme');
    q.limit(1000);
    const todos = await q.find();
    q.equalTo('ano', ano);
    q.equalTo('categorias', categoria);
    q.limit(20);
    const results = await q.find();
    const match = results.find((f: any) => f.get('titulo') === titulo);
    return match?.get('tmdbId');
  } catch {
    return undefined;
  }
}

// Busca o tmdbId de um filme pelo título via TMDB search (fallback)
async function fetchTmdbIdViaBusca(titulo: string): Promise<string | number | undefined> {
  if (!titulo || !TMDB_KEY) return undefined;
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(titulo)}&language=pt-BR`
    );
    const data = await res.json();
    return data.results?.[0]?.id;
  } catch {
    return undefined;
  }
}

// Retorna a foto/poster para uma entrada, buscando o tmdbId individualmente por nome
async function fetchFotoParaEntrada(
  nome: string | null,
  categoria: string,
  ano: number
): Promise<string | null> {
  if (!nome) return null;
  if (CATEGORIAS_PESSOA.includes(categoria)) return fetchFotoPessoa(nome);
  // Para filmes: busca o tmdbId pelo título no Parse, com fallback no TMDB search
  let tmdbId = await fetchTmdbIdPorTitulo(categoria, ano, nome);
  if (!tmdbId) tmdbId = await fetchTmdbIdViaBusca(nome);
  if (tmdbId) return fetchPosterFilme(tmdbId);
  return null;
}

// ─── FotoSlot ────────────────────────────────────────────────

function FotoSlot({
  foto,
  nome,
  label,
  destaque,
  ehPessoa,
}: {
  foto: string | null;
  nome: string | null;
  label: string;
  destaque?: boolean;
  ehPessoa: boolean;
}) {
  return (
    <View style={s.fotoSlotWrap}>
      <View
        style={[
          s.fotoSlot,
          ehPessoa ? s.fotoSlotPessoa : s.fotoSlotFilme,
          destaque && s.fotoSlotDestaque,
        ]}
      >
        {foto ? (
          <Image source={{ uri: foto }} style={s.fotoSlotImg} />
        ) : (
          <View style={s.fotoSlotPlaceholder}>
            <Text style={s.fotoSlotPlaceholderTxt} numberOfLines={1}>
              {(nome || '?')[0].toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <Text style={s.fotoSlotLabel}>{label}</Text>
      <Text
        style={[s.fotoSlotNome, destaque && s.fotoSlotNomeDestaque]}
        numberOfLines={2}
      >
        {nome || '—'}
      </Text>
    </View>
  );
}

// ─── LogCategoriaCardEditavel ─────────────────────────────────

function LogCategoriaCardEditavel({
  log,
  onEditar,
}: {
  log: LogCategoriaItem;
  onEditar: () => void;
}) {
  const ehPessoa = CATEGORIAS_PESSOA.includes(log.categoria);

  // Normaliza: trata string vazia como null para evitar comparações falsas
  const vencedor = log.vencedorReal?.trim() || null;
  const deveria = log.deveriaTerGanhado?.trim() || null;
  const queria = log.queriaQueGanhasse?.trim() || null;

  // "DEVERIA" e "QUERIA" ficam dourados apenas se:
  // 1. O campo está preenchido
  // 2. Existe um vencedor real conhecido
  // 3. São diferentes do vencedor real
  const deveDestaque = !!deveria && !!vencedor && deveria !== vencedor;
  const queriaDestaque = !!queria && !!vencedor && queria !== vencedor;
  return (
    <View style={s.logCatCard}>
      <View style={s.logCatHeader}>
        <Text style={s.logCatCategoria} numberOfLines={1}>
          {log.categoria}
        </Text>
        <View style={s.logCatHeaderDir}>
          <Text style={s.logCatAno}>{log.ano}</Text>
          <TouchableOpacity
            onPress={onEditar}
            style={s.btnEditarCat}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Image
              source={require('../../../assets/images/lapis.png')}
              style={s.lapisImgCat}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.fotoRow}>
        <FotoSlot
          foto={log.fotoVencedor}
          nome={vencedor}
          label="VENCEU"
          ehPessoa={ehPessoa}
        />
        <FotoSlot
          foto={log.fotoDeveria}
          nome={deveria}
          label="DEVERIA TER GANHADO"
          destaque={deveDestaque}
          ehPessoa={ehPessoa}
        />
        <FotoSlot
          foto={log.fotoQueria}
          nome={queria}
          label="QUERIA QUE GANHASSE"
          destaque={queriaDestaque}
          ehPessoa={ehPessoa}
        />
      </View>

      {log.review ? (
        <View style={s.logCatReviewWrap}>
          <View style={s.logCatReviewBarra} />
          <Text style={s.logCatReview} numberOfLines={3}>
            {log.review}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── Componente principal ─────────────────────────────────────

export default function PerfilCategorias({ onRecarregar }: Props) {
  const [carregando, setCarregando] = useState(true);
  const [logsCategorias, setLogsCategorias] = useState<LogCategoriaItem[]>([]);
  const [modalCategoria, setModalCategoria] = useState<{
    visivel: boolean;
    categoria: string;
    ano: number;
    filmes: any[];
  }>({ visivel: false, categoria: '', ano: 0, filmes: [] });

  // ── Carregamento ────────────────────────────────────────────

  const carregar = useCallback(async () => {
    try {
      setCarregando(true);
      const user = await Parse.User.currentAsync();
      if (!user) return;

      const q = new Parse.Query('LogCategoria');
      q.equalTo('usuarioId', user);
      q.descending('createdAt');
      q.limit(100);
      const catLogs = await q.find();

      // Monta base sem fotos imediatamente (para renderizar o esqueleto rápido)
      const itensBase: LogCategoriaItem[] = catLogs.map((l: any) => ({
        objectId: l.id,
        categoria: l.get('categoria') || '',
        ano: l.get('ano') || 0,
        vencedorReal: l.get('vencedorReal') || null,
        deveriaTerGanhado: l.get('deveriaTerGanhado') || null,
        queriaQueGanhasse: l.get('queriaQueGanhasse') || null,
        review: l.get('review') || null,
        filmes: [],
        fotoVencedor: null,
        fotoDeveria: null,
        fotoQueria: null,
      }));
      setLogsCategorias(itensBase);

      // Enriquece com fotos em paralelo — cada nome busca seu próprio tmdbId
      const itensComFoto: LogCategoriaItem[] = await Promise.all(
        itensBase.map(async (item) => {
          const [fV, fD, fQ] = await Promise.all([
            fetchFotoParaEntrada(item.vencedorReal, item.categoria, item.ano),
            fetchFotoParaEntrada(item.deveriaTerGanhado, item.categoria, item.ano),
            fetchFotoParaEntrada(item.queriaQueGanhasse, item.categoria, item.ano),
          ]);
          return { ...item, fotoVencedor: fV, fotoDeveria: fD, fotoQueria: fQ };
        })
      );
      setLogsCategorias(itensComFoto);
    } catch (e) {
      console.error('[PerfilCategorias] erro ao carregar:', e);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // ── Abrir modal de edição ────────────────────────────────────

  async function abrirModalCategoria(log: LogCategoriaItem) {
    let filmes: any[] = [];
    try {
      // Busca TUDO da classe FilmeOscar sem filtros — filtra 100% no cliente
      // Isso garante que problemas de tipo (ano number vs string, array vs equalTo)
      // não impeçam os dados de chegar.
      const q = new Parse.Query('Filme');
      q.limit(1000);
      const todos = await q.find();

      if (todos.length > 0) {
        const primeiro = todos[0];
      }

      const results = todos.filter((f: any) => {
        const anoDoc = f.get('ano');
        const anoOk = anoDoc === log.ano || String(anoDoc) === String(log.ano);
        const cats: any[] = f.get('categorias') || [];
        const catOk = cats.includes(log.categoria);
        return anoOk && catOk;
      });

      filmes = results.map((f: any) => ({
        titulo: f.get('titulo'),
        tmdbId: f.get('tmdbId'),
        poster: null,
        atoresIndicados: f.get('atoresIndicados') || {},  
        diretor: f.get('diretor') || null,
        roteiristas: f.get('roteiristas') || [],
        cancao: f.get('cancao') || {},
        vencedores: f.get('vencedores') || [],
      }));
    } catch (e) {
      console.error('[PerfilCategorias] erro ao buscar filmes:', e);
    }
    setModalCategoria({ visivel: true, categoria: log.categoria, ano: log.ano, filmes });
  }

  // ── Fechar modal ─────────────────────────────────────────────

  function fecharModal(resultado?: string) {
    setModalCategoria((prev) => ({ ...prev, visivel: false }));
    if (resultado === '__salvo__' || resultado === '__deletado__') {
      carregar();
      onRecarregar?.();
    }
  }

  // ── Agrupamento por ano ──────────────────────────────────────

  const logsPorAno = logsCategorias.reduce<Record<number, LogCategoriaItem[]>>(
    (acc, log) => {
      if (!acc[log.ano]) acc[log.ano] = [];
      acc[log.ano].push(log);
      return acc;
    },
    {}
  );
  const anosOrdenados = Object.keys(logsPorAno).map(Number).sort((a, b) => b - a);

  // ── Render ───────────────────────────────────────────────────

  if (carregando) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator color={GOLD} size="large" />
      </View>
    );
  }

  if (logsCategorias.length === 0) {
    return (
      <View style={s.conteudo}>
        <Text style={s.vazio}>Nenhum log de categoria ainda.</Text>
      </View>
    );
  }

  return (
    <>
      <View style={s.conteudo}>
        {anosOrdenados.map((ano) => (
          <View key={ano} style={s.secao}>
            <Text style={s.secaoTitulo}>{ano}</Text>
            {logsPorAno[ano].map((log) => (
              <LogCategoriaCardEditavel
                key={log.objectId}
                log={log}
                onEditar={() => abrirModalCategoria(log)}
              />
            ))}
          </View>
        ))}
      </View>

      <LogCategoriaModal
        visivel={modalCategoria.visivel}
        categoria={modalCategoria.categoria}
        ano={modalCategoria.ano}
        filmes={modalCategoria.filmes}
        onClose={fecharModal}
      />
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const s = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  conteudo: { padding: 20, gap: 32 },
  secao: { gap: 12 },
  secaoTitulo: {
    fontFamily: 'CormorantGaramond-MediumItalic',
    fontSize: 30,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: 0.3,
  },
  vazio: {
    color: 'rgba(255,255,255,0.3)',
    fontStyle: 'italic',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },

  // Card
  logCatCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    padding: 14,
    gap: 12,
  },
  logCatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logCatHeaderDir: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logCatCategoria: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'serif',
    fontStyle: 'italic',
    fontWeight: '400',
    flex: 1,
    marginRight: 8,
  },
  logCatAno: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontFamily: 'serif' },
  btnEditarCat: {
    backgroundColor: 'rgba(201,168,76,0.1)',
    borderRadius: 4,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.2)',
  },
  lapisImgCat: { width: 12, height: 12, resizeMode: 'contain' },

  // FotoRow
  fotoRow: { flexDirection: 'row', gap: 8 },
  fotoSlotWrap: { flex: 1, gap: 5, alignItems: 'flex-start' },
  fotoSlot: {
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
  },
  fotoSlotPessoa: { aspectRatio: 2 / 3 },
  fotoSlotFilme: { aspectRatio: 2 / 3 },
  fotoSlotDestaque: { borderColor: 'rgba(201,168,76,0.5)' },
  fotoSlotImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  fotoSlotPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1712',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fotoSlotPlaceholderTxt: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 20,
    fontFamily: 'serif',
  },
  fotoSlotLabel: {
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '500',
  },
  fotoSlotNome: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    lineHeight: 15,
  },
  fotoSlotNomeDestaque: { color: GOLD },

  // Review
  logCatReviewWrap: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  logCatReviewBarra: {
    width: 2,
    backgroundColor: BORDER,
    borderRadius: 1,
    alignSelf: 'stretch',
  },
  logCatReview: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
    flex: 1,
  },
});