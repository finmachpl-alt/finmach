/* ═══════════════════════════════════════════════════
   FINMACH — Finn Chat Widget v3
   Powered by Cloudflare Worker (klucz API ukryty)
   ═══════════════════════════════════════════════════ */

(function () {
  'use strict';

  // URL Twojego Cloudflare Workera — podmień po wdrożeniu
  const FINN_WORKER_URL = 'https://finn.finmachpl.workers.dev';

  let isOpen        = false;
  let isLoading     = false;
  let history       = [];
  let dotHidden     = false;
  let greetingShown = false;

  const INITIAL_CHIPS = [
    'Jak to działa?',
    'Faktoring dla JDG',
    'Mam zakończoną restrukturyzację',
    'Jaki jest koszt?',
    'Faktoring cichy',
    'Firma 6 miesięcy — mam szansę?',
  ];

  function buildWidget () {
    const btn = document.createElement('button');
    btn.id = 'finn-btn';
    btn.setAttribute('aria-label', 'Otwórz czat z Finn');
    btn.innerHTML = `
      <span class="finn-dot"></span>
      <svg class="finn-chat-icon" viewBox="0 0 24 24">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <svg class="finn-close-icon" viewBox="0 0 24 24">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>`;
    btn.addEventListener('click', toggleFinn);

    const win = document.createElement('div');
    win.id = 'finn-window';
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-label', 'Czat z asystentem Finn');
    win.innerHTML = `
      <div class="finn-header">
        <div class="finn-avatar">FIN</div>
        <div class="finn-header-info">
          <div class="finn-header-name">Finn · Asystent FINMACH</div>
          <div class="finn-header-status">Online · odpowiada natychmiast</div>
        </div>
      </div>
      <div class="finn-messages" id="finn-messages"></div>
      <div class="finn-chips" id="finn-chips"></div>
      <div class="finn-input-row">
        <textarea class="finn-input" id="finn-input"
          placeholder="Zadaj pytanie…"
          rows="1"
          aria-label="Wpisz wiadomość"></textarea>
        <button class="finn-send" id="finn-send" aria-label="Wyślij">
          <svg viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
      <div class="finn-gdpr">Nie przechowujemy danych osobowych z czatu.</div>`;

    document.body.appendChild(btn);
    document.body.appendChild(win);

    document.getElementById('finn-send').addEventListener('click', sendMessage);
    document.getElementById('finn-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    document.getElementById('finn-input').addEventListener('input', autoResize);

    setTimeout(() => {
      if (!isOpen) showGreeting();
    }, 4000);
  }

  function toggleFinn () {
    isOpen = !isOpen;
    const btn = document.getElementById('finn-btn');
    const win = document.getElementById('finn-window');
    btn.classList.toggle('open', isOpen);
    win.classList.toggle('open', isOpen);

    if (isOpen && !dotHidden) {
      const dot = btn.querySelector('.finn-dot');
      if (dot) dot.style.display = 'none';
      dotHidden = true;
      if (!greetingShown) showGreeting();
      setTimeout(() => document.getElementById('finn-input')?.focus(), 300);
    }
    scrollToBottom();
  }

  function showGreeting () {
    if (greetingShown) return;
    greetingShown = true;
    addBotMsg('Cześć! Jestem Finn, asystent FINMACH 👋\n\nPomagam firmom znaleźć dopasowane finansowanie — faktoring, pożyczki, mikrofaktoring. Masz pytanie?');
    renderChips(INITIAL_CHIPS);
  }

  function addBotMsg (text) {
    const msgs = document.getElementById('finn-messages');
    if (!msgs) return;
    const div = document.createElement('div');
    div.className = 'finn-msg finn-msg-bot';
    div.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
    msgs.appendChild(div);
    scrollToBottom();
  }

  function addUserMsg (text) {
    const msgs = document.getElementById('finn-messages');
    if (!msgs) return;
    const div = document.createElement('div');
    div.className = 'finn-msg finn-msg-user';
    div.textContent = text;
    msgs.appendChild(div);
    scrollToBottom();
  }

  function showTyping () {
    const msgs = document.getElementById('finn-messages');
    if (!msgs) return;
    const div = document.createElement('div');
    div.className = 'finn-typing';
    div.id = 'finn-typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(div);
    scrollToBottom();
  }

  function hideTyping () {
    document.getElementById('finn-typing')?.remove();
  }

  function renderChips (chips) {
    const container = document.getElementById('finn-chips');
    if (!container) return;
    container.innerHTML = '';
    chips.forEach(text => {
      const btn = document.createElement('button');
      btn.className = 'finn-chip';
      btn.textContent = text;
      btn.addEventListener('click', () => {
        container.innerHTML = '';
        handleUserInput(text);
      });
      container.appendChild(btn);
    });
  }

  function sendMessage () {
    const input = document.getElementById('finn-input');
    const text  = input?.value.trim();
    if (!text || isLoading) return;
    input.value = '';
    autoResize.call(input);
    document.getElementById('finn-chips').innerHTML = '';
    handleUserInput(text);
  }

  async function handleUserInput (text) {
    if (isLoading) return;
    addUserMsg(text);
    history.push({ role: 'user', content: text });

    isLoading = true;
    setSendDisabled(true);
    showTyping();

    try {
      const reply = await callWorker(history);
      hideTyping();
      addBotMsg(reply);
      history.push({ role: 'assistant', content: reply });

      const lower = text.toLowerCase();
      if (lower.match(/faktoring|finansow|pożyczk|limit|zaliczk/)) {
        renderChips(['Sprawdź mój profil →', 'Powiedz więcej', 'Ile to trwa?']);
      }
    } catch (err) {
      hideTyping();
      addBotMsg('Przepraszam, coś poszło nie tak. Spróbuj za chwilę lub napisz na kontakt@finmach.pl');
      console.error('Finn error:', err);
    } finally {
      isLoading = false;
      setSendDisabled(false);
    }
  }

  async function callWorker (messages) {
    const response = await fetch(FINN_WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.reply || 'Brak odpowiedzi.';
  }

  function scrollToBottom () {
    const msgs = document.getElementById('finn-messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }

  function setSendDisabled (val) {
    const btn = document.getElementById('finn-send');
    if (btn) btn.disabled = val;
  }

  function autoResize () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 80) + 'px';
  }

  function escapeHtml (str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildWidget);
  } else {
    buildWidget();
  }

})();
