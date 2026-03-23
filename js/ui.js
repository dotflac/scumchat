/**
 * UI Renderer
 * Handles all DOM manipulation, reacting to state changes.
 */

class UI {
  constructor(store, client) {
    this.store = store;
    this.client = client;
    this.setupElements();
    this.bindEvents();
    
    // Subscribe to store updates
    this.store.subscribe(this.render.bind(this));
    
    // Initial render
    this.render(this.store.getState(), {}, { type: 'INIT' });
  }

  setupElements() {
    this.elements = {
      connectModal: document.getElementById('connect-modal'),
      inputHost: document.getElementById('input-host'),
      inputPort: document.getElementById('input-port'),
      inputEncryption: document.getElementById('input-encryption'),
      inputPassword: document.getElementById('input-password'),
      btnConnect: document.getElementById('btn-connect'),
      btnReconnect: document.getElementById('btn-reconnect'),
      
      bufferList: document.getElementById('buffer-list'),
      bufferCount: document.getElementById('buffer-count'),
      
      headerTitle: document.getElementById('header-title'),
      headerTopic: document.getElementById('header-topic'),
      
      chatMessages: document.getElementById('chat-messages'),
      inputPrompt: document.getElementById('input-prompt'),
      chatInput: document.getElementById('chat-input'),
      
      nickList: document.getElementById('nick-list'),
      nickCount: document.getElementById('nick-count'),
      connectError: document.getElementById('connect-error'),
      
      statusTime: document.getElementById('status-time'),
      statusLag: document.getElementById('status-lag'),
      statusNick: document.getElementById('status-nick'),
      statusActive: document.getElementById('status-active'),
      statusVersion: document.getElementById('status-version')
    };
  }

