// Shared DOM helpers.

// The element every screen renders into.
export const app = document.getElementById("app");


export function escapeHtml(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// ======================================================
// ERROR
// ======================================================

export function showError(
  message
) {

  app.innerHTML = `

    <div class="empty-state">

      <div class="large-emoji">
        ⚠️
      </div>

      <h2>
        Something went wrong
      </h2>

      <p>
        ${message}
      </p>

      <button
        class="action-btn"
        style="margin-top:18px;"
        data-action="showHome()"
      >
        Go Home
      </button>

    </div>

  `;
}
