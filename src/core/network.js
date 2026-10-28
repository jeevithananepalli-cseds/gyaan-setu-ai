// Online / offline indicator.
import { uiText } from "../i18n/index.js";

// ======================================================
// NETWORK STATUS
// ======================================================

export function updateNetworkStatus() {

  const dot =
    document.getElementById(
      "networkDot"
    );

  const text =
    document.getElementById(
      "networkText"
    );


  if (
    navigator.onLine
  ) {

    dot.style.background =
      "#2db66d";

    text.textContent =
      uiText("online");

  }

  else {

    dot.style.background =
      "#f0a23c";

    text.textContent =
      uiText("offlineReady");

  }
}
