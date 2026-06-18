import { DarkTheme, NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import { navigationRef } from "./src/navigation/navigationRef";
import { AppNavigator, AuthNavigator } from "./src/navigation/RootNavigator";
import { usePush } from "./src/push/usePush";
import { theme } from "./src/theme";

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: theme.bg,
    card: theme.surface,
    text: theme.text,
    border: theme.border,
    primary: theme.primary,
  },
};

function Root() {
  const { token, loading } = useAuth();
  usePush();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return token ? <AppNavigator /> : <AuthNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer ref={navigationRef} theme={navTheme}>
          <StatusBar style="light" />
          <Root />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
