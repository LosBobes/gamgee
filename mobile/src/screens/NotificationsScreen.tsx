import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import * as api from "../api";
import { useAuth } from "../auth/AuthContext";
import { AppNotification } from "../types";
import { theme } from "../theme";

export default function NotificationsScreen() {
  const { withAuth } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await withAuth((t) => api.listNotifications(t));
      setItems(data);
    } catch {
      // 401 is handled by withAuth (auto sign-out); ignore transient errors.
    }
  }, [withAuth]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onPress = useCallback(
    async (n: AppNotification) => {
      if (n.read) return;
      setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, read: true } : it)));
      try {
        await withAuth((t) => api.markRead(t, n.id));
      } catch {
        /* optimistic; will reconcile on next load */
      }
    },
    [withAuth],
  );

  const onMarkAll = useCallback(async () => {
    setItems((prev) => prev.map((it) => ({ ...it, read: true })));
    try {
      await withAuth((t) => api.markAllRead(t));
    } catch {
      /* ignore */
    }
  }, [withAuth]);

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <Pressable onPress={onMarkAll} hitSlop={8}>
          <Text style={styles.markAll}>Mark all read</Text>
        </Pressable>
      </View>
      <FlatList
        data={items}
        keyExtractor={(n) => String(n.id)}
        contentContainerStyle={items.length === 0 && styles.emptyWrap}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        ListEmptyComponent={<Text style={styles.empty}>You're all caught up.</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => onPress(item)} style={styles.row}>
            {!item.read ? <View style={styles.dot} /> : <View style={styles.dotSpacer} />}
            <View style={{ flex: 1 }}>
              <Text style={[styles.message, !item.read && styles.unread]}>{item.message}</Text>
              <Text style={styles.meta}>
                {item.kind.replace(/_/g, " ")} · {relTime(item.created_at)}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function relTime(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  title: { color: theme.text, fontSize: 24, fontWeight: "800" },
  markAll: { color: theme.primary, fontWeight: "600" },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    alignItems: "flex-start",
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary, marginTop: 6 },
  dotSpacer: { width: 8 },
  message: { color: theme.text, fontSize: 15 },
  unread: { fontWeight: "700" },
  meta: { color: theme.muted, fontSize: 12, marginTop: 4, textTransform: "capitalize" },
  emptyWrap: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  empty: { color: theme.muted },
});
