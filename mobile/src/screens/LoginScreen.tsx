import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";

import { ApiError } from "../api/client";
import { Button, Field } from "../components/ui";
import { useAuth } from "../auth/AuthContext";
import { AuthStackParamList } from "../navigation/types";
import { theme } from "../theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signIn(username.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't sign in. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>Gamgee</Text>
        <Text style={styles.sub}>Sign in to keep training.</Text>

        <Field
          label="Username or email"
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={setUsername}
        />
        <Field
          label="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button title="Sign in" onPress={onSubmit} loading={loading} />
        <Button
          title="Create an account"
          variant="ghost"
          onPress={() => navigation.navigate("Register")}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  inner: { flex: 1, justifyContent: "center", padding: 24, gap: 14 },
  logo: { color: theme.primary, fontSize: 40, fontWeight: "800", textAlign: "center" },
  sub: { color: theme.muted, textAlign: "center", marginBottom: 12 },
  error: { color: theme.danger, fontSize: 14 },
});
