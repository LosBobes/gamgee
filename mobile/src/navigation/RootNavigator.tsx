import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { Text } from "react-native";

import HistoryScreen from "../screens/HistoryScreen";
import LoginScreen from "../screens/LoginScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import RegisterScreen from "../screens/RegisterScreen";
import { theme } from "../theme";
import { AuthStackParamList, MainTabParamList, RootStackParamList } from "./types";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

export function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
      }}
    >
      <Tabs.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ tabBarIcon: ({ color }) => <TabIcon icon="🔔" color={color} /> }}
      />
      <Tabs.Screen
        name="History"
        component={HistoryScreen}
        options={{ tabBarIcon: ({ color }) => <TabIcon icon="🏋️" color={color} /> }}
      />
      <Tabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ color }) => <TabIcon icon="👤" color={color} /> }}
      />
    </Tabs.Navigator>
  );
}

function TabIcon({ icon, color }: { icon: string; color: string }) {
  return <Text style={{ fontSize: 18, color }}>{icon}</Text>;
}

export function AppNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Main" component={MainTabs} />
    </RootStack.Navigator>
  );
}
