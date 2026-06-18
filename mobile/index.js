// App entry point.
//
// The FCM background handler MUST be registered before the React root mounts,
// at the top of the very first module that loads — otherwise messages that
// arrive while the app is backgrounded/quit are dropped. We import the handler
// module for its side effect here, ahead of registerRootComponent.
import "./src/push/background";

import { registerRootComponent } from "expo";

import App from "./App";

registerRootComponent(App);
