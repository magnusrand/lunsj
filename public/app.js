// Generate or retrieve client ID for duplicate review prevention
(function () {
  let clientId = localStorage.getItem("lunsj_client_id");
  if (!clientId) {
    clientId = crypto.randomUUID();
    localStorage.setItem("lunsj_client_id", clientId);
  }

  // Set clientId on any review form present or loaded via HTMX
  function setClientId() {
    const el = document.getElementById("clientId");
    if (el) el.value = clientId;
  }

  setClientId();
  document.body.addEventListener("htmx:afterSettle", setClientId);

  // Check server for existing review and swap in edit form if found
  function checkExistingReview() {
    const container = document.getElementById("review-form-container");
    if (!container) return;
    const form = document.getElementById("review-form");
    if (!form) return;
    const addressKeyInput = form.querySelector('input[name="addressKey"]');
    if (!addressKeyInput) return;

    const addressKey = addressKeyInput.value;
    htmx.ajax("GET", "/api/min-anmeldelse/" + addressKey + "?clientId=" + encodeURIComponent(clientId), {
      target: "#review-form-container",
      swap: "innerHTML",
    });
  }

  checkExistingReview();
})();
