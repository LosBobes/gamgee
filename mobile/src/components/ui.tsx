import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";

import { theme } from "../theme";

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = "primary",
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "ghost";
}) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        isPrimary ? styles.btnPrimary : styles.btnGhost,
        (disabled || loading) && styles.btnDisabled,
        pressed && styles.btnPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? theme.bg : theme.primary} />
      ) : (
        <Text style={[styles.btnText, isPrimary ? styles.btnTextPrimary : styles.btnTextGhost]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={theme.muted}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  btn: {
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  btnPrimary: { backgroundColor: theme.primary },
  btnGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: theme.border },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { opacity: 0.85 },
  btnText: { fontSize: 16, fontWeight: "700" },
  btnTextPrimary: { color: theme.bg },
  btnTextGhost: { color: theme.text },
  label: { color: theme.muted, fontSize: 13, fontWeight: "600" },
  input: {
    height: 50,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: theme.text,
    fontSize: 16,
  },
  card: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    padding: 16,
  },
});
