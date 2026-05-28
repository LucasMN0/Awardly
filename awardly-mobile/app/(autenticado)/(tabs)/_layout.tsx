import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type IconName = 'home' | 'search' | 'book' | 'film' | 'trophy' | 'person';

function AnimatedTabIcon({
  name,
  color,
  size,
  focused,
}: {
  name: IconName;
  color: string;
  size: number;
  focused: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.25 : 1,
      useNativeDriver: true,
      damping: 12,
      stiffness: 180,
    }).start();
  }, [focused]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons
        name={focused ? name : `${name}-outline`}
        size={size}
        color={color}
      />
    </Animated.View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFD700',
        tabBarInactiveTintColor: '#666',
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#111',
          borderTopWidth: 0,
          height: 52 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
      }}
    >
      {(
        [
          { name: 'home', screen: 'index' },
          { name: 'search', screen: 'search' },
          { name: 'book', screen: 'log' },
          { name: 'film', screen: 'filmes' },
          { name: 'trophy', screen: 'categorias' },
          { name: 'person', screen: 'profile' },
        ] as { name: IconName; screen: string }[]
      ).map(({ name, screen }) => (
        <Tabs.Screen
          key={screen}
          name={screen}
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <AnimatedTabIcon
                name={name}
                color={color}
                size={size}
                focused={focused}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}