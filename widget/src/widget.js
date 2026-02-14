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

  var STORAGE_KEY = "lba-session-" + token.trim();
  var BUBBLE_OFFSET = 24;
  var PANEL_HEIGHT_PX = 420;
  var PANEL_WIDTH_PX = 380;
  var MOBILE_BREAKPOINT = 480;

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

  function injectStyles() {
    if (document.getElementById("lba-widget-styles")) return;
    var style = document.createElement("style");
    style.id = "lba-widget-styles";
    style.textContent =
      ".lba-bubble{position:fixed;width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.15);display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;transition:transform .2s,box-shadow .2s;z-index:2147483646}.lba-bubble:hover{transform:scale(1.05);box-shadow:0 6px 16px rgba(0,0,0,.2)}.lba-bubble:active{transform:scale(.98)}.lba-bubble.lba-pos-bottom-right{bottom:" +
      BUBBLE_OFFSET +
      "px;right:" +
      BUBBLE_OFFSET +
      "px}.lba-bubble.lba-pos-bottom-left{bottom:" +
      BUBBLE_OFFSET +
      "px;left:" +
      BUBBLE_OFFSET +
      "px}.lba-bubble.lba-pos-top-right{top:" +
      BUBBLE_OFFSET +
      "px;right:" +
      BUBBLE_OFFSET +
      "px}.lba-bubble.lba-pos-top-left{top:" +
      BUBBLE_OFFSET +
      "px;left:" +
      BUBBLE_OFFSET +
      "px}.lba-panel{position:fixed;background:#fff;border-radius:12px 12px 0 0;box-shadow:0 -4px 24px rgba(0,0,0,.12);display:flex;flex-direction:column;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;overflow:hidden;transition:transform .3s ease}.lba-panel.lba-closed{transform:translateY(100%)}.lba-panel.lba-pos-bottom-right,.lba-panel.lba-pos-bottom-left{bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:" +
      PANEL_WIDTH_PX +
      "px;height:" +
      PANEL_HEIGHT_PX +
      "px;max-height:85vh}.lba-panel.lba-closed.lba-pos-bottom-right,.lba-panel.lba-closed.lba-pos-bottom-left{transform:translate(-50%,100%)}.lba-panel.lba-pos-top-right,.lba-panel.lba-pos-top-left{top:0;left:50%;transform:translateX(-50%);width:100%;max-width:" +
      PANEL_WIDTH_PX +
      "px;height:" +
      PANEL_HEIGHT_PX +
      "px;max-height:85vh}.lba-panel.lba-closed.lba-pos-top-right,.lba-panel.lba-closed.lba-pos-top-left{transform:translate(-50%,-100%)}@media (max-width:" +
      MOBILE_BREAKPOINT +
      "px){.lba-panel{max-width:100%;border-radius:12px 12px 0 0}}.lba-panel-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--lba-primary,#0ea5e9);color:#fff;flex-shrink:0}.lba-panel-title{font-weight:600;font-size:16px}.lba-panel-close{background:transparent;border:none;color:inherit;cursor:pointer;padding:4px;line-height:1;opacity:.9}.lba-panel-close:hover{opacity:1}.lba-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;background:#f8fafc}.lba-msg{max-width:85%;padding:10px 14px;border-radius:12px;font-size:14px;line-height:1.5;word-wrap:break-word}.lba-msg-user{align-self:flex-end;background:var(--lba-primary,#0ea5e9);color:#fff;border-bottom-right-radius:4px}.lba-msg-bot{align-self:flex-start;background:#fff;color:#1e293b;border:1px solid #e2e8f0;border-bottom-left-radius:4px}.lba-msg-welcome{align-self:flex-start}.lba-typing{display:flex;gap:4px;padding:10px 14px;align-self:flex-start}.lba-typing span{width:8px;height:8px;border-radius:50%;background:#94a3b8;animation:lba-bounce 1.4s ease-in-out infinite both}.lba-typing span:nth-child(1){animation-delay:-.32s}.lba-typing span:nth-child(2){animation-delay:-.16s}@keyframes lba-bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}.lba-input-row{display:flex;gap:8px;padding:12px 16px;background:#fff;border-top:1px solid #e2e8f0;flex-shrink:0}.lba-input{flex:1;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:inherit}.lba-input:focus{outline:none;border-color:var(--lba-primary,#0ea5e9)}.lba-send{padding:10px 16px;background:var(--lba-primary,#0ea5e9);color:#fff;border:none;border-radius:8px;font-weight:500;cursor:pointer;flex-shrink:0}.lba-send:hover{opacity:.95}.lba-send:disabled{opacity:.6;cursor:not-allowed}.lba-footer{padding:8px 16px;text-align:center;flex-shrink:0;background:#f1f5f9;border-top:1px solid #e2e8f0}.lba-footer a{font-size:12px;color:#64748b;text-decoration:none}.lba-footer a:hover{text-decoration:underline}";
    document.head.appendChild(style);
  }

  function positionClass(pos) {
    var p = (pos || "bottom-right").toLowerCase();
    if (p === "bottom-left") return "lba-pos-bottom-left";
    if (p === "top-right") return "lba-pos-top-right";
    if (p === "top-left") return "lba-pos-top-left";
    return "lba-pos-bottom-right";
  }

  function createBubble(config) {
    var bubble = document.createElement("button");
    bubble.type = "button";
    bubble.className = "lba-bubble " + positionClass(config.widgetPosition);
    bubble.setAttribute("aria-label", "Open chat");
    bubble.style.backgroundColor = config.primaryColor || "#0ea5e9";
    bubble.innerHTML = "&#128172;";
    return bubble;
  }

  function createPanel(config) {
    var panel = document.createElement("div");
    panel.className = "lba-panel lba-closed " + positionClass(config.widgetPosition);
    panel.setAttribute("aria-hidden", "true");

    var header = document.createElement("div");
    header.className = "lba-panel-header";
    header.style.backgroundColor = config.primaryColor || "#0ea5e9";

    var title = document.createElement("span");
    title.className = "lba-panel-title";
    title.textContent = config.botName || "Assistant";

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "lba-panel-close";
    closeBtn.setAttribute("aria-label", "Close");
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

    var sendBtn = document.createElement("button");
    sendBtn.type = "button";
    sendBtn.className = "lba-send";
    sendBtn.textContent = "Send";
    sendBtn.style.backgroundColor = config.primaryColor || "#0ea5e9";

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
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping(messagesEl) {
    var wrap = document.createElement("div");
    wrap.className = "lba-typing";
    wrap.innerHTML = "<span></span><span></span><span></span>";
    wrap.setAttribute("data-lba-typing", "1");
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return wrap;
  }

  function hideTyping(messagesEl) {
    var el = messagesEl.querySelector("[data-lba-typing]");
    if (el) el.remove();
  }

  function run() {
    injectStyles();

    fetch(baseUrl + "/api/widget-config/" + encodeURIComponent(token.trim()))
      .then(function (res) {
        if (!res.ok) throw new Error("Config failed " + res.status);
        return res.json();
      })
      .then(function (config) {
        document.documentElement.style.setProperty("--lba-primary", config.primaryColor || "#0ea5e9");

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
            .catch(function (err) {
              hideTyping(messagesEl);
              addMessage(messagesEl, "Sorry, something went wrong. Please try again.", false);
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
