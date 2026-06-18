import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ApiError } from "../api/client";
import { Button, Field } from "../components/ui";
import { useAuth } from "../auth/AuthContext";
import { AuthStackParamList } from "../navigation/types";
import { theme } from "../theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export default function RegisterScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [form, setForm] = useState({ username: "", name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signUp({
        username: form.username.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        gender: "prefer_not_to_say",
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create your account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>Create account</Text>

        <Field label="Username" autoCapitalize="none" value={form.username} onChangeText={set("username")} />
        <Field label="Name" value={form.name} onChangeText={set("name")} />
        <Field
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={form.email}
          onChangeText={set("email")}
        />
        <Field label="Password" secureTextEntry value={form.password} onChangeText={set("password")} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button title="Sign up" onPress={onSubmit} loading={loading} />
        <Button title="Back to sign in" variant="ghost" onPress={() => navigation.goBack()} />
        <View style={{ height: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  inner: { padding: 24, gap: 14, paddingTop: 80 },
  logo: { color: theme.text, fontSize: 28, fontWeight: "800", marginBottom: 8 },
  error: { color: theme.danger, fontSize: 14 },
});
