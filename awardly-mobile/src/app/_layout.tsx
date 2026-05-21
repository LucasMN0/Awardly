import { Slot } from 'expo-router';
import { AnimatedSplashOverlay } from '@/components/animated-icon';

export default function RootLayout() {
  return (
    <>
      <AnimatedSplashOverlay />
      <Slot />
    </>
  );
}