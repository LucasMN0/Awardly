import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'CormorantGaramond-Light':        require('../assets/fonts/CormorantGaramond-Light.ttf'),
    'CormorantGaramond-LightItalic':  require('../assets/fonts/CormorantGaramond-LightItalic.ttf'),
    'CormorantGaramond-Regular':      require('../assets/fonts/CormorantGaramond-Regular.ttf'),
    'CormorantGaramond-MediumItalic':  require('../assets/fonts/CormorantGaramond-MediumItalic.ttf'),
    'Poppins-Regular':                require('../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Medium':                 require('../assets/fonts/Poppins-Medium.ttf'),
    'Poppins-SemiBold':               require('../assets/fonts/Poppins-SemiBold.ttf'),
    'Poppins-Bold':                   require('../assets/fonts/Poppins-Bold.ttf'),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
    const timeout = setTimeout(() => SplashScreen.hideAsync(), 3000);
    return () => clearTimeout(timeout);
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0a0906' }, 
        animation: 'slide_from_right', 
      }}
    />
  );
}