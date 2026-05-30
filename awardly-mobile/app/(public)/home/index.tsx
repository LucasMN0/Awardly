import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const features = [
  {
    tag: 'LOG & REVIEW',
    desc: 'Dê notas de 0 a 5, marque favoritos e organize o que você já assistiu.',
  },
  {
    tag: 'VEREDITO FINAL',
    desc: 'Comente em cada categoria quem ganhou e quem você gostaria que tivesse vencido.',
  },
  {
    tag: 'PERFIL SOCIAL',
    desc: 'Personalize seu banner, bio e destaque seus 4 filmes favoritos.',
  },
];

const categorias = [
  { nome: 'FILMES', desc: 'Acervo Completo', rota: '/filmes' },
  { nome: 'CATEGORIAS', desc: 'Indicados & Vencedores', rota: '/categorias' },
  { nome: 'COMUNIDADE', desc: 'Rede de Cinéfilos', rota: '/cadastro' },
];

export default function Home() {
  const router = useRouter();

  const fadeHeader = useRef(new Animated.Value(0)).current;
  const fadeHero = useRef(new Animated.Value(0)).current;
  const slideHero = useRef(new Animated.Value(30)).current;
  const fadeFeatures = useRef(new Animated.Value(0)).current;
  const fadeCategorias = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeHeader, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(fadeHero, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideHero, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      Animated.timing(fadeFeatures, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(fadeCategorias, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />

      <LinearGradient
        colors={['#0d0b08', '#050505', '#080608']}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}
        <Animated.View style={[styles.header, { opacity: fadeHeader }]}>
          <View>
            <Text style={styles.logo}>Awardly</Text>
            <Text style={styles.logoSub}>OSCARS</Text>
          </View>

          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => router.push('/(public)/login')}
              activeOpacity={0.8}
            >
              <Text style={styles.btnPrimaryText}>ENTRAR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnOutline}
              onPress={() => router.push('/(public)/cadastro')}
              activeOpacity={0.8}
            >
              <Text style={styles.btnOutlineText}>CADASTRAR</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={styles.divider} />

        {/* HERO */}
        <Animated.View
          style={[styles.hero, { opacity: fadeHero, transform: [{ translateY: slideHero }] }]}
        >
          <Text style={styles.heroTitle}>
            Sua jornada pela{' '}
            <Text style={styles.heroHighlight}>temporada de prêmios</Text>
            {' '}começa aqui.
          </Text>
          <Text style={styles.heroDesc}>
            Explore indicados, registre suas sessões com notas e reviews, e monte sua Watchlist.
            No Awardly, você decide quem realmente merecia a estatueta.
          </Text>

          <TouchableOpacity
            style={styles.btnCta}
            onPress={() => router.push('/(public)/cadastro')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#c9a84c', '#a07830']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnCtaGradient}
            >
              <Text style={styles.btnCtaText}>COMEÇAR AGORA</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* FEATURES */}
        <Animated.View style={[styles.section, { opacity: fadeFeatures }]}>
          <Text style={styles.sectionLabel}>RECURSOS</Text>
          {features.map((f, i) => (
            <View key={i} style={styles.featureCard}>
              <View style={styles.featureBorder} />
              <View style={styles.featureContent}>
                <Text style={styles.featureTag}>{f.tag}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* CATEGORIAS */}
        <Animated.View style={[styles.section, { opacity: fadeCategorias }]}>
          <Text style={styles.sectionLabel}>EXPLORAR</Text>
          {categorias.map((cat, i) => (
            <TouchableOpacity
              key={i}
              style={styles.catCard}
              onPress={() => router.push(cat.rota as any)}
              activeOpacity={0.75}
            >
              <View style={styles.catCardInner}>
                <View>
                  <Text style={styles.catTag}>{cat.nome}</Text>
                  <Text style={styles.catDesc}>{cat.desc}</Text>
                </View>
                <Text style={styles.catArrow}>→</Text>
              </View>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerLogo}>Awardly</Text>
          <Text style={styles.footerText}>
            Feito para cinéfilos que levam o Oscar a sério.
          </Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => router.push('/(public)/login')}>
              <Text style={styles.footerLink}>Entrar</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>·</Text>
            <TouchableOpacity onPress={() => router.push('/(public)/cadastro')}>
              <Text style={styles.footerLink}>Cadastrar</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.footerCopy}>© 2025 Awardly</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // HEADER
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 24,
  },
  logo: {
    fontSize: 28,
    fontWeight: '900',
    color: '#e8e4da',
    fontFamily: 'CormorantGaramond-Regular',
    letterSpacing: 0.5,
  },
  logoSub: {
    color: '#c9a84c',
    fontSize: 10,
    letterSpacing: 4,
    fontFamily: 'Poppins-Bold',
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  btnPrimary: {
    backgroundColor: '#c9a84c',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  btnPrimaryText: {
    color: '#000',
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 1,
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: '#c9a84c',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  btnOutlineText: {
    color: '#c9a84c',
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 1,
  },

  // DIVISOR
  divider: {
    height: 1,
    backgroundColor: 'rgba(201, 168, 76, 0.15)',
    marginHorizontal: 24,
    marginBottom: 40,
  },

  // HERO
  hero: {
    paddingHorizontal: 24,
    marginBottom: 56,
  },
  heroTitle: {
    fontSize: 32,
    fontFamily: 'CormorantGaramond-Regular',
    color: '#ffffff',
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  heroHighlight: {
    color: '#c9a84c',
    fontFamily: 'CormorantGaramond-Regular',
  },
  heroDesc: {
    color: '#7a7568',
    fontSize: 14,
    lineHeight: 24,
    fontFamily: 'Poppins-Regular',
    marginBottom: 32,
  },
  btnCta: {
    borderRadius: 4,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  btnCtaGradient: {
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  btnCtaText: {
    color: '#000',
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 2,
  },

  // SEÇÕES
  section: {
    paddingHorizontal: 24,
    marginBottom: 48,
  },
  sectionLabel: {
    color: '#c9a84c',
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 4,
    marginBottom: 20,
  },

  // FEATURES
  featureCard: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  featureBorder: {
    width: 1,
    backgroundColor: '#c9a84c',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
    paddingVertical: 4,
    paddingBottom: 16,
  },
  featureTag: {
    color: '#e8e4da',
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 1,
    marginBottom: 6,
  },
  featureDesc: {
    color: '#7a7568',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Poppins-Regular',
  },

  // CATEGORIAS
  catCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  catCardInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
  },
  catTag: {
    color: '#c9a84c',
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 3,
    marginBottom: 6,
  },
  catDesc: {
    color: '#e8e4da',
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
  },
  catArrow: {
    color: '#c9a84c',
    fontSize: 20,
  },

  // FOOTER
  footer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  footerLogo: {
    fontSize: 22,
    fontFamily: 'CormorantGaramond-Regular',
    color: '#e8e4da',
    marginBottom: 8,
  },
  footerText: {
    color: '#7a7568',
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  footerLink: {
    color: '#c9a84c',
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.5,
  },
  footerDot: {
    color: '#3a3630',
    fontSize: 14,
  },
  footerCopy: {
    color: '#3a3630',
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
  },
});
