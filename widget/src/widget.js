/**
 * LocalBot AI – embeddable chat widget (vanilla JS, no frameworks).
 * Load via: <script data-token="YOUR_EMBED_TOKEN" src="https://your-domain.com/widget.js"></script>
 */
(function () {
  "use strict";

  var script = document.currentScript;
  if (!script) return;

  var token = script.getAttribute("data-token");
  if (!token || !token.trim()) {
    console.warn("[LocalBot AI] Missing data-token on script tag.");
    return;
  }

  var baseUrl = "";
  try {
    baseUrl = new URL(script.src).origin;
  } catch (e) {
    console.warn("[LocalBot AI] Could not determine script origin.");
    return;
  }

  // Session stored per token so conversation history is maintained across visits
  var STORAGE_KEY = "lba_session_" + token.trim();
  var CONFIG_CACHE_KEY_PREFIX = "lba_config_";
  var CONFIG_CACHE_EXPIRY_MS = 3600000; // 1 hour
  var BUBBLE_OFFSET = 24;
  var PANEL_WIDTH_DESKTOP = 380;
  var PANEL_HEIGHT_DESKTOP = 520;
  var MOBILE_BREAKPOINT = 480;

  /**
   * Get cached chatbot config from localStorage if present and not expired.
   * Returns the config object (without lastFetched) or null if missing/expired/unavailable.
   * Safe when localStorage is disabled (e.g. private browsing) – returns null.
   */
  function getCachedConfig(t) {
    var key = CONFIG_CACHE_KEY_PREFIX + (t || token).trim();
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      var stored = JSON.parse(raw);
      if (!stored || typeof stored.lastFetched !== "number") return null;
      if (Date.now() - stored.lastFetched > CONFIG_CACHE_EXPIRY_MS) return null;
      var config = {};
      if (stored.botName !== undefined) config.botName = stored.botName;
      if (stored.primaryColor !== undefined) config.primaryColor = stored.primaryColor;
      if (stored.welcomeMessage !== undefined) config.welcomeMessage = stored.welcomeMessage;
      if (stored.fallbackMessage !== undefined) config.fallbackMessage = stored.fallbackMessage;
      if (stored.widgetPosition !== undefined) config.widgetPosition = stored.widgetPosition;
      if (stored.avatarStyle !== undefined) config.avatarStyle = stored.avatarStyle;
      return config;
    } catch (e) {
      return null;
    }
  }

  /**
   * Store chatbot config in localStorage with a lastFetched timestamp for expiry.
   * No-op if localStorage is unavailable (e.g. private browsing).
   */
  function setCachedConfig(t, config) {
    if (!config || typeof config !== "object") return;
    var key = CONFIG_CACHE_KEY_PREFIX + (t || token).trim();
    try {
      var toStore = {
        botName: config.botName,
        primaryColor: config.primaryColor,
        welcomeMessage: config.welcomeMessage,
        fallbackMessage: config.fallbackMessage,
        widgetPosition: config.widgetPosition,
        avatarStyle: config.avatarStyle,
        lastFetched: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(toStore));
    } catch (e) {
      /* ignore */
    }
  }

  /**
   * Get or create a session ID (UUID) and persist in localStorage.
   */
  function getSessionId() {
    try {
      var existing = localStorage.getItem(STORAGE_KEY);
      if (existing) return existing;
      var newId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0;
        var v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
      localStorage.setItem(STORAGE_KEY, newId);
      return newId;
    } catch (e) {
      return "session-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    }
  }

  /**
   * Inject widget styles. All class names prefixed with lba- to avoid conflicts.
   */
  function injectStyles() {
    if (document.getElementById("lba-widget-styles")) return;
    var style = document.createElement("style");
    style.id = "lba-widget-styles";

    var css =
      /* Bubble: full rounded, subtle shadow, smooth transitions – !important to override host CSS */
      ".lba-bubble{position:fixed!important;width:56px!important;height:56px!important;border-radius:50%!important;border:none!important;cursor:pointer!important;" +
      "box-shadow:0 4px 14px rgba(0,0,0,.18)!important;display:flex!important;align-items:center;justify-content:center;color:#fff!important;font-size:24px!important;" +
      "transition:transform .2s ease,box-shadow .2s ease,opacity .2s ease;z-index:2147483646;}" +
      ".lba-bubble:hover{transform:scale(1.06)!important;box-shadow:0 6px 20px rgba(0,0,0,.22)!important}" +
      ".lba-bubble:active{transform:scale(.98)!important}" +
      ".lba-bubble:focus{outline:2px solid rgba(255,255,255,.5);outline-offset:2px}" +
      ".lba-bubble.lba-pos-bottom-right{bottom:" + BUBBLE_OFFSET + "px;right:" + BUBBLE_OFFSET + "px}" +
      ".lba-bubble.lba-pos-bottom-left{bottom:" + BUBBLE_OFFSET + "px;left:" + BUBBLE_OFFSET + "px}" +
      ".lba-bubble.lba-pos-top-right{top:" + BUBBLE_OFFSET + "px;right:" + BUBBLE_OFFSET + "px}" +
      ".lba-bubble.lba-pos-top-left{top:" + BUBBLE_OFFSET + "px;left:" + BUBBLE_OFFSET + "px}" +

      /* Panel: 12px radius, shadow, slide-up + fade transition – !important to override host CSS */
      ".lba-panel{position:fixed!important;background:#fff!important;border-radius:12px 12px 0 0!important;box-shadow:0 -4px 28px rgba(0,0,0,.15),0 0 1px rgba(0,0,0,.08)!important;" +
      "display:flex;flex-direction:column;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif!important;overflow:hidden;" +
      "transition:transform .3s cubic-bezier(0.32,0.72,0,1),opacity .25s ease;}" +
      ".lba-panel.lba-closed{transform:translateY(100%);opacity:0;pointer-events:none}" +
      ".lba-panel.lba-pos-bottom-right,.lba-panel.lba-pos-bottom-left{bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:" + PANEL_WIDTH_DESKTOP + "px;height:" + PANEL_HEIGHT_DESKTOP + "px;max-height:85vh}" +
      ".lba-panel.lba-closed.lba-pos-bottom-right,.lba-panel.lba-closed.lba-pos-bottom-left{transform:translate(-50%,100%)}" +
      ".lba-panel.lba-pos-top-right,.lba-panel.lba-pos-top-left{top:0;left:50%;transform:translateX(-50%);width:100%;max-width:" + PANEL_WIDTH_DESKTOP + "px;height:" + PANEL_HEIGHT_DESKTOP + "px;max-height:85vh}" +
      ".lba-panel.lba-closed.lba-pos-top-right,.lba-panel.lba-closed.lba-pos-top-left{transform:translate(-50%,-100%)}" +

      /* Responsive: mobile 90% width, 80% height */
      "@media (max-width:" + MOBILE_BREAKPOINT + "px){.lba-panel{width:90vw!important;max-width:90vw!important;height:80vh!important;max-height:80vh!important;border-radius:12px 12px 0 0}}" +

      /* Header */
      ".lba-panel-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;color:#fff;flex-shrink:0;border-radius:12px 12px 0 0}" +
      ".lba-panel-title{font-weight:600;font-size:16px}" +
      ".lba-panel-close{background:transparent;border:none;color:inherit;cursor:pointer;padding:6px;line-height:1;opacity:.9;border-radius:4px;font-size:18px}" +
      ".lba-panel-close:hover{opacity:1}.lba-panel-close:focus{outline:2px solid rgba(255,255,255,.6);outline-offset:2px}" +

      /* Messages area – !important so host Tailwind cannot override */
      ".lba-messages{flex:1;overflow-y:auto;padding:16px!important;display:flex;flex-direction:column;gap:14px;background:#f8fafc!important;min-height:0}" +
      ".lba-msg{max-width:85%!important;padding:12px 16px!important;border-radius:12px!important;font-size:14px!important;line-height:1.5;word-wrap:break-word}" +
      ".lba-msg-user{align-self:flex-end!important;background:var(--lba-primary,#2563EB)!important;color:#fff!important;border-bottom-right-radius:4px!important;margin-left:auto}" +
      ".lba-msg-bot{align-self:flex-start!important;background:#f1f3f5!important;color:#1e293b!important;border-bottom-left-radius:4px!important}" +
      ".lba-msg-welcome{align-self:flex-start}" +

      /* Typing indicator: bot-style bubble with three bouncing dots */
      ".lba-typing{display:flex!important;gap:4px;padding:12px 16px!important;align-self:flex-start!important;background:#f1f3f5!important;border-radius:12px!important;border-bottom-left-radius:4px!important;min-width:60px}" +
      ".lba-typing span{width:8px;height:8px;border-radius:50%;background:#94a3b8;animation:lba-bounce 1.4s ease-in-out infinite both}" +
      ".lba-typing span:nth-child(1){animation-delay:-.32s}.lba-typing span:nth-child(2){animation-delay:-.16s}" +
      "@keyframes lba-bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}" +

      /* Input row */
      ".lba-input-row{display:flex;gap:8px;padding:12px 16px;background:#fff;border-top:1px solid #e2e8f0;flex-shrink:0}" +
      ".lba-input{flex:1;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:inherit}" +
      ".lba-input:focus{outline:none;border-color:var(--lba-primary,#2563EB)}" +
      ".lba-send{padding:10px 16px;background:var(--lba-primary,#2563EB);color:#fff;border:none;border-radius:8px;font-weight:500;cursor:pointer;flex-shrink:0;transition:opacity .2s}" +
      ".lba-send:hover:not(:disabled){opacity:.95}.lba-send:disabled{opacity:.6;cursor:not-allowed}.lba-send:focus{outline:2px solid var(--lba-primary);outline-offset:2px}" +

      /* Footer branding */
      ".lba-footer{padding:6px 16px;text-align:center;flex-shrink:0;background:#f1f5f9;border-top:1px solid #e2e8f0}" +
      ".lba-footer a{font-size:11px;color:#94a3b8;text-decoration:none}.lba-footer a:hover{text-decoration:underline;color:#64748b}";

    style.textContent = css;
    document.head.appendChild(style);
  }

  function positionClass(pos) {
    var p = (pos || "bottom-right").toLowerCase();
    if (p === "bottom-left") return "lba-pos-bottom-left";
    if (p === "top-right") return "lba-pos-top-right";
    if (p === "top-left") return "lba-pos-top-left";
    return "lba-pos-bottom-right";
  }

  /** Icon set for bubble (id 1–10). White stroke/fill on colored circle. */
  var BUBBLE_ICONS = {
    1: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
    2: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
    3: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M14 8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10l4-4h7a2 2 0 0 0 2-2z" opacity="0.7"/></svg>',
    4: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/><circle cx="8" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="16" cy="12" r="1" fill="currentColor"/></svg>',
    5: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4"/><circle cx="8.5" cy="15.5" r="1"/><circle cx="15.5" cy="15.5" r="1"/><path d="M12 11v2"/></svg>',
    6: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>',
    7: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>',
    8: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    9: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M7 10h10"/><path d="M7 14h6"/></svg>',
    10: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>',
  };

  function getBubbleIconContent(avatarStyle) {
    var id = String(avatarStyle || "1").trim();
    return BUBBLE_ICONS[id] || BUBBLE_ICONS[1];
  }

  function createBubble(config) {
    var bubble = document.createElement("button");
    bubble.type = "button";
    bubble.className = "lba-bubble " + positionClass(config.widgetPosition);
    bubble.setAttribute("aria-label", "Open chat");
    bubble.style.backgroundColor = config.primaryColor || "#2563EB";
    var iconWrap = document.createElement("span");
    iconWrap.style.display = "flex";
    iconWrap.style.alignItems = "center";
    iconWrap.style.justifyContent = "center";
    iconWrap.style.color = "#fff";
    iconWrap.innerHTML = getBubbleIconContent(config.avatarStyle);
    bubble.appendChild(iconWrap);
    return bubble;
  }

  function createPanel(config) {
    var panel = document.createElement("div");
    panel.className = "lba-panel lba-closed " + positionClass(config.widgetPosition);
    panel.setAttribute("aria-hidden", "true");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Chat");

    var header = document.createElement("div");
    header.className = "lba-panel-header";
    header.style.backgroundColor = config.primaryColor || "#2563EB";

    var title = document.createElement("span");
    title.className = "lba-panel-title";
    title.textContent = config.botName || "Assistant";

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "lba-panel-close";
    closeBtn.setAttribute("aria-label", "Close chat");
    closeBtn.innerHTML = "&#10005;";

    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    var messagesEl = document.createElement("div");
    messagesEl.className = "lba-messages";

    var welcomeMsg = config.welcomeMessage || "Hi! How can I help?";
    var welcomeDiv = document.createElement("div");
    welcomeDiv.className = "lba-msg lba-msg-bot lba-msg-welcome";
    welcomeDiv.textContent = welcomeMsg;
    messagesEl.appendChild(welcomeDiv);

    panel.appendChild(messagesEl);

    var inputRow = document.createElement("div");
    inputRow.className = "lba-input-row";

    var input = document.createElement("input");
    input.type = "text";
    input.className = "lba-input";
    input.placeholder = "Type a message...";
    input.setAttribute("autocomplete", "off");
    input.setAttribute("aria-label", "Message input");

    var sendBtn = document.createElement("button");
    sendBtn.type = "button";
    sendBtn.className = "lba-send";
    sendBtn.textContent = "Send";
    sendBtn.setAttribute("aria-label", "Send message");
    sendBtn.style.backgroundColor = config.primaryColor || "#2563EB";

    inputRow.appendChild(input);
    inputRow.appendChild(sendBtn);
    panel.appendChild(inputRow);

    var footer = document.createElement("div");
    footer.className = "lba-footer";
    footer.innerHTML = '<a href="https://localbot.ai" target="_blank" rel="noopener">Powered by LocalBot AI</a>';
    panel.appendChild(footer);

    return { panel: panel, messagesEl: messagesEl, input: input, sendBtn: sendBtn, closeBtn: closeBtn };
  }

  function addMessage(messagesEl, text, isUser) {
    var div = document.createElement("div");
    div.className = "lba-msg " + (isUser ? "lba-msg-user" : "lba-msg-bot");
    div.textContent = text;
    messagesEl.appendChild(div);
    scrollToBottom(messagesEl);
  }

  function scrollToBottom(messagesEl) {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping(messagesEl) {
    var wrap = document.createElement("div");
    wrap.className = "lba-typing";
    wrap.setAttribute("aria-live", "polite");
    wrap.setAttribute("aria-label", "Bot is typing");
    wrap.innerHTML = "<span></span><span></span><span></span>";
    wrap.setAttribute("data-lba-typing", "1");
    messagesEl.appendChild(wrap);
    scrollToBottom(messagesEl);
    return wrap;
  }

  function hideTyping(messagesEl) {
    var el = messagesEl.querySelector("[data-lba-typing]");
    if (el) el.remove();
  }

  /**
   * Mount the widget UI and wire events. Called with config from cache or API.
   */
  function initWidget(config) {
    var primary = config.primaryColor || "#2563EB";
    document.documentElement.style.setProperty("--lba-primary", primary);

    var bubble = createBubble(config);
    var ui = createPanel(config);
    var panel = ui.panel;
    var messagesEl = ui.messagesEl;
    var input = ui.input;
    var sendBtn = ui.sendBtn;

    bubble.addEventListener("click", function () {
      panel.classList.remove("lba-closed");
      panel.setAttribute("aria-hidden", "false");
      input.focus();
    });

    ui.closeBtn.addEventListener("click", function () {
      panel.classList.add("lba-closed");
      panel.setAttribute("aria-hidden", "true");
    });

    function send() {
      var text = (input.value || "").trim();
      if (!text) return;

      input.value = "";
      addMessage(messagesEl, text, true);

      showTyping(messagesEl);
      sendBtn.disabled = true;

      fetch(baseUrl + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.trim(),
          message: text,
          session_id: getSessionId(),
        }),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok) throw new Error(data.error || "Request failed");
            return data;
          });
        })
        .then(function (data) {
          hideTyping(messagesEl);
          addMessage(messagesEl, data.answer || "", false);
        })
        .catch(function () {
          hideTyping(messagesEl);
          addMessage(messagesEl, "Sorry, something went wrong. Please try again later.", false);
        })
        .finally(function () {
          sendBtn.disabled = false;
          input.focus();
        });
    }

    sendBtn.addEventListener("click", send);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });

    document.body.appendChild(bubble);
    document.body.appendChild(panel);
  }

  /**
   * Load config from cache or API, then initialize the widget.
   * If localStorage is unavailable, always fetches from API.
   */
  function run() {
    injectStyles();

    var cached = getCachedConfig(token);
    if (cached) {
      initWidget(cached);
      return;
    }

    fetch(baseUrl + "/api/widget-config/" + encodeURIComponent(token.trim()))
      .then(function (res) {
        if (!res.ok) throw new Error("Config failed " + res.status);
        return res.json();
      })
      .then(function (config) {
        setCachedConfig(token, config);
        initWidget(config);
      })
      .catch(function (err) {
        console.warn("[LocalBot AI] Could not load widget config:", err);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
