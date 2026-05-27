import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Keyboard,
  ScrollView,
  Platform,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Parse from "@/lib/parseClient";
import { getFilme, getImageURL } from "@/lib/tmdb";
import { Ionicons } from '@expo/vector-icons';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type FilmeItem = {
  objectId: string;
  tmdbId: number;
  titulo: string;
  ano: string;
  categorias: string[];
};

type AtorItem = {
  id: number;
  nome: string;
  foto: string | null;
  filmeConhecido: string | null;
};

type UsuarioItem = {
  objectId: string;
  username: string;
  nome: string;
  bio?: string;
  foto?: string;
};

type DetalhesMap = Record<number, any>;

type TabKey = "filmes" | "atores" | "pessoas";

type CountsMap = Record<TabKey, number>;

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const TMDB_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const TMDB_IMG = process.env.EXPO_PUBLIC_TMDB_IMAGE_BASE;
const HISTORY_KEY = "awardly_search_history";
const MAX_HISTORY = 8;
const TABS: TabKey[] = ["filmes", "atores", "pessoas"];
const { width: SCREEN_W } = Dimensions.get("window");

// ─── COLORS — alinhados com profile.tsx ──────────────────────────────────────

const BG      = "#0a0906";
const CARD_BG = "#111008";
const GOLD    = "#C9A84C";
const BORDER  = "rgba(201,168,76,0.15)";
const BORDER_LIGHT = "rgba(201,168,76,0.25)";

// ─── ASYNC STORAGE HELPERS ────────────────────────────────────────────────────

async function getHistory(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveToHistory(termo: string): Promise<void> {
  if (!termo.trim()) return;
  const prev = await getHistory();
  const updated = [termo, ...prev.filter((t: string) => t !== termo)].slice(0, MAX_HISTORY);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

async function removeFromHistory(termo: string): Promise<void> {
  const prev = await getHistory();
  await AsyncStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(prev.filter((t: string) => t !== termo))
  );
}

async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}

// ─── FETCH FUNCTIONS ──────────────────────────────────────────────────────────

async function buscarFilmesPorTitulo(termo: string): Promise<FilmeItem[]> {
  if (!termo.trim()) return [];
  const Filme = Parse.Object.extend("Filme");
  const query = new Parse.Query(Filme);
  query.matches("titulo", termo, "i");
  query.limit(20);
  const res = await query.find();
  return res.map((f: any) => ({
    objectId: f.id,
    tmdbId: f.get("tmdbId"),
    titulo: f.get("titulo"),
    ano: f.get("ano"),
    categorias: f.get("categorias") || [],
  }));
}

async function buscarFilmesPorTituloOriginal(termo: string): Promise<FilmeItem[]> {
  if (!termo.trim()) return [];
  try {
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(termo)}&language=pt-BR`;
    const res = await fetch(url);
    const data = await res.json();
    const tmdbIds = (data.results || []).slice(0, 20).map((m: any) => m.id);
    if (!tmdbIds.length) return [];
    const Filme = Parse.Object.extend("Filme");
    const query = new Parse.Query(Filme);
    query.containedIn("tmdbId", tmdbIds);
    query.limit(20);
    const resultados = await query.find();
    return resultados.map((f: any) => ({
      objectId: f.id,
      tmdbId: f.get("tmdbId"),
      titulo: f.get("titulo"),
      ano: f.get("ano"),
      categorias: f.get("categorias") || [],
    }));
  } catch {
    return [];
  }
}

async function buscarFilmes(termo: string): Promise<FilmeItem[]> {
  const [r1, r2] = await Promise.allSettled([
    buscarFilmesPorTitulo(termo),
    buscarFilmesPorTituloOriginal(termo),
  ]);
  const l1 = r1.status === "fulfilled" ? r1.value : [];
  const l2 = r2.status === "fulfilled" ? r2.value : [];
  const seen = new Set<string>();
  const merged: FilmeItem[] = [];
  for (const f of [...l1, ...l2]) {
    if (!seen.has(f.objectId)) {
      seen.add(f.objectId);
      merged.push(f);
    }
  }
  return merged;
}

async function buscarAtores(termo: string): Promise<AtorItem[]> {
  if (!termo.trim()) return [];
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/person?api_key=${TMDB_KEY}&query=${encodeURIComponent(termo)}&language=pt-BR&page=1`
    );
    const data = await res.json();
    return (data.results || [])
      .filter((p: any) => p.known_for_department === "Acting")
      .slice(0, 10)
      .map((p: any) => ({
        id: p.id,
        nome: p.name,
        foto: p.profile_path ? `${TMDB_IMG}/w185${p.profile_path}` : null,
        filmeConhecido: p.known_for?.[0]?.title || p.known_for?.[0]?.name || null,
      }));
  } catch {
    return [];
  }
}

