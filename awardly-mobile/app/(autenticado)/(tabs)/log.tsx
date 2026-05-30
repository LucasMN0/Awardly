import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Parse from '../../../lib/parseClient';
import { getFilme, getImageURL } from '../../../lib/tmdb';
import { colors, fonts, spacing, radius } from '../../../constants/theme';

type Aba = 'meus' | 'amigos';

interface LogFilme {
  objectId: string;
  filmeId: number;
  titulo: string;
  poster: string | null;
  dataAssistido: string;
  estatuetas: number;
  like: boolean;
  review: string | null;
  usuarioNome?: string;
  usuarioFoto?: string | null;
  usuarioUsername?: string;
}

// ─── Componente de estatuetas ────────────────────────────────

function Estatuetas({ valor }: { valor: number }) {
  return (
    <View style={s.estatuetasRow}>
      {[1, 2, 3, 4, 5].map((i) => {
        const cheia = valor >= i;
        const meia = !cheia && valor >= i - 0.5;
        return (
          <View key={i} style={s.estatuetaSlot}>
            {cheia || meia ? (
              <Image
                source={require('../../../assets/images/oscar2.png')}
                style={[s.estatuetaImg, meia && { opacity: 0.5 }]}
                resizeMode="contain"
              />
            ) : (
              <Image
                source={require('../../../assets/images/oscarvazio.png')}
                style={s.estatuetaImg}
                resizeMode="contain"
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─── Card de log ─────────────────────────────────────────────

function LogCard({
  log,
  mostrarUsuario = false,
  onPress,
}: {
  log: LogFilme;
  mostrarUsuario?: boolean;
  onPress: () => void;
}) {
  const dataFormatada = log.dataAssistido
    ? new Date(log.dataAssistido).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '';

  return (
    <TouchableOpacity style={s.logCard} onPress={onPress} activeOpacity={0.8}>
      {/* Poster */}
      <View style={s.posterWrap}>
        {log.poster ? (
          <Image source={{ uri: log.poster }} style={s.poster} resizeMode="cover" />
        ) : (
          <View style={s.posterPlaceholder}>
            <Ionicons name="film-outline" size={24} color={colors.muted} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={s.logInfo}>
        {mostrarUsuario && log.usuarioNome && (
          <View style={s.usuarioRow}>
            {log.usuarioFoto ? (
              <Image source={{ uri: log.usuarioFoto }} style={s.avatarMini} />
            ) : (
              <View style={s.avatarMiniPlaceholder}>
                <Text style={s.avatarMiniLetra}>
                  {(log.usuarioNome || '?')[0].toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={s.usuarioNome}>{log.usuarioUsername || log.usuarioNome}</Text>
          </View>
        )}

        <Text style={s.logTitulo} numberOfLines={2}>{log.titulo}</Text>

        <View style={s.logMeta}>
          {log.estatuetas > 0 && <Estatuetas valor={log.estatuetas} />}
          {log.like && (
            <Image
              source={require('../../../assets/images/envelopecoracao.png')}
              style={s.likeIcon}
              resizeMode="contain"
            />
          )}
        </View>

        {log.review ? (
          <Text style={s.logReview} numberOfLines={3}>{log.review}</Text>
        ) : null}

        <Text style={s.logData}>{dataFormatada}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Hook: buscar meus logs ───────────────────────────────────

function useMeusLogs() {
  const [logs, setLogs] = useState<LogFilme[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const user = Parse.User.current();
      if (!user) { setLogs([]); return; }

      const query = new Parse.Query('Log');
      query.equalTo('usuarioId', user);
      query.descending('dataAssistido');
      query.limit(100);
      const resultados = await query.find();

      const lista: LogFilme[] = await Promise.all(
        resultados.map(async (r: any) => {
          const filmeId = r.get('filmeId');
          let titulo = r.get('titulo') || '';
          let poster: string | null = null;
          try {
            const detalhes = await getFilme(filmeId);
            titulo = detalhes.title || titulo;
            poster = getImageURL(detalhes.poster_path, 'w185');
          } catch {}
          return {
            objectId: r.id,
            filmeId,
            titulo,
            poster,
            dataAssistido: r.get('dataAssistido')?.toISOString() || '',
            estatuetas: r.get('estatuetas') || 0,
            like: r.get('like') || false,
            review: r.get('review') || null,
          };
        })
      );
      setLogs(lista);
    } catch (e: any) {
      setErro(e.message || 'Erro ao carregar logs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);
  return { logs, loading, erro, recarregar: carregar };
}

// ─── Hook: buscar logs de amigos ─────────────────────────────

function useLogsAmigos() {
  const [logs, setLogs] = useState<LogFilme[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const user = Parse.User.current();
      if (!user) { setLogs([]); return; }

      // Busca quem eu sigo
      const qFollow = new Parse.Query('Follow');
      qFollow.equalTo('seguidor', user);
      qFollow.limit(200);
      const follows = await qFollow.find();
      const seguindoIds = follows.map((f: any) => {
        const u = f.get('seguindo');
        return u?.id || u?.objectId;
      }).filter(Boolean);

      if (seguindoIds.length === 0) { setLogs([]); return; }

      // Busca logs desses usuários
      const usuariosPtr = seguindoIds.map((id: string) => {
        const u = new Parse.User();
        u.id = id;
        return u;
      });

      const qLog = new Parse.Query('Log');
      qLog.containedIn('usuarioId', usuariosPtr);
      qLog.descending('dataAssistido');
      qLog.limit(100);
      const resultados = await qLog.find();

      // Busca dados dos usuários em batch
      const qUsers = new Parse.Query(Parse.User);
      qUsers.containedIn('objectId', seguindoIds);
      const usuarios = await qUsers.find();
      const mapaUsuarios: Record<string, any> = {};
      usuarios.forEach((u: any) => { mapaUsuarios[u.id] = u; });

      const lista: LogFilme[] = await Promise.all(
        resultados.map(async (r: any) => {
          const filmeId = r.get('filmeId');
          const usuarioPtr = r.get('usuarioId');
          const usuarioObj = mapaUsuarios[usuarioPtr?.id || usuarioPtr?.objectId];

          let titulo = r.get('titulo') || '';
          let poster: string | null = null;
          try {
            const detalhes = await getFilme(filmeId);
            titulo = detalhes.title || titulo;
            poster = getImageURL(detalhes.poster_path, 'w185');
          } catch {}

          return {
            objectId: r.id,
            filmeId,
            titulo,
            poster,
            dataAssistido: r.get('dataAssistido')?.toISOString() || '',
            estatuetas: r.get('estatuetas') || 0,
            like: r.get('like') || false,
            review: r.get('review') || null,
            usuarioNome: usuarioObj?.get('nome') || usuarioObj?.get('username') || '',
            usuarioUsername: usuarioObj?.get('username') || '',
            usuarioFoto: usuarioObj?.get('foto') || null,
          };
        })
      );
      setLogs(lista);
    } catch (e: any) {
      setErro(e.message || 'Erro ao carregar logs de amigos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);
  return { logs, loading, erro, recarregar: carregar };
}

// ─── Tela principal ───────────────────────────────────────────

export default function LogScreen() {
  const router = useRouter();
  const [aba, setAba] = useState<Aba>('meus');
  const meusLogs = useMeusLogs();
  const logsAmigos = useLogsAmigos();

  const atual = aba === 'meus' ? meusLogs : logsAmigos;

  function handleLogPress(log: LogFilme) {
    router.push(`/(autenticado)/filmes/${log.filmeId}` as any);
  }

  function handleAdicionarLog() {
    // Navega para busca para selecionar um filme e logar
    router.push('/(autenticado)/(tabs)/search' as any);
  }

  const ListVazia = () => {
    if (atual.loading) return null;
    return (
      <View style={s.vazio}>
        <Text style={s.vazioTitulo}>
          {aba === 'meus'
            ? 'Nenhum log ainda.'
            : 'Nenhum log de amigos.'}
        </Text>
        <Text style={s.vazioSub}>
          {aba === 'meus'
            ? 'Registre um filme que você assistiu.'
            : 'Siga pessoas para ver os logs delas aqui.'}
        </Text>
      </View>
    );
  };

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.titulo}>Diário</Text>

        {/* Toggle */}
        <View style={s.toggle}>
          <TouchableOpacity
            style={[s.toggleBtn, aba === 'meus' && s.toggleBtnAtivo]}
            onPress={() => setAba('meus')}
            activeOpacity={0.8}
          >
            <Text style={[s.toggleTxt, aba === 'meus' && s.toggleTxtAtivo]}>
              meus logs
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.toggleBtn, aba === 'amigos' && s.toggleBtnAtivo]}
            onPress={() => setAba('amigos')}
            activeOpacity={0.8}
          >
            <Text style={[s.toggleTxt, aba === 'amigos' && s.toggleTxtAtivo]}>
              amigos
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista */}
      {atual.loading ? (
        <View style={s.centrado}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      ) : atual.erro ? (
        <View style={s.centrado}>
          <Text style={s.erroTxt}>Erro ao carregar logs.</Text>
        </View>
      ) : (
        <FlatList
          data={atual.logs}
          keyExtractor={(item) => item.objectId}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={s.separador} />}
          ListEmptyComponent={<ListVazia />}
          refreshControl={
            <RefreshControl
              refreshing={atual.loading}
              onRefresh={atual.recarregar}
              tintColor={colors.gold}
            />
          }
          renderItem={({ item }) => (
            <LogCard
              log={item}
              mostrarUsuario={aba === 'amigos'}
              onPress={() => handleLogPress(item)}
            />
          )}
        />
      )}

      {/* FAB — adicionar log */}
      <TouchableOpacity style={s.fab} onPress={handleAdicionarLog} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={colors.black} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────

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
    borderBottomColor: colors.gold15,
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
    borderColor: colors.gold30,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  toggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 28,
    backgroundColor: 'transparent',
  },
  toggleBtnAtivo: {
    backgroundColor: colors.gold,
  },
  toggleTxt: {
    fontFamily: fonts.poppinsMedium,
    fontSize: 13,
    color: colors.white45,
    letterSpacing: 0.5,
  },
  toggleTxtAtivo: {
    color: colors.black,
  },

  // Lista
  listContent: {
    paddingTop: spacing.lg,
    paddingBottom: 100,
    paddingHorizontal: 24,
  },
  separador: {
    height: 1,
    backgroundColor: colors.gold15,
    marginVertical: spacing.md,
  },

  // Card
  logCard: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  posterWrap: {
    width: 72,
    height: 108,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logInfo: {
    flex: 1,
    gap: spacing.xs,
    paddingTop: 2,
  },
  logTitulo: {
    fontFamily: fonts.cormorantRegular,
    fontSize: 18,
    color: colors.text,
    lineHeight: 22,
  },
  logMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  estatuetasRow: {
    flexDirection: 'row',
    gap: 2,
  },
  estatuetaSlot: {
    width: 14,
    height: 18,
  },
  estatuetaImg: {
    width: 14,
    height: 18,
  },
  likeIcon: {
    width: 18,
    height: 18,
    marginLeft: 2,
  },
  logReview: {
    fontFamily: fonts.poppins,
    fontSize: 12,
    color: colors.white65,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  logData: {
    fontFamily: fonts.poppins,
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },

  // Usuário (feed de amigos)
  usuarioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  avatarMini: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  avatarMiniPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.gold30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMiniLetra: {
    fontFamily: fonts.poppinsBold,
    fontSize: 9,
    color: colors.gold,
  },
  usuarioNome: {
    fontFamily: fonts.poppinsMedium,
    fontSize: 12,
    color: colors.gold,
    letterSpacing: 0.3,
  },

  // Estados
  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  erroTxt: {
    fontFamily: fonts.poppins,
    fontSize: 14,
    color: colors.error,
  },
  vazio: {
    alignItems: 'center',
    paddingVertical: 64,
    gap: spacing.sm,
  },
  vazioTitulo: {
    fontFamily: fonts.cormorantItalic,
    fontSize: 22,
    color: colors.white35,
    letterSpacing: 0.3,
  },
  vazioSub: {
    fontFamily: fonts.poppins,
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});