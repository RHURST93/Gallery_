import React from 'react';
import { Tabs } from 'expo-router';
import { Image } from 'react-native';

import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';



const TabLayout: React.FC = () => {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: true,
        headerStyle: {
          backgroundColor: '#052C4F',
        },
        headerTintColor: 'white',
        headerTitleAlign: 'center',
        headerLeft: () => (
          <Image
            source={require('../../assets/images/moto.png')}
            style={{ width: 80, height: 80, marginLeft: 15 }}
            resizeMode="contain"
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Gallery',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'image-outline' : 'home-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="albums"
        options={{
          title: 'Albums',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'albums-outline' : 'albums-outline'} color={color} />
          ),
        }}
      />
    </Tabs>
  );
};

export default TabLayout;
