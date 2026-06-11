// FCM background / quit-state message handler.
//
// Imported for its side effect by index.js BEFORE the React root mounts. The
// backend sends a `notification` block with every push (see app/fcm.py), which
// Android and iOS render automatically while the app is backgrounded or killed —
// so there is nothing to display here. But react-native-firebase REQUIRES a
// background handler to be registered or it logs a warning and may not wake the
// app, so we register a minimal no-op.
import messaging from "@react-native-firebase/messaging";

messaging().setBackgroundMessageHandler(async (_remoteMessage) => {
  // Notification messages are displayed by the OS. Data-only payloads (none
  // today) would be handled here. Tap routing happens in messaging.ts via
  // onNotificationOpenedApp / getInitialNotification.
});
