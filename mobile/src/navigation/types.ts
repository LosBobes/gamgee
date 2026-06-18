import type { NavigatorScreenParams } from "@react-navigation/native";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
};

export type MainTabParamList = {
  Notifications: undefined;
  History: undefined;
  Profile: undefined;
};

/** Push `tab` query values we know how to route to a real screen today. */
export const TAB_ROUTE: Record<string, keyof MainTabParamList> = {
  notifications: "Notifications",
  history: "History",
  profile: "Profile",
};
