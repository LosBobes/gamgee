import { createNavigationContainerRef } from "@react-navigation/native";

import { MainTabParamList, RootStackParamList, TAB_ROUTE } from "./types";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/** Route to a main tab from a push deep-link `tab` value. Safe to call before
 *  the container is ready (no-op) and falls back to Notifications. */
export function navigateToTab(tab: string): void {
  if (!navigationRef.isReady()) return;
  const route: keyof MainTabParamList = TAB_ROUTE[tab] ?? "Notifications";
  navigationRef.navigate("Main", { screen: route });
}