  bindEvents() {
    this.elements.btnConnect.addEventListener('click', () => {
      const host = this.elements.inputHost.value;
      const port = this.elements.inputPort.value;
      const useSSL = this.elements.inputEncryption.checked;
      const pass = this.elements.inputPassword.value;
      this.client.connect(host, port, useSSL, pass);
    });

    this.elements.btnReconnect.addEventListener('click', () => {
      this.store.dispatch({ type: 'CONNECTION_STATUS', payload: 'disconnected' });
    });

    this.elements.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const text = e.target.value.trim();
        if (text) {
          const state = this.store.getState();
          if (state.activeBuffer) {
            this.client.send(`input ${state.activeBuffer} ${text}`);
            e.target.value = '';
          }
        }
      }
    });

    // Update time every minute
    setInterval(() => {
      const now = new Date();
      this.elements.statusTime.textContent = `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}]`;
    }, 60000);
    // Init time
    const now = new Date();
    this.elements.statusTime.textContent = `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}]`;
  }

  formatTime(date) {
    if (!date) return '00:00:00';
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  }

  /**
   * WeeChat Basic 16 Color Mapping (Tokyo Night Inspired)
   */
  WEECHAT_COLORS = {
    "00": "#c0caf5", // default
    "01": "#1a1b26", // black
    "02": "#414868", // dark gray
    "03": "#f7768e", // dark red
    "04": "#ff9e64", // red
    "05": "#9ece6a", // dark green
    "06": "#b9f27c", // green
    "07": "#e0af68", // brown
    "08": "#ffc777", // yellow
    "09": "#7aa2f7", // dark blue
    "10": "#89ddff", // blue
    "11": "#bb9af7", // dark magenta
    "12": "#c099ff", // magenta
    "13": "#2ac3de", // dark cyan
    "14": "#7dcfff", // cyan
    "15": "#c0caf5", // gray
    "16": "#ffffff"  // white
  };

  /**
   * Parses WeeChat internal color codes into styled HTML spans
   */
  parseColors(input) {
    if (!input) return '';
    let result = '';
    let currentStyle = { fg: null, bg: null, bold: false, underline: false, italic: false };
    
    let i = 0;
    
    const applyStyle = (text) => {
      if (!text) return '';
      let styleStr = '';
      if (currentStyle.fg) {
        if (currentStyle.fg.startsWith('@')) {
           const cNum = parseInt(currentStyle.fg.substring(1), 10);
           styleStr += `color: hsl(${cNum % 360}, 70%, 65%); `;
        } else {
           styleStr += `color: ${this.WEECHAT_COLORS[currentStyle.fg] || 'inherit'}; `;
        }
      }
      if (currentStyle.bg) {
        if (!currentStyle.bg.startsWith('@')) {
          styleStr += `background-color: ${this.WEECHAT_COLORS[currentStyle.bg] || 'transparent'}; `;
        }
      }
      if (currentStyle.bold) styleStr += 'font-weight: bold; ';
      if (currentStyle.underline) styleStr += 'text-decoration: underline; ';
      if (currentStyle.italic) styleStr += 'font-style: italic; ';
      
      if (styleStr) {
        const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<span style="${styleStr}">${escaped}</span>`;
      }
      return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };

    let lastTextStart = 0;

    const parseColorBlock = () => {
      let attrs = "";
      while (i < input.length && "*!_/%|.".includes(input[i])) {
        attrs += input[i++];
      }
      let color = "";
      
      // WeeChat extended colors start with @ and have exactly 5 digits.
      // E.g., @00186
      // If we see an @ but it's not followed by 5 digits, it's just a text character (like an Op prefix).
      if (input[i] === '@' && i + 5 < input.length && /^\d{5}$/.test(input.substring(i + 1, i + 6))) {
        color = input.substring(i, i + 6);
        i += 6;
      } 
      // Same for F@ and B@
      else if ((input[i] === 'F' || input[i] === 'B') && input[i+1] === '@' && i + 6 < input.length && /^\d{5}$/.test(input.substring(i + 2, i + 7))) {
        color = input.substring(i+1, i + 7); // Strip the F/B, keep the @
        i += 7;
      }
      else if (/[fbFB]/.test(input[i]) && i + 2 < input.length && /^\d{2}$/.test(input.substring(i + 1, i + 3))) {
         i++;
         color = input.substring(i, i + 2);
         i += 2;
      } else if (i + 1 < input.length && /^\d{2}$/.test(input.substring(i, i + 2))) {
        color = input.substring(i, i + 2);
        i += 2;
      } else if (i < input.length && /^\d$/.test(input[i])) {
        // Single digit color
        color = '0' + input[i];
        i += 1;
      }
      return { color, attrs };
    };

    while (i < input.length) {
      const charCode = input.charCodeAt(i);
      
      if ([0x19, 0x1A, 0x1B, 0x1C].includes(charCode)) {
        result += applyStyle(input.substring(lastTextStart, i));
        i++; 
        
        if (charCode === 0x19) {
          const fg = parseColorBlock();
          if (fg.color && fg.color !== '00') currentStyle.fg = fg.color;
          if (fg.attrs.includes('*')) currentStyle.bold = true;
          if (fg.attrs.includes('_')) currentStyle.underline = true;
          
          if (input[i] === ',' || input[i] === '~') {
            i++;
            const bg = parseColorBlock();
            if (bg.color && bg.color !== '00') currentStyle.bg = bg.color;
          }
        } 
        else if (charCode === 0x1A) { 
          const attr = input.charCodeAt(i++);
          if (attr === 0x01) currentStyle.bold = true;
          if (attr === 0x04) currentStyle.underline = true;
        }
        else if (charCode === 0x1B) { 
          const attr = input.charCodeAt(i++);
          if (attr === 0x01) currentStyle.bold = false;
          if (attr === 0x04) currentStyle.underline = false;
        }
        else if (charCode === 0x1C) { 
          currentStyle = { fg: null, bg: null, bold: false, underline: false, italic: false };
        }
        lastTextStart = i;
      } else {
        i++;
      }
    }
    
    result += applyStyle(input.substring(lastTextStart, i));
    return result;
  }

  /**
   * Helper to strip colors if we only want raw text (e.g. for nick hashing)
   */
  stripColors(str) {
    if (!str) return '';
    // A simpler, more robust way to strip all WeeChat formatting:
    // Strip anything starting with 0x19 up to the next valid text char,
    let stripped = str.replace(/\x19(?:[FB]@\d{5}|@\d{5}|[fFbB]\d{2}|\d{2}|\d|[bc*|_!+#-]|E|f.)/g, '');
    // Catch any remaining \x19 that had malformed following characters
    stripped = stripped.replace(/\x19./g, '');
    return stripped.replace(/[\x1A\x1B]./g, '').replace(/\x1C/g, '').replace(/\x19/g, '');
  }

  render(state, prevState, action) {
    // 1. Connection Modal & Error
    if (state.connection.status === 'connected') {
      this.elements.connectModal.classList.add('hidden');
    } else if (state.connection.status === 'disconnected') {
      this.elements.connectModal.classList.remove('hidden');
    }

    if (state.connection.error) {
      this.elements.connectError.textContent = state.connection.error;
      this.elements.connectError.classList.remove('hidden');
    } else {
      this.elements.connectError.classList.add('hidden');
    }

    // 2. Status Bar
    if (state.connection.status === 'connected') {
      this.elements.statusVersion.textContent = `SCUMCHAT ${state.connection.version || ''}`;
      this.elements.statusLag.textContent = 'CONNECTED';
      this.elements.statusNick.textContent = `nick: ${state.connection.nick || '--'}`;
      this.elements.inputPrompt.textContent = `<${state.connection.nick || ''}>`;
    } else {
      this.elements.statusLag.textContent = state.connection.status.toUpperCase();
    }

    // Optimize renders
    if (action.type === 'INIT' || action.type === 'SET_BUFFERS' || action.type === 'SET_ACTIVE_BUFFER') {
      this.renderBufferList(state.buffers, state.activeBuffer);
      this.renderHeader(state.buffers, state.activeBuffer);
    }

    if (action.type === 'INIT' || action.type === 'SET_ACTIVE_BUFFER' || action.type === 'ADD_LINES') {
      if (action.type !== 'ADD_LINES' || action.payload.bufferPointer === state.activeBuffer) {
        this.renderChatMessages(state.lines[state.activeBuffer] || []);
      }
    }

    if (action.type === 'INIT' || action.type === 'SET_ACTIVE_BUFFER' || action.type === 'SET_NICKS') {
      if (action.type !== 'SET_NICKS' || action.payload.bufferPointer === state.activeBuffer) {
        this.renderNickList(state.nicks[state.activeBuffer] || []);
      }
    }
  }

  renderNickList(nicks) {
    const actualNicks = nicks.filter(n => n.name && n.group == 0);
    
    const nickListAside = this.elements.nickList.parentElement;
    if (actualNicks.length === 0) {
      nickListAside.classList.add('hidden');
    } else {
      nickListAside.classList.remove('hidden');
    }
    
    this.elements.nickCount.textContent = `Users: ${actualNicks.length}`;
    this.elements.nickList.innerHTML = '';

    const prefixWeights = { '~': 1, '&': 2, '@': 3, '%': 4, '+': 5 };
    const getWeight = (p) => {
      const clean = this.stripColors(p).trim();
      return prefixWeights[clean[0]] || 10;
    };

    actualNicks.sort((a, b) => {
      const weightA = getWeight(a.prefix);
      const weightB = getWeight(b.prefix);
      if (weightA !== weightB) return weightA - weightB;
      return a.name.localeCompare(b.name);
    }).forEach(nick => {
      const el = document.createElement('div');
      el.className = "flex items-center gap-2 text-on-surface-variant px-2 py-1 hover:bg-surface-bright transition-colors cursor-default";
      
      const parsedPrefix = this.parseColors(nick.prefix) || '&nbsp;';
      const parsedName = this.parseColors(nick.name);
      
      el.innerHTML = `
        <span class="text-[10px] w-3 font-bold text-secondary">${parsedPrefix}</span>
        <span class="truncate">${parsedName}</span>
      `;
      this.elements.nickList.appendChild(el);
    });
  }

  renderBufferList(buffers, activePointer) {
    this.elements.bufferCount.textContent = `${buffers.length} ACTIVE`;
    this.elements.bufferList.innerHTML = '';

    buffers.forEach(buf => {
      const isActive = buf.pointer === activePointer;
      const el = document.createElement('div');
      
      let icon = 'tag';
      if (buf.full_name.startsWith('core.')) icon = 'settings';
      else if (buf.type === 'private') icon = 'person';
      else if (buf.type === 'server') icon = 'terminal';

      if (isActive) {
        el.className = "bg-[#282a41] text-[#cdb1ff] border-l-4 border-[#cdb1ff] flex items-center px-4 py-2 transition-all duration-100 ease-in-out cursor-pointer font-['Space_Grotesk'] tracking-tighter text-xs font-medium";
      } else {
        el.className = "text-[#a8a9c3] flex items-center px-4 py-2 hover:bg-[#171827] transition-all duration-100 ease-in-out cursor-pointer font-['Space_Grotesk'] tracking-tighter text-xs font-medium border-l-4 border-transparent";
      }

      el.innerHTML = `
        <span class="material-symbols-outlined mr-3 text-sm">${icon}</span>
        <span class="truncate">${buf.short_name || buf.full_name}</span>
      `;

      el.addEventListener('click', () => {
        this.store.dispatch({ type: 'SET_ACTIVE_BUFFER', payload: buf.pointer });
      });

      this.elements.bufferList.appendChild(el);
    });
  }

  renderHeader(buffers, activePointer) {
    const buf = buffers.find(b => b.pointer === activePointer);
    if (!buf) return;

    this.elements.headerTitle.textContent = buf.short_name || buf.full_name;
    
    // Hide the type tag to match the clean design
    const typeTag = document.getElementById('header-type');
    if (typeTag) typeTag.classList.add('hidden');

    this.elements.headerTopic.innerHTML = `${buf.title || 'No topic set.'}`;
    this.elements.statusActive.textContent = buf.full_name;
  }

  renderChatMessages(lines) {
    const isScrolledToBottom = this.elements.chatMessages.scrollHeight - this.elements.chatMessages.clientHeight <= this.elements.chatMessages.scrollTop + 10;
    
    this.elements.chatMessages.innerHTML = '';
    
    lines.forEach(line => {
      const el = document.createElement('div');
      
      const timeStr = this.formatTime(line.date);
      const fullPrefix = this.stripColors(line.prefix);
      const parsedPrefix = this.parseColors(line.prefix);
      const parsedMsg = this.parseColors(line.message);
      
      const tags = line.tags || [];
      const isSystem = tags.includes('irc_notice') || tags.includes('irc_join') || 
                       tags.includes('irc_quit') || tags.includes('irc_part') || 
                       tags.includes('irc_topic') || tags.includes('irc_mode') ||
                       fullPrefix === '--' || fullPrefix === '-->' || fullPrefix === '<--' || 
                       fullPrefix === '' || fullPrefix === '*';

      if (isSystem) {
        el.className = "flex gap-4 mb-1 items-start group";
        
        let icon = 'info';
        if (fullPrefix === '-->') icon = 'login';
        else if (fullPrefix === '<--') icon = 'logout';
        else if (tags.includes('irc_topic')) icon = 'sync';
        else if (tags.includes('irc_mode')) icon = 'shield';

        el.innerHTML = `
          <span class="text-on-surface-variant/40 shrink-0 mt-1 font-mono text-[11px]">${timeStr}</span>
          <div class="flex-1 bg-surface-variant/30 border-l-2 border-primary/40 px-3 py-1 rounded-sm">
            <span class="text-primary font-bold text-[10px] tracking-widest uppercase mr-2">
              <span class="material-symbols-outlined text-sm" style="font-size: 14px">${icon}</span>
            </span>
            <span class="text-on-surface-variant italic">${parsedMsg}</span>
          </div>
        `;
      } else {
        el.className = "flex gap-4 mb-0.5";
        // Use parsed prefix which already contains WeeChat's native colors for nick/mode
        el.innerHTML = `
          <span class="text-on-surface-variant/70 shrink-0 font-mono text-[11px]">${timeStr}</span>
          <span class="shrink-0 min-w-[100px] text-right font-bold truncate">${parsedPrefix}</span>
          <span class="text-on-surface break-words whitespace-pre-wrap flex-1">${parsedMsg}</span>
        `;
      }
      this.elements.chatMessages.appendChild(el);
    });

    if (isScrolledToBottom || lines.length > 0) {
      this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
    }
  }
}

window.UI = UI;
