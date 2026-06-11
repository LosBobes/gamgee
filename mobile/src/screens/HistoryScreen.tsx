import React, { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import * as api from "../api";
import { Card } from "../components/ui";
import { useAuth } from "../auth/AuthContext";
import { WorkoutSession } from "../types";
import { theme } from "../theme";

export default function HistoryScreen() {
  const { withAuth } = useAuth();
  const [items, setItems] = useState<WorkoutSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await withAuth((t) => api.listWorkouts(t));
      data.sort((a, b) => b.date - a.date);
      setItems(data);
    } catch {
      /* handled by withAuth */
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

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <Text style={styles.title}>History</Text>
      <FlatList
        data={items}
        keyExtractor={(w) => w.id}
        contentContainerStyle={
          items.length === 0 ? styles.emptyWrap : { padding: 16, gap: 12 }
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        ListEmptyComponent={<Text style={styles.empty}>No workouts logged yet.</Text>}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.rowBetween}>
              <Text style={styles.date}>{fmtDate(item.date)}</Text>
              <Text style={styles.dur}>{fmtDur(item.duration)}</Text>
            </View>
            <Text style={styles.exercises}>
              {item.exercises.length} exercise{item.exercises.length === 1 ? "" : "s"}
              {item.rpe ? ` · RPE ${item.rpe}` : ""}
            </Text>
            <Text style={styles.exList} numberOfLines={2}>
              {item.exercises.map((e) => e.name ?? e.id).join(", ")}
            </Text>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function fmtDur(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  title: { color: theme.text, fontSize: 24, fontWeight: "800", padding: 18 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  date: { color: theme.text, fontSize: 16, fontWeight: "700" },
  dur: { color: theme.primary, fontWeight: "600" },
  exercises: { color: theme.muted, marginTop: 6, fontSize: 13 },
  exList: { color: theme.text, marginTop: 8, fontSize: 14 },
  emptyWrap: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  empty: { color: theme.muted },
});
