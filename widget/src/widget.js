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
  var WELCOME_DISMISSED_KEY_PREFIX = "lba_welcome_dismissed_";
  var CONFIG_CACHE_EXPIRY_MS = 3600000; // 1 hour
  var BUBBLE_OFFSET = 24;
  var BUBBLE_SIZE = 56;
  var PANEL_ABOVE_BUBBLE_GAP = 8;
  var PANEL_BOTTOM_WHEN_ABOVE_BUBBLE = BUBBLE_OFFSET + BUBBLE_SIZE + PANEL_ABOVE_BUBBLE_GAP;
  var WELCOME_BUBBLE_OFFSET = 12;
  var PANEL_WIDTH_DESKTOP = 380;
  var PANEL_HEIGHT_DESKTOP = 520;
  var MOBILE_BREAKPOINT = 480;
  var TYPING_SPEED_MS = 45;
  var WELCOME_SHOW_DELAY_MS = 600;

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
      ".lba-bubble.lba-pos-bottom-right{bottom:" + BUBBLE_OFFSET + "px;right:" + BUBBLE_OFFSET + "px;z-index:2147483647!important}" +
      ".lba-bubble.lba-pos-bottom-left{bottom:" + BUBBLE_OFFSET + "px;left:" + BUBBLE_OFFSET + "px;z-index:2147483647!important}" +
      ".lba-bubble.lba-pos-top-right{top:" + BUBBLE_OFFSET + "px;right:" + BUBBLE_OFFSET + "px;z-index:2147483647!important}" +
      ".lba-bubble.lba-pos-top-left{top:" + BUBBLE_OFFSET + "px;left:" + BUBBLE_OFFSET + "px;z-index:2147483647!important}" +

      /* Proactive welcome bubble: white speech bubble with tail, typing animation */
      ".lba-welcome-wrap{position:fixed!important;z-index:2147483645;display:flex;align-items:flex-end;pointer-events:none;opacity:0;transition:opacity .3s ease;}" +
      ".lba-welcome-wrap.lba-welcome-visible{pointer-events:auto;opacity:1}" +
      ".lba-welcome-wrap.lba-welcome-hidden{opacity:0!important;pointer-events:none!important;transition:opacity .2s ease}" +
      ".lba-welcome-bubble{background:#fff!important;border-radius:12px!important;box-shadow:0 4px 20px rgba(0,0,0,.12),0 0 1px rgba(0,0,0,.08)!important;padding:14px 18px 14px 16px!important;max-width:260px!important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif!important;position:relative!important;pointer-events:auto}" +
      ".lba-welcome-bubble::after{content:''!important;position:absolute!important;width:0;height:0;border:8px solid transparent!important}" +
      ".lba-welcome-wrap.lba-pos-bottom-right .lba-welcome-bubble::after{border-left-color:#fff!important;border-right:none!important;right:-14px!important;bottom:20px!important}" +
      ".lba-welcome-wrap.lba-pos-bottom-left .lba-welcome-bubble::after{border-right-color:#fff!important;border-left:none!important;left:-14px!important;bottom:20px!important}" +
      ".lba-welcome-wrap.lba-pos-top-right .lba-welcome-bubble::after{border-left-color:#fff!important;border-right:none!important;right:-14px!important;top:20px!important;bottom:auto!important}" +
      ".lba-welcome-wrap.lba-pos-top-left .lba-welcome-bubble::after{border-right-color:#fff!important;border-left:none!important;left:-14px!important;top:20px!important;bottom:auto!important}" +
      ".lba-welcome-line1{font-size:15px!important;font-weight:600!important;color:#334155!important;line-height:1.35!important;min-height:1.35em}" +
      ".lba-welcome-line2{font-size:14px!important;color:#64748b!important;line-height:1.4!important;margin-top:4px!important;min-height:1.4em}" +
      ".lba-welcome-cursor{display:inline-block;width:2px;height:1em;background:#64748b;animation:lba-blink 1s step-end infinite;vertical-align:text-bottom}" +
      "@keyframes lba-blink{50%{opacity:0}}" +
      ".lba-welcome-close{position:absolute!important;top:8px!important;right:8px!important;width:24px!important;height:24px!important;border:none!important;background:transparent!important;cursor:pointer!important;border-radius:4px!important;color:#94a3b8!important;font-size:16px!important;line-height:1!important;padding:0!important;display:flex!important;align-items:center!important;justify-content:center!important}" +
      ".lba-welcome-close:hover{color:#64748b!important;background:#f1f5f9!important}" +
      ".lba-welcome-wrap.lba-pos-bottom-right{bottom:" + BUBBLE_OFFSET + "px;right:" + (BUBBLE_OFFSET + 56 + WELCOME_BUBBLE_OFFSET) + "px}" +
      ".lba-welcome-wrap.lba-pos-bottom-left{bottom:" + BUBBLE_OFFSET + "px;left:" + (BUBBLE_OFFSET + 56 + WELCOME_BUBBLE_OFFSET) + "px}" +
      ".lba-welcome-wrap.lba-pos-top-right{top:" + BUBBLE_OFFSET + "px;right:" + (BUBBLE_OFFSET + 56 + WELCOME_BUBBLE_OFFSET) + "px}" +
      ".lba-welcome-wrap.lba-pos-top-left{top:" + BUBBLE_OFFSET + "px;left:" + (BUBBLE_OFFSET + 56 + WELCOME_BUBBLE_OFFSET) + "px}" +

      /* Panel: anchored above the bubble (bubble stays visible at corner). Panel bottom = above bubble. */
      ".lba-panel{position:fixed!important;background:#fff!important;border-radius:12px 12px 0 0!important;box-shadow:0 -4px 28px rgba(0,0,0,.15),0 0 1px rgba(0,0,0,.08)!important;" +
      "display:flex;flex-direction:column;z-index:2147483646;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif!important;overflow:hidden;" +
      "transition:transform .3s cubic-bezier(0.32,0.72,0,1),opacity .25s ease;}" +
      ".lba-panel.lba-closed{transform:translateY(100%);opacity:0;pointer-events:none}" +
      ".lba-panel.lba-pos-bottom-right{bottom:" + PANEL_BOTTOM_WHEN_ABOVE_BUBBLE + "px;right:" + BUBBLE_OFFSET + "px;left:auto;width:100%;max-width:" + PANEL_WIDTH_DESKTOP + "px;height:" + PANEL_HEIGHT_DESKTOP + "px;max-height:calc(100vh - " + PANEL_BOTTOM_WHEN_ABOVE_BUBBLE + "px)}" +
      ".lba-panel.lba-closed.lba-pos-bottom-right{transform:translateY(100%)}" +
      ".lba-panel.lba-pos-bottom-left{bottom:" + PANEL_BOTTOM_WHEN_ABOVE_BUBBLE + "px;left:" + BUBBLE_OFFSET + "px;right:auto;width:100%;max-width:" + PANEL_WIDTH_DESKTOP + "px;height:" + PANEL_HEIGHT_DESKTOP + "px;max-height:calc(100vh - " + PANEL_BOTTOM_WHEN_ABOVE_BUBBLE + "px)}" +
      ".lba-panel.lba-closed.lba-pos-bottom-left{transform:translateY(100%)}" +
      ".lba-panel.lba-pos-top-right{top:0;right:0;left:auto;width:100%;max-width:" + PANEL_WIDTH_DESKTOP + "px;height:" + PANEL_HEIGHT_DESKTOP + "px;max-height:85vh}" +
      ".lba-panel.lba-closed.lba-pos-top-right{transform:translateY(-100%)}" +
      ".lba-panel.lba-pos-top-left{top:0;left:0;right:auto;width:100%;max-width:" + PANEL_WIDTH_DESKTOP + "px;height:" + PANEL_HEIGHT_DESKTOP + "px;max-height:85vh}" +
      ".lba-panel.lba-closed.lba-pos-top-left{transform:translateY(-100%)}" +

      /* Responsive: mobile full width when corner-anchored */
      "@media (max-width:" + MOBILE_BREAKPOINT + "px){.lba-panel.lba-pos-bottom-right,.lba-panel.lba-pos-bottom-left{width:100%!important;max-width:100%!important;height:80vh!important;max-height:80vh!important;border-radius:12px 12px 0 0}}" +

      /* Header with prominent circular close button (X) */
      ".lba-panel-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;color:#fff;flex-shrink:0;border-radius:12px 12px 0 0}" +
      ".lba-panel-title{font-weight:600;font-size:16px}" +
      ".lba-panel-close{display:flex!important;align-items:center;justify-content:center;width:36px!important;height:36px!important;min-width:36px!important;min-height:36px!important;background:rgba(255,255,255,.25)!important;border:none!important;color:#fff!important;cursor:pointer!important;border-radius:50%!important;font-size:18px!important;line-height:1!important;padding:0!important;opacity:1;transition:background .2s}" +
      ".lba-panel-close:hover{background:rgba(255,255,255,.4)!important}.lba-panel-close:focus{outline:2px solid rgba(255,255,255,.7);outline-offset:2px}" +

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
      ".lba-footer a{font-size:11px;color:#94a3b8;text-decoration:none}.lba-footer a:hover{text-decoration:underline;color:#64748b}" +

      /* Tabbed panel: content area and bottom nav */
      ".lba-panel-body{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}" +
      ".lba-panel-view{display:none;flex:1;flex-direction:column;min-height:0;overflow:hidden}" +
      ".lba-panel-view.lba-active{display:flex!important}" +
      ".lba-nav{display:flex;justify-content:space-around;align-items:center;flex-shrink:0;padding:10px 8px 8px;background:#fff;border-top:1px solid #e2e8f0}" +
      ".lba-nav-item{display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;background:none;border:none;padding:6px 10px;border-radius:8px;color:#64748b;font-size:11px;font-family:inherit;transition:color .2s}" +
      ".lba-nav-item:hover{color:#334155}" +
      ".lba-nav-item.lba-nav-active{color:var(--lba-primary,#2563EB);font-weight:600}" +
      ".lba-nav-item.lba-nav-active .lba-nav-icon{color:var(--lba-primary,#2563EB)}" +
      ".lba-nav-icon{width:22px;height:22px;color:#94a3b8;flex-shrink:0}" +

      /* Home view */
      ".lba-home{overflow-y:auto;padding:16px;background:#f8fafc}" +
      ".lba-home-greeting{font-size:14px;color:#64748b;margin-bottom:12px;line-height:1.5}" +
      ".lba-home-cta{display:flex;align-items:center;gap:12px;padding:14px 16px;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.08);cursor:pointer;margin-bottom:20px;border:none;width:100%;text-align:left;font-family:inherit;transition:box-shadow .2s}" +
      ".lba-home-cta:hover{box-shadow:0 2px 8px rgba(0,0,0,.12)}" +
      ".lba-home-cta-icon{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff}" +
      ".lba-home-cta-text{font-weight:600;font-size:15px;color:#1e293b;flex:1}" +
      ".lba-home-cta-arrow{color:#94a3b8;font-size:18px}" +
      ".lba-home-section-title{font-weight:600;font-size:14px;color:#334155;margin-bottom:10px}" +
      ".lba-home-links{background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.08);overflow:hidden}" +
      ".lba-home-link{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border:none;background:none;width:100%;cursor:pointer;font-size:14px;color:#334155;font-family:inherit;text-align:left;border-bottom:1px solid #f1f5f9}" +
      ".lba-home-link:last-child{border-bottom:none}" +
      ".lba-home-link:hover{background:#f8fafc}" +
      ".lba-home-link-arrow{color:#94a3b8;font-size:16px}" +

      /* FAQs / Articles views */
      ".lba-kb{display:flex;flex-direction:column;min-height:0;overflow:hidden;background:#f8fafc}" +
      ".lba-kb-search{padding:12px 16px;flex-shrink:0}" +
      ".lba-kb-search input{width:100%;padding:10px 12px 10px 36px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:inherit;background:#fff url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2394a3b8%22 stroke-width=%222%22%3E%3Ccircle cx=%2211%22 cy=%2211%22 r=%228%22/%3E%3Cpath d=%22m21 21-4.35-4.35%22/%3E%3C/svg%3E') no-repeat 10px center;background-size:18px}" +
      ".lba-kb-list{flex:1;overflow-y:auto;padding:0 16px 16px}" +
      ".lba-kb-category{background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.08);margin-bottom:12px;overflow:hidden}" +
      ".lba-kb-cat-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;cursor:pointer;border:none;width:100%;background:none;font-family:inherit;font-size:14px;font-weight:600;color:#334155;text-align:left}" +
      ".lba-kb-cat-head:hover{background:#f8fafc}" +
      ".lba-kb-cat-count{font-size:12px;font-weight:400;color:#64748b}" +
      ".lba-kb-cat-arrow{color:#94a3b8;font-size:14px;transition:transform .2s}" +
      ".lba-kb-cat-open .lba-kb-cat-arrow{transform:rotate(90deg)}" +
      ".lba-kb-items{display:none;border-top:1px solid #f1f5f9}" +
      ".lba-kb-cat-open .lba-kb-items{display:block}" +
      ".lba-kb-item{padding:12px 16px;border-bottom:1px solid #f1f5f9;cursor:pointer;font-size:13px;color:#475569;text-align:left;background:none;width:100%;font-family:inherit}" +
      ".lba-kb-item:last-child{border-bottom:none}" +
      ".lba-kb-item:hover{background:#f8fafc;color:#1e293b}" +
      ".lba-kb-empty{padding:24px 16px;text-align:center;color:#64748b;font-size:14px}" +
      ".lba-kb-article-card{background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.08);margin-bottom:12px;padding:14px 16px;cursor:pointer;text-align:left;border:none;width:100%;font-family:inherit}" +
      ".lba-kb-article-card:hover{box-shadow:0 2px 8px rgba(0,0,0,.1)}" +
      ".lba-kb-article-title{font-weight:600;font-size:14px;color:#334155;margin-bottom:4px}" +
      ".lba-kb-article-snippet{font-size:12px;color:#64748b;line-height:1.4}" +
      ".lba-kb-answer{display:none;padding:12px 16px;background:#f1f5f9;font-size:13px;color:#334155;line-height:1.5;white-space:pre-wrap}";

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

  var BUBBLE_ICON_X = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

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

    function setIconOpen(isOpen) {
      iconWrap.innerHTML = isOpen ? BUBBLE_ICON_X : getBubbleIconContent(config.avatarStyle);
      bubble.setAttribute("aria-label", isOpen ? "Close chat" : "Open chat");
    }

    return { bubble: bubble, setIconOpen: setIconOpen };
  }

  function getWelcomeDismissedKey() {
    return WELCOME_DISMISSED_KEY_PREFIX + token.trim();
  }

  function wasWelcomeDismissed() {
    try {
      return sessionStorage.getItem(getWelcomeDismissedKey()) === "1";
    } catch (e) {
      return false;
    }
  }

  function setWelcomeDismissed() {
    try {
      sessionStorage.setItem(getWelcomeDismissedKey(), "1");
    } catch (e) { /* ignore */ }
  }

  /**
   * Create the proactive welcome bubble with typing animation and close button.
   * Returns { wrap, show, hide } so caller can show after delay and hide on bubble click / close.
   * onOpenChat is called when user clicks the message (to open the chat panel).
   */
  function createWelcomeBubble(config, onHide, onOpenChat) {
    var line1Text = "We're Online!";
    var line2Text = (config.welcomeMessage || "How may I help you today?").trim();
    var posClass = positionClass(config.widgetPosition);

    var wrap = document.createElement("div");
    wrap.className = "lba-welcome-wrap " + posClass;
    wrap.setAttribute("aria-live", "polite");

    var bubble = document.createElement("div");
    bubble.className = "lba-welcome-bubble";

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "lba-welcome-close";
    closeBtn.setAttribute("aria-label", "Close message");
    closeBtn.innerHTML = "&#10005;";
    closeBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      hide();
    });

    var line1 = document.createElement("div");
    line1.className = "lba-welcome-line1";
    var line1Span = document.createElement("span");
    var line1Cursor = document.createElement("span");
    line1Cursor.className = "lba-welcome-cursor";
    line1.appendChild(line1Span);
    line1.appendChild(line1Cursor);

    var line2 = document.createElement("div");
    line2.className = "lba-welcome-line2";
    var line2Span = document.createElement("span");
    var line2Cursor = document.createElement("span");
    line2Cursor.className = "lba-welcome-cursor";
    line2Cursor.style.display = "none";
    line2.appendChild(line2Span);
    line2.appendChild(line2Cursor);

    bubble.appendChild(closeBtn);
    bubble.appendChild(line1);
    bubble.appendChild(line2);
    wrap.appendChild(bubble);

    bubble.addEventListener("click", function (e) {
      if (closeBtn.contains(e.target)) return;
      hide();
      if (typeof onOpenChat === "function") onOpenChat();
    });

    function hide() {
      wrap.classList.add("lba-welcome-hidden");
      wrap.classList.remove("lba-welcome-visible");
      setWelcomeDismissed();
      if (typeof onHide === "function") onHide();
    }

    function typeChar(targetSpan, cursorEl, text, index, delay, then) {
      if (index >= text.length) {
        if (cursorEl) cursorEl.style.display = "none";
        if (then) setTimeout(then, 80);
        return;
      }
      targetSpan.textContent = text.slice(0, index + 1);
      setTimeout(function () {
        typeChar(targetSpan, cursorEl, text, index + 1, delay, then);
      }, delay);
    }

    function startTyping() {
      wrap.classList.add("lba-welcome-visible");
      line1Cursor.style.display = "inline-block";
      typeChar(line1Span, line1Cursor, line1Text, 0, TYPING_SPEED_MS, function () {
        line2Cursor.style.display = "inline-block";
        typeChar(line2Span, line2Cursor, line2Text, 0, TYPING_SPEED_MS, null);
      });
    }

    return { wrap: wrap, show: startTyping, hide: hide };
  }

  var NAV_ICONS = {
    home: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    conversation: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    faqs: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/></svg>',
    articles: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>',
  };

  function createPanel(config) {
    var panel = document.createElement("div");
    panel.className = "lba-panel lba-closed " + positionClass(config.widgetPosition);
    panel.setAttribute("aria-hidden", "true");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Chat");

    var primary = config.primaryColor || "#2563EB";
    var botName = config.botName || "Assistant";
    var welcomeMsg = config.welcomeMessage || "Hi! How can I help?";

    var header = document.createElement("div");
    header.className = "lba-panel-header";
    header.style.backgroundColor = primary;

    var title = document.createElement("span");
    title.className = "lba-panel-title";
    title.textContent = "Home";

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "lba-panel-close";
    closeBtn.setAttribute("aria-label", "Close chat");
    closeBtn.innerHTML = "&#10005;";

    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    var body = document.createElement("div");
    body.className = "lba-panel-body";

    var viewHome = document.createElement("div");
    viewHome.className = "lba-panel-view lba-active";
    viewHome.setAttribute("data-lba-view", "home");
    var homeInner = document.createElement("div");
    homeInner.className = "lba-home";
    homeInner.innerHTML =
      '<p class="lba-home-greeting">' + escapeHtml(welcomeMsg) + "</p>" +
      '<button type="button" class="lba-home-cta" data-lba-goto="conversation">' +
      '<span class="lba-home-cta-icon" style="background:' + primary + '">' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
      "</span>" +
      '<span class="lba-home-cta-text">Chat with us now</span>' +
      '<span class="lba-home-cta-arrow">&#8250;</span></button>' +
      '<p class="lba-home-section-title">To know about ' + escapeHtml(botName) + "</p>" +
      '<div class="lba-home-links">' +
      '<button type="button" class="lba-home-link" data-lba-goto="conversation"><span>Start a conversation</span><span class="lba-home-link-arrow">&#8250;</span></button>' +
      '<button type="button" class="lba-home-link" data-lba-goto="faqs"><span>Browse FAQs</span><span class="lba-home-link-arrow">&#8250;</span></button>' +
      '<button type="button" class="lba-home-link" data-lba-goto="articles"><span>Browse Articles</span><span class="lba-home-link-arrow">&#8250;</span></button>' +
      "</div>";
    viewHome.appendChild(homeInner);
    body.appendChild(viewHome);

    var viewConversation = document.createElement("div");
    viewConversation.className = "lba-panel-view";
    viewConversation.setAttribute("data-lba-view", "conversation");
    var messagesEl = document.createElement("div");
    messagesEl.className = "lba-messages";
    var welcomeDiv = document.createElement("div");
    welcomeDiv.className = "lba-msg lba-msg-bot lba-msg-welcome";
    welcomeDiv.textContent = welcomeMsg;
    messagesEl.appendChild(welcomeDiv);
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
    sendBtn.style.backgroundColor = primary;
    inputRow.appendChild(input);
    inputRow.appendChild(sendBtn);
    viewConversation.appendChild(messagesEl);
    viewConversation.appendChild(inputRow);
    body.appendChild(viewConversation);

    var viewFaqs = document.createElement("div");
    viewFaqs.className = "lba-panel-view";
    viewFaqs.setAttribute("data-lba-view", "faqs");
    viewFaqs.innerHTML =
      '<div class="lba-kb">' +
      '<div class="lba-kb-search"><input type="text" placeholder="Search for an FAQ" aria-label="Search FAQs"/></div>' +
      '<div class="lba-kb-list"></div>' +
      "</div>";
    body.appendChild(viewFaqs);

    var viewArticles = document.createElement("div");
    viewArticles.className = "lba-panel-view";
    viewArticles.setAttribute("data-lba-view", "articles");
    viewArticles.innerHTML =
      '<div class="lba-kb">' +
      '<div class="lba-kb-search"><input type="text" placeholder="Search for an article" aria-label="Search articles"/></div>' +
      '<div class="lba-kb-list"></div>' +
      "</div>";
    body.appendChild(viewArticles);

    panel.appendChild(body);

    var nav = document.createElement("nav");
    nav.className = "lba-nav";
    nav.setAttribute("aria-label", "Panel tabs");
    var tabs = [
      { id: "home", label: "Home", icon: NAV_ICONS.home },
      { id: "conversation", label: "Conversation", icon: NAV_ICONS.conversation },
      { id: "faqs", label: "FAQs", icon: NAV_ICONS.faqs },
      { id: "articles", label: "Articles", icon: NAV_ICONS.articles },
    ];
    tabs.forEach(function (t) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lba-nav-item" + (t.id === "home" ? " lba-nav-active" : "");
      btn.setAttribute("data-lba-tab", t.id);
      btn.setAttribute("aria-label", t.label);
      btn.innerHTML = '<span class="lba-nav-icon">' + t.icon + "</span><span>" + t.label + "</span>";
      nav.appendChild(btn);
    });
    panel.appendChild(nav);

    var footer = document.createElement("div");
    footer.className = "lba-footer";
    footer.innerHTML = '<a href="https://localbot.ai" target="_blank" rel="noopener">Powered by LocalBot AI</a>';
    panel.appendChild(footer);

    return {
      panel: panel,
      headerTitle: title,
      viewHome: viewHome,
      viewConversation: viewConversation,
      viewFaqs: viewFaqs,
      viewArticles: viewArticles,
      messagesEl: messagesEl,
      input: input,
      sendBtn: sendBtn,
      closeBtn: closeBtn,
      nav: nav,
    };
  }

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
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

  var TAB_TITLES = { home: "Home", conversation: "Conversation", faqs: "FAQs", articles: "Articles" };

  /**
   * Mount the widget UI and wire events. Called with config from cache or API.
   */
  function initWidget(config) {
    var primary = config.primaryColor || "#2563EB";
    document.documentElement.style.setProperty("--lba-primary", primary);

    var bubbleObj = createBubble(config);
    var bubble = bubbleObj.bubble;
    var setBubbleIconOpen = bubbleObj.setIconOpen;
    var ui = createPanel(config);
    var panel = ui.panel;
    var messagesEl = ui.messagesEl;
    var input = ui.input;
    var sendBtn = ui.sendBtn;

    var currentView = "home";
    var knowledgeLoaded = null;

    function switchView(viewId) {
      viewId = viewId || "home";
      currentView = viewId;
      ui.viewHome.classList.toggle("lba-active", viewId === "home");
      ui.viewConversation.classList.toggle("lba-active", viewId === "conversation");
      ui.viewFaqs.classList.toggle("lba-active", viewId === "faqs");
      ui.viewArticles.classList.toggle("lba-active", viewId === "articles");
      ui.headerTitle.textContent = TAB_TITLES[viewId] || viewId;
      ui.nav.querySelectorAll(".lba-nav-item").forEach(function (btn) {
        btn.classList.toggle("lba-nav-active", btn.getAttribute("data-lba-tab") === viewId);
      });
      if (viewId === "conversation") input.focus();
      if ((viewId === "faqs" || viewId === "articles") && !knowledgeLoaded) fetchAndRenderKnowledge(viewId);
    }

    function fetchAndRenderKnowledge(viewId) {
      var listEl = (viewId === "faqs" ? ui.viewFaqs : ui.viewArticles).querySelector(".lba-kb-list");
      listEl.innerHTML = '<p class="lba-kb-empty">Loading…</p>';
      fetch(baseUrl + "/api/widget-config/" + encodeURIComponent(token.trim()) + "/knowledge")
        .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error("Failed to load")); })
        .then(function (data) {
          knowledgeLoaded = data.categories || [];
          renderKnowledgeList(listEl, knowledgeLoaded, viewId, primary, input, messagesEl, sendBtn, switchView, function (question) {
            switchView("conversation");
            input.value = question;
            input.focus();
            send();
          });
        })
        .catch(function () {
          listEl.innerHTML = '<p class="lba-kb-empty">Unable to load content. Try again later.</p>';
        });
    }

    function renderKnowledgeList(listEl, categories, viewId, primaryColor, inputEl, messagesEl, sendBtnEl, switchViewFn, onAskInChat) {
      listEl.innerHTML = "";
      var searchInput = listEl.closest(".lba-kb").querySelector(".lba-kb-search input");
      function filterItems() {
        var q = (searchInput && searchInput.value) ? searchInput.value.toLowerCase() : "";
        categories.forEach(function (cat) {
          var catEl = listEl.querySelector("[data-lba-cat-id=\"" + cat.id + "\"]");
          if (!catEl) return;
          var items = (cat.items || []).filter(function (it) {
            return !q || (it.question && it.question.toLowerCase().indexOf(q) >= 0) || (it.answer && it.answer.toLowerCase().indexOf(q) >= 0);
          });
          var itemsWrap = catEl.querySelector(".lba-kb-items");
          var itemList = catEl.querySelector(".lba-kb-item-list");
          if (!itemsWrap || !itemList) return;
          itemList.innerHTML = "";
          items.forEach(function (it) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "lba-kb-item";
            btn.textContent = (it.question || "").slice(0, 120) + (it.question && it.question.length > 120 ? "…" : "");
            btn.setAttribute("data-question", it.question || "");
            btn.setAttribute("data-answer", it.answer || "");
            itemList.appendChild(btn);
          });
          itemsWrap.style.display = items.length ? "block" : "none";
        });
      }
      if (searchInput) searchInput.addEventListener("input", filterItems);

      if (!categories.length) {
        listEl.innerHTML = '<p class="lba-kb-empty">No content in the knowledge base yet.</p>';
        return;
      }
      categories.forEach(function (cat) {
        var catDiv = document.createElement("div");
        catDiv.className = "lba-kb-category";
        catDiv.setAttribute("data-lba-cat-id", cat.id);
        var items = cat.items || [];
        var head = document.createElement("button");
        head.type = "button";
        head.className = "lba-kb-cat-head";
        head.innerHTML =
          "<span>" + escapeHtml(cat.name || "Category") + "</span>" +
          "<span class=\"lba-kb-cat-count\">" + (items.length) + " " + (viewId === "articles" ? "Articles" : "FAQs") + "</span>" +
          "<span class=\"lba-kb-cat-arrow\">&#8250;</span>";
        var itemsWrap = document.createElement("div");
        itemsWrap.className = "lba-kb-items";
        var itemList = document.createElement("div");
        itemList.className = "lba-kb-item-list";
        items.forEach(function (it) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "lba-kb-item";
          btn.textContent = (it.question || "").slice(0, 120) + (it.question && it.question.length > 120 ? "…" : "");
          btn.setAttribute("data-question", it.question || "");
          btn.setAttribute("data-answer", it.answer || "");
          itemList.appendChild(btn);
        });
        itemsWrap.appendChild(itemList);
        catDiv.appendChild(head);
        catDiv.appendChild(itemsWrap);
        head.addEventListener("click", function () {
          catDiv.classList.toggle("lba-kb-cat-open");
        });
        itemList.addEventListener("click", function (e) {
          var btn = e.target.closest(".lba-kb-item");
          if (!btn) return;
          var question = btn.getAttribute("data-question") || "";
          var answer = btn.getAttribute("data-answer") || "";
          var existing = btn.nextElementSibling;
          if (existing && existing.classList.contains("lba-kb-answer")) {
            existing.style.display = existing.style.display === "none" ? "block" : "none";
            return;
          }
          var ansDiv = document.createElement("div");
          ansDiv.className = "lba-kb-answer";
          ansDiv.style.display = "block";
          ansDiv.textContent = answer || "No answer.";
          btn.parentNode.insertBefore(ansDiv, btn.nextSibling);
          if (question && onAskInChat) {
            var askBtn = document.createElement("button");
            askBtn.type = "button";
            askBtn.className = "lba-kb-item";
            askBtn.style.marginTop = "4px";
            askBtn.textContent = "Ask this in chat →";
            askBtn.addEventListener("click", function () {
              onAskInChat(question);
            });
            ansDiv.parentNode.insertBefore(askBtn, ansDiv.nextSibling);
          }
        });
        listEl.appendChild(catDiv);
      });
    }

    ui.viewHome.addEventListener("click", function (e) {
      var goto = e.target.closest("[data-lba-goto]");
      if (goto) switchView(goto.getAttribute("data-lba-goto"));
    });

    ui.nav.querySelectorAll(".lba-nav-item").forEach(function (btn) {
      btn.addEventListener("click", function () {
        switchView(btn.getAttribute("data-lba-tab"));
      });
    });

    function openChat() {
      panel.classList.remove("lba-closed");
      panel.setAttribute("aria-hidden", "false");
      setBubbleIconOpen(true);
      switchView("home");
    }

    function closeChat() {
      panel.classList.add("lba-closed");
      panel.setAttribute("aria-hidden", "true");
      setBubbleIconOpen(false);
    }

    var welcome = null;
    welcome = createWelcomeBubble(config, null, openChat);
    document.body.appendChild(welcome.wrap);
    setTimeout(function () {
      if (welcome && welcome.wrap.parentNode) welcome.show();
    }, WELCOME_SHOW_DELAY_MS);

    bubble.addEventListener("click", function () {
      if (panel.classList.contains("lba-closed")) {
        if (welcome) welcome.hide();
        openChat();
      } else {
        closeChat();
      }
    });

    ui.closeBtn.addEventListener("click", function () {
      closeChat();
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
    if (welcome) {
      document.body.insertBefore(welcome.wrap, bubble);
    }
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
