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

// Keyboard navigation for search results (ARIA combobox)
(function () {
  var input = document.getElementById("search-input");
  if (!input) return;

  var combobox = input.closest('[role="combobox"]');
  var resultsContainer = document.getElementById("search-results");
  var activeIndex = -1;

  function getOptions() {
    return resultsContainer.querySelectorAll('[role="option"]');
  }

  function clearActive() {
    var options = getOptions();
    options.forEach(function (opt) {
      opt.setAttribute("aria-selected", "false");
      opt.classList.remove("is-focused");
    });
    input.setAttribute("aria-activedescendant", "");
    activeIndex = -1;
  }

  function setActive(index) {
    var options = getOptions();
    if (options.length === 0) return;

    clearActive();

    if (index < 0) index = options.length - 1;
    if (index >= options.length) index = 0;

    activeIndex = index;
    var option = options[activeIndex];
    option.setAttribute("aria-selected", "true");
    option.classList.add("is-focused");
    input.setAttribute("aria-activedescendant", option.id);
    option.scrollIntoView({ block: "nearest" });
  }

  function closeResults() {
    resultsContainer.innerHTML = "";
    if (combobox) combobox.setAttribute("aria-expanded", "false");
    clearActive();
  }

  input.addEventListener("keydown", function (e) {
    var options = getOptions();
    if (options.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(activeIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(activeIndex - 1);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      var option = options[activeIndex];
      var btn = option.querySelector("button");
      if (btn) btn.click();
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeResults();
      input.focus();
    }
  });

  // Update aria-expanded, reset active index, and clear spinner when results load
  document.body.addEventListener("htmx:afterSettle", function (evt) {
    if (evt.detail.target === resultsContainer || resultsContainer.contains(evt.detail.target)) {
      activeIndex = -1;
      var hasResults = getOptions().length > 0;
      if (combobox) combobox.setAttribute("aria-expanded", hasResults ? "true" : "false");
      var spinner = document.getElementById("search-spinner");
      if (spinner) spinner.classList.remove("htmx-request");
    }
  });

  // Click outside closes results
  document.addEventListener("click", function (e) {
    if (!combobox || !combobox.contains(e.target)) {
      closeResults();
    }
  });
})();

// Feedback popover aria-expanded sync
(function () {
  var toggle = document.querySelector(".feedback-toggle");
  var popover = document.getElementById("feedback-popover");
  if (!toggle || !popover) return;

  function syncExpanded() {
    var isOpen = popover.hasAttribute("open");
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  // Override the inline onclick with a proper handler
  toggle.removeAttribute("onclick");
  toggle.addEventListener("click", function () {
    popover.toggleAttribute("open");
    syncExpanded();
  });

  // Cancel button
  var cancelBtn = popover.querySelector('button[type="button"]');
  if (cancelBtn) {
    cancelBtn.removeAttribute("onclick");
    cancelBtn.addEventListener("click", function () {
      popover.removeAttribute("open");
      syncExpanded();
    });
  }

  syncExpanded();
})();
