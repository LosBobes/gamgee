import React, { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import * as api from "../api";
import { Button, Card } from "../components/ui";
import { useAuth } from "../auth/AuthContext";
import { registerForPush, unregisterForPush } from "../push/messaging";
import { theme } from "../theme";

export default function ProfileScreen() {
  const { user, token, signOut, withAuth } = useAuth();
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    withAuth((t) => api.nativePushStatus(t))
      .then((s) => setPushEnabled(s.enabled))
      .catch(() => setPushEnabled(false));
  }, [withAuth]);

  const enablePush = useCallback(async () => {
    if (!token) return;
    setWorking(true);
    try {
      await registerForPush(token);
      Alert.alert("Notifications enabled", "You'll get push notifications on this device.");
    } catch {
      Alert.alert("Couldn't enable", "Notification permission may be denied in system settings.");
    } finally {
      setWorking(false);
    }
  }, [token]);

  const onSignOut = useCallback(async () => {
    if (token) await unregisterForPush(token);
    await signOut();
  }, [token, signOut]);

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <Text style={styles.title}>Profile</Text>

      <Card style={styles.card}>
        <Text style={styles.name}>{user?.name ?? user?.username}</Text>
        <Text style={styles.meta}>@{user?.username}</Text>
        {user?.email ? <Text style={styles.meta}>{user.email}</Text> : null}
        {user?.is_trainer ? <Text style={styles.badge}>Trainer</Text> : null}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Push notifications</Text>
        <Text style={styles.meta}>
          {pushEnabled === null
            ? "Checking server…"
            : pushEnabled
              ? "Native push is available on this server."
              : "The server hasn't enabled native push (FCM) yet."}
        </Text>
        <View style={{ height: 12 }} />
        <Button
          title="Enable on this device"
          onPress={enablePush}
          loading={working}
          disabled={pushEnabled === false}
        />
      </Card>

      <View style={{ flex: 1 }} />
      <Button title="Sign out" variant="ghost" onPress={onSignOut} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, padding: 18 },
  title: { color: theme.text, fontSize: 24, fontWeight: "800", marginBottom: 8 },
  card: { marginTop: 12 },
  name: { color: theme.text, fontSize: 20, fontWeight: "700" },
  meta: { color: theme.muted, marginTop: 4 },
  sectionTitle: { color: theme.text, fontSize: 16, fontWeight: "700", marginBottom: 6 },
  badge: {
    alignSelf: "flex-start",
    marginTop: 8,
    color: theme.primary,
    borderColor: theme.primary,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 12,
    fontWeight: "700",
  },
});