async function buscarUsuarios(termo: string): Promise<UsuarioItem[]> {
  if (!termo.trim()) return [];
  try {
    return await Parse.Cloud.run("buscarUsuariosPorTermo", { termo });
  } catch {
    return [];
  }
}

// ─── CARD FILME ───────────────────────────────────────────────────────────────

function CardFilme({ filme, detalhe }: { filme: FilmeItem; detalhe: any }) {
  const router = useRouter();
  const posterUrl = detalhe?.poster_path ? getImageURL(detalhe.poster_path, "w185") : null;
  const ano = detalhe?.release_date?.slice(0, 4) || filme.ano;
  const tituloOriginal =
    detalhe?.original_title && detalhe.original_title !== filme.titulo
      ? detalhe.original_title
      : null;

  return (
    <TouchableOpacity
      style={styles.filmCard}
      onPress={() => router.push(`/filmes/${filme.tmdbId}`)}
      activeOpacity={0.7}
    >
      <View style={styles.filmPoster}>
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.filmPosterImg} />
        ) : (
          <Text style={styles.filmPosterPlaceholder}>🎬</Text>
        )}
      </View>
      <View style={styles.filmInfo}>
        <Text style={styles.filmTitle} numberOfLines={2}>
          {filme.titulo}
        </Text>
        <Text style={styles.filmYear}>
          {ano}
          {tituloOriginal ? `  ·  ${tituloOriginal}` : ""}
        </Text>
        {filme.categorias?.length > 0 && (
          <View style={styles.filmTags}>
            {filme.categorias.slice(0, 2).map((c: string, i: number) => (
              <View key={i} style={styles.filmTag}>
                <Text style={styles.filmTagText}>{c}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <Text style={styles.filmArrow}>›</Text>
    </TouchableOpacity>
  );
}

// ─── CARD ATOR ────────────────────────────────────────────────────────────────

function CardAtor({ ator }: { ator: AtorItem }) {
  const router = useRouter();
  const cardW = (SCREEN_W - 16 * 2 - 12) / 2;

  return (
    <TouchableOpacity
      style={[styles.actorCard, { width: cardW }]}
      onPress={() => router.push(`//${ator.id}`)}
      activeOpacity={0.75}
    >
      <View style={[styles.actorPoster, { height: cardW * 1.3 }]}>
        {ator.foto ? (
          <Image source={{ uri: ator.foto }} style={styles.actorPosterImg} />
        ) : (
          <Text style={styles.actorPosterPlaceholder}>👤</Text>
        )}
      </View>
      <View style={styles.actorBody}>
        <Text style={styles.actorName} numberOfLines={1}>
          {ator.nome}
        </Text>
        {ator.filmeConhecido ? (
          <Text style={styles.actorFilm} numberOfLines={1}>
            {ator.filmeConhecido}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ─── CARD USUARIO ─────────────────────────────────────────────────────────────

function CardUsuario({
  usuario,
  usuarioLogado,
}: {
  usuario: UsuarioItem;
  usuarioLogado: any;
}) {
  const router = useRouter();
  const [seguindo, setSeguindo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const ehEuMesmo = usuarioLogado?.id === usuario.objectId;
  const initials = (usuario.nome || usuario.username || "?")[0].toUpperCase();

  useEffect(() => {
    if (!usuarioLogado || ehEuMesmo) return;
    const u = new Parse.User();
    u.id = usuario.objectId;
    const q = new Parse.Query("Follow");
    q.equalTo("seguidor", usuarioLogado);
    q.equalTo("seguindo", u);
    q.first()
      .then((r: any) => setSeguindo(!!r))
      .catch(() => {});
  }, [usuario.objectId, usuarioLogado]);

  async function toggleFollow(): Promise<void> {
    if (!usuarioLogado || salvando) return;
    setSalvando(true);
    const alvo = new Parse.User();
    alvo.id = usuario.objectId;
    try {
      if (seguindo) {
        const q = new Parse.Query("Follow");
        q.equalTo("seguidor", usuarioLogado);
        q.equalTo("seguindo", alvo);
        const ex = await q.first();
        if (ex) await ex.destroy();
        setSeguindo(false);
      } else {
        const Follow = Parse.Object.extend("Follow");
        const nf = new Follow();
        nf.set("seguidor", usuarioLogado);
        nf.set("seguindo", alvo);
        const acl = new Parse.ACL();
        acl.setPublicReadAccess(true);
        acl.setWriteAccess(usuarioLogado.id, true);
        nf.setACL(acl);
        await nf.save();
        setSeguindo(true);
      }
    } catch {}
    finally {
      setSalvando(false);
    }
  }

  return (
    <View style={styles.userCard}>
      <TouchableOpacity
        style={styles.userCardLeft}
        onPress={() =>
          ehEuMesmo
            ? router.push("/profile")
            : router.push(`/perfil/${usuario.username}`)
        }
        activeOpacity={0.7}
      >
        <View style={styles.userAvatar}>
          {usuario.foto ? (
            <Image source={{ uri: usuario.foto }} style={styles.userAvatarImg} />
          ) : (
            <Text style={styles.userAvatarInitials}>{initials}</Text>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {usuario.nome || usuario.username}
          </Text>
          {usuario.username && usuario.nome ? (
            <Text style={styles.userHandle}>@{usuario.username}</Text>
          ) : null}
          {usuario.bio ? (
            <Text style={styles.userBio} numberOfLines={1}>
              {usuario.bio}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
      {usuarioLogado && !ehEuMesmo && (
        <TouchableOpacity
          style={seguindo ? styles.btnSeguindo : styles.btnSeguir}
          onPress={toggleFollow}
          disabled={salvando}
          activeOpacity={0.8}
        >
          <Text style={seguindo ? styles.btnSeguindoText : styles.btnSeguirText}>
            {salvando ? "..." : seguindo ? "seguindo" : "seguir"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── HISTORICO ────────────────────────────────────────────────────────────────

function Historico({
  onSelect,
  refreshKey,
}: {
  onSelect: (t: string) => void;
  refreshKey: number;
}) {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    getHistory().then(setHistory);
  }, [refreshKey]);

  async function handleRemove(termo: string): Promise<void> {
    await removeFromHistory(termo);
    setHistory(await getHistory());
  }

  async function handleClear(): Promise<void> {
    await clearHistory();
    setHistory([]);
  }

  if (!history.length) {
    return (
      <View style={styles.emptyWrap}>
        <EmptyState icon="search-outline" label="Busque filmes, atores e pessoas" />
      </View>
    );
  }

  return (
    <View style={{ paddingTop: 24 }}>
      <View style={styles.histHeader}>
        <Text style={styles.histTitle}>BUSCAS RECENTES</Text>
        <TouchableOpacity onPress={handleClear}>
          <Text style={styles.histClear}>limpar tudo</Text>
        </TouchableOpacity>
      </View>
      {history.map((termo: string) => (
        <TouchableOpacity
          key={termo}
          style={styles.histItem}
          onPress={() => onSelect(termo)}
          activeOpacity={0.6}
        >
          <View style={styles.histItemLeft}>
            <Text style={styles.histIcon}>↩</Text>
            <Text style={styles.histText}>{termo}</Text>
          </View>
          <TouchableOpacity
            onPress={() => handleRemove(termo)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.histDel}>×</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────

function EmptyState({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.emptyWrap}>
      <Ionicons name={icon} size={48} color={GOLD} style={{ opacity: 0.2 }} />
      <Text style={styles.emptyText}>{label}</Text>
    </View>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────

export default function PesquisaScreen() {
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState<string>("");
  const [termo, setTermo] = useState<string>("");
  const [abaAtiva, setAbaAtiva] = useState<TabKey>("filmes");
  const [histRefresh, setHistRefresh] = useState<number>(0);
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null);

  const [filmes, setFilmes] = useState<FilmeItem[]>([]);
  const [atores, setAtores] = useState<AtorItem[]>([]);
  const [pessoas, setPessoas] = useState<UsuarioItem[]>([]);
  const [detalhes, setDetalhes] = useState<DetalhesMap>({});
  const [buscando, setBuscando] = useState<boolean>(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const user = Parse.User.current();
    if (user) user.fetch().then(setUsuarioLogado).catch(() => {});
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!input.trim()) {
      setTermo("");
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const t = input.trim();
      setTermo(t);
      await saveToHistory(t);
      setHistRefresh((n: number) => n + 1);
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input]);

  useEffect(() => {
    if (!termo) {
      setFilmes([]);
      setAtores([]);
      setPessoas([]);
      setDetalhes({});
      return;
    }
    setBuscando(true);
    Promise.allSettled([
      buscarFilmes(termo),
      buscarAtores(termo),
      buscarUsuarios(termo),
    ])
      .then(async ([rf, ra, ru]) => {
        const fl: FilmeItem[] = rf.status === "fulfilled" ? rf.value : [];
        const al: AtorItem[] = ra.status === "fulfilled" ? ra.value : [];
        const ul: UsuarioItem[] = ru.status === "fulfilled" ? ru.value : [];
        setFilmes(fl);
        setAtores(al);
        setPessoas(ul);
        const map: DetalhesMap = {};
        await Promise.allSettled(
          fl.map(async (f: FilmeItem) => {
            try {
              map[f.tmdbId] = await getFilme(f.tmdbId);
            } catch {}
          })
        );
        setDetalhes(map);
      })
      .finally(() => setBuscando(false));
  }, [termo]);

  function handleSelectHistory(t: string): void {
    setInput(t);
  }

  function handleClear(): void {
    setInput("");
    setTermo("");
  }

  const pesquisando = !!termo;
  const counts: CountsMap = {
    filmes: filmes.length,
    atores: atores.length,
    pessoas: pessoas.length,
  };

  function renderTabContent() {
    if (buscando) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={GOLD} size="large" />
        </View>
      );
    }

    if (abaAtiva === "filmes") {
      if (!filmes.length) return <EmptyState icon="film-outline" label="Nenhum filme encontrado" />;
      return filmes.map((f: FilmeItem) => (
        <CardFilme key={f.objectId} filme={f} detalhe={detalhes[f.tmdbId]} />
      ));
    }

    if (abaAtiva === "atores") {
      if (!atores.length) return <EmptyState icon="people-outline" label="Nenhum ator encontrado" />;
      return (
        <View style={styles.actorGrid}>
          {atores.map((a: AtorItem) => (
            <CardAtor key={a.id} ator={a} />
          ))}
        </View>
      );
    }

    if (abaAtiva === "pessoas") {
      if (!pessoas.length)
        return <EmptyState icon="person-outline" label="Nenhuma pessoa encontrada" />;
      return pessoas.map((u: UsuarioItem) => (
        <CardUsuario key={u.objectId} usuario={u} usuarioLogado={usuarioLogado} />
      ));
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* ── Search bar ── */}
      <View style={[styles.searchWrap, { paddingTop: insets.top + 30 }]}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}><Ionicons name="search-outline" size={20} color={GOLD} /></Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Filmes, atores, pessoas..."
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={input}
            onChangeText={setInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
          />
          {input.length > 0 && (
            <TouchableOpacity
              onPress={handleClear}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.clearBtn}>×</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Tabs ── */}
        {pesquisando && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabsScroll}
            contentContainerStyle={styles.tabsContent}
          >
            {TABS.map((tab: TabKey) => {
              const active = abaAtiva === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, active && styles.tabActive]}
                  onPress={() => setAbaAtiva(tab)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {tab}
                    {!buscando && counts[tab] > 0 ? ` (${counts[tab]})` : ""}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* ── Content ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!pesquisando ? (
          <Historico onSelect={handleSelectHistory} refreshKey={histRefresh} />
        ) : (
          <>
            {!buscando && (
              <Text style={styles.resultsLabel}>
                {counts[abaAtiva]}{" "}
                {abaAtiva === "filmes"
                  ? "filme"
                  : abaAtiva === "atores"
                  ? "ator"
                  : "pessoa"}
                {counts[abaAtiva] !== 1
                  ? abaAtiva === "atores"
                    ? "es"
                    : "s"
                  : ""}{" "}
                para "{termo}"
              </Text>
            )}
            {renderTabContent()}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // ── Search bar ──
  searchWrap: {
    backgroundColor: BG,
    paddingHorizontal: 16,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_LIGHT,
    paddingHorizontal: 14,
    height: 46,
    gap: 10,
  },
  searchIcon: { fontSize: 15, color: "rgba(255,255,255,0.25)" },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    paddingVertical: 0,
    fontFamily: "Poppins-Regular",
  },
  clearBtn: { fontSize: 22, color: "rgba(255,255,255,0.3)", lineHeight: 24 },

  // ── Tabs ──
  tabsScroll: { borderBottomWidth: 0 },
  tabsContent: { paddingHorizontal: 0, gap: 4, marginTop: 10 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: GOLD },
  tabText: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.35)",
    textTransform: "lowercase",
    letterSpacing: 0.5,
    fontFamily: "Poppins-Regular",
  },
  tabTextActive: { color: GOLD },

  // ── Scroll ──
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },

  resultsLabel: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 11,
    marginTop: 18,
    marginBottom: 4,
    letterSpacing: 0.3,
    fontFamily: "Poppins-Regular",
  },

  loadingWrap: { paddingTop: 60, alignItems: "center" },

  // ── Empty state ──
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyIcon: { fontSize: 36, opacity: 0.25 },
  emptyText: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 13,
    fontStyle: "italic",
    fontFamily: "Poppins-Regular",
  },

  // ── Histórico ──
  histHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  histTitle: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "rgba(255,255,255,0.3)",
    textTransform: "uppercase",
  },
  histClear: { color: GOLD, fontSize: 12, fontFamily: "Poppins-Regular" },
  histItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  histItemLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  histIcon: { fontSize: 13, color: "rgba(255,255,255,0.2)" },
  histText: { fontSize: 14, color: "rgba(255,255,255,0.65)", fontFamily: "Poppins-Regular" },
  histDel: { fontSize: 20, color: "rgba(255,255,255,0.2)", paddingHorizontal: 4 },

  // ── Card Filme ──
  filmCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 14,
  },
  filmPoster: {
    width: 52,
    height: 78,
    borderRadius: 6,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_LIGHT,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  filmPosterImg: { width: "100%", height: "100%" },
  filmPosterPlaceholder: { fontSize: 22, opacity: 0.3 },
  filmInfo: { flex: 1 },
  filmTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    lineHeight: 20,
    fontFamily: "serif",
  },
  filmYear: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    marginTop: 3,
    fontFamily: "Poppins-Regular",
  },
  filmTags: { flexDirection: "row", gap: 5, marginTop: 6, flexWrap: "wrap" },
  filmTag: {
    backgroundColor: "rgba(201,168,76,0.1)",
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: BORDER,
  },
  filmTagText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: GOLD,
    textTransform: "uppercase",
  },
  filmArrow: { fontSize: 20, color: "rgba(255,255,255,0.15)" },

  // ── Card Ator ──
  actorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingTop: 4 },
  actorCard: {
    backgroundColor: CARD_BG,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
  },
  actorPoster: {
    width: "100%",
    backgroundColor: "#1a1712",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  actorPosterImg: { width: "100%", height: "100%", resizeMode: "cover" },
  actorPosterPlaceholder: { fontSize: 32, opacity: 0.2 },
  actorBody: { padding: 10 },
  actorName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
    fontFamily: "serif",
    fontStyle: "italic",
  },
  actorFilm: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    marginTop: 2,
    fontFamily: "Poppins-Regular",
  },

  // ── Card Usuário ──
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  userCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 14,
    minWidth: 0,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: CARD_BG,
    borderWidth: 1.5,
    borderColor: BORDER_LIGHT,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  userAvatarImg: { width: "100%", height: "100%" },
  userAvatarInitials: { fontSize: 18, fontWeight: "700", color: GOLD, fontFamily: "serif" },
  userInfo: { flex: 1, minWidth: 0 },
  userName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    fontFamily: "serif",
    fontStyle: "italic",
  },
  userHandle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    marginTop: 2,
    fontFamily: "Poppins-Regular",
  },
  userBio: {
    fontSize: 12,
    color: "rgba(255,255,255,0.25)",
    marginTop: 3,
    fontFamily: "Poppins-Regular",
    fontStyle: "italic",
  },

  // ── Botões seguir/seguindo ──
  btnSeguir: {
    backgroundColor: GOLD,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    marginLeft: 12,
  },
  btnSeguirText: {
    fontSize: 12,
    fontWeight: "700",
    color: BG,
    fontFamily: "Poppins-Regular",
  },
  btnSeguindo: {
    backgroundColor: "transparent",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: GOLD,
    paddingHorizontal: 16,
    paddingVertical: 7,
    marginLeft: 12,
  },
  btnSeguindoText: {
    fontSize: 12,
    fontWeight: "700",
    color: GOLD,
    fontFamily: "Poppins-Regular",
  },
});