// Equivalente ao globals.css — paleta e tipografia do Awardly
// No RN não existe CSS vars, então exportamos um objeto de tema

export const colors = {
  bg:         '#0f0e0b',
  surface:    '#1a1814',
  border:     '#2e2b25',
  gold:       '#c9a84c',
  goldLight:  '#e8c96a',
  goldDark:   '#7a5f0c',
  text:       '#e8e4da',
  muted:      '#7a7568',
  cardBg:     '#16150f',
  black:      '#0a0906',
  error:      '#DC143C',
  errorBg:    'rgba(224,123,123,0.08)',
  errorBorder:'rgba(224,123,123,0.2)',

  // Utilitários com alpha (usados frequentemente nos CSS)
  white10:  'rgba(255,255,255,0.10)',
  white20:  'rgba(255,255,255,0.20)',
  white35:  'rgba(255,255,255,0.35)',
  white45:  'rgba(255,255,255,0.45)',
  white65:  'rgba(255,255,255,0.65)',
  white75:  'rgba(255,255,255,0.75)',
  white85:  'rgba(255,255,255,0.85)',
  gold10:   'rgba(201,168,76,0.10)',
  gold15:   'rgba(255,200,0,0.15)',
  gold25:   'rgba(255,200,0,0.25)',
  gold30:   'rgba(201,168,76,0.30)',
  gold40:   'rgba(201,168,76,0.40)',
  gold06:   'rgba(255,208,0,0.06)',
  overlay90:'rgba(0,0,0,0.90)',
  overlay70:'rgba(0,0,0,0.70)',
  overlay50:'rgba(0,0,0,0.50)',
} as const;

// Fontes — carregar via expo-font no _layout.tsx
// useFonts({
//   'CormorantGaramond-Light':        require('../assets/fonts/CormorantGaramond-Light.ttf'),
//   'CormorantGaramond-LightItalic':  require('../assets/fonts/CormorantGaramond-LightItalic.ttf'),
//   'CormorantGaramond-Regular':      require('../assets/fonts/CormorantGaramond-Regular.ttf'),
//   'Poppins-Regular':                require('../assets/fonts/Poppins-Regular.ttf'),
//   'Poppins-Medium':                 require('../assets/fonts/Poppins-Medium.ttf'),
//   'Poppins-SemiBold':               require('../assets/fonts/Poppins-SemiBold.ttf'),
//   'Poppins-Bold':                   require('../assets/fonts/Poppins-Bold.ttf'),
//   'Jost-Light':                     require('../assets/fonts/Jost-Light.ttf'),
//   'Jost-Regular':                   require('../assets/fonts/Jost-Regular.ttf'),
//   'Jost-Medium':                    require('../assets/fonts/Jost-Medium.ttf'),
// });

export const fonts = {
  cormorant:       'CormorantGaramond-Light',
  cormorantItalic: 'CormorantGaramond-LightItalic',
  poppins:         'Poppins-Regular',
  poppinsMedium:   'Poppins-Medium',
  poppinsSemiBold: 'Poppins-SemiBold',
  poppinsBold:     'Poppins-Bold',
  jost:            'Jost-Light',
  jostRegular:     'Jost-Regular',
} as const;

// Espaçamentos e bordas recorrentes
export const radius = {
  sm: 2,
  md: 4,
  lg: 8,
  xl: 15,
  full: 999,
} as const;

export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
  xxxl:48,
} as const;