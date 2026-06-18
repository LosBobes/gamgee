import { ExpoConfig } from "expo/config";

// Gamgee mobile (Expo prebuild). Native Firebase modules mean this app can NOT
// run in Expo Go — build a dev client with EAS or `expo run:android|ios`.
//
// The two Firebase credential files referenced below are NOT committed (they are
// per-project secrets, see .gitignore). Download them from the Firebase console
// and drop them next to this file before building:
//   - google-services.json        (Android app)
//   - GoogleService-Info.plist     (iOS app)
// See ../docs/fcm-setup.md.

const config: ExpoConfig = {
  name: "Gamgee",
  slug: "gamgee",
  scheme: "gamgee",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  backgroundColor: "#0E0C0A",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#0E0C0A",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    bundleIdentifier: "app.gamgee.mobile",
    supportsTablet: true,
    googleServicesFile: "./GoogleService-Info.plist",
    infoPlist: {
      // Allow http:// to a LAN dev backend. Tighten for production (use https).
      NSAppTransportSecurity: { NSAllowsArbitraryLoads: true },
      UIBackgroundModes: ["remote-notification"],
    },
  },
  android: {
    package: "app.gamgee.mobile",
    googleServicesFile: "./google-services.json",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#0E0C0A",
    },
    permissions: ["POST_NOTIFICATIONS"],
  },
  plugins: [
    "@react-native-firebase/app",
    "expo-secure-store",
    [
      "expo-build-properties",
      {
        // react-native-firebase requires static frameworks on iOS.
        ios: { useFrameworks: "static" },
        android: {},
      },
    ],
  ],
  extra: {
    // Backend base URL. Override per environment with EXPO_PUBLIC_API_BASE_URL.
    //   Android emulator → http://10.0.2.2:8000
    //   iOS simulator    → http://localhost:8000
    //   Physical device  → http://<your-LAN-ip>:8000
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://10.0.2.2:8000",
  },
};

export default config;
