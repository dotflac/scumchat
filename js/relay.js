/**
 * WeeChat Relay Client
 * Manages the WebSocket connection to the WeeChat relay and interfaces with the store.
 */

class RelayClient {
  constructor(store) {
    this.store = store;
    this.ws = null;
    this.msgId = 0;
    this.callbacks = {};
  }

  connect(host, port, useSSL, password) {
    this.store.dispatch({ type: 'CONNECTION_STATUS', payload: 'connecting' });
    this.store.dispatch({ type: 'CONNECTION_ERROR', payload: null });
    
    const protocol = useSSL ? 'wss://' : 'ws://';
    let url = `${protocol}${host}:${port}/weechat`;
    
    try {
      this.ws = new WebSocket(url);
      this.ws.binaryType = 'arraybuffer';
    } catch (e) {
      console.error("WebSocket setup failed:", e);
      this.store.dispatch({ type: 'CONNECTION_ERROR', payload: e.message });
      return;
    }

    this.ws.onopen = () => {
      this.store.dispatch({ type: 'CONNECTION_STATUS', payload: 'connected' });
      this.store.dispatch({ type: 'CONNECTION_INFO', payload: { host: `${host}:${port}` } });
      
      // Standard WeeChat relay handshake
      this.send(`init password=${password},compression=off`, 'init');
      this.send('info version', 'version');
      this.send('info nick', 'nick');
      this.send('hdata config_file:weechat/option:weechat.look.nick value', 'nick_fallback');
      
      // Sync everything: buffers, lines, and nicklist
      this.send('sync *');
      
      // Initial fetch of buffers and their history
      this.send('hdata buffer:gui_buffers(*) number,full_name,short_name,type,title,local_variables,nicklist_root', 'buffers');
    };

    this.ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        const protocol = new window.WeechatProtocol(event.data);
        const parsed = protocol.parse();
        if (parsed) {
          // Log all inbound IDs to catch any missed sync events
          if (parsed.id.startsWith('_')) {
            console.log("Sync Event:", parsed.id, parsed);
          }
          this.handleMessage(parsed);
        }
      }
    };

    this.ws.onclose = (event) => {
      if (!event.wasClean) {
        this.store.dispatch({ 
          type: 'CONNECTION_ERROR', 
          payload: `Disconnected: ${event.code} ${event.reason || 'Connection failed'}.` 
        });
      }
      this.store.dispatch({ type: 'CONNECTION_STATUS', payload: 'disconnected' });
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket Error:", error);
      this.store.dispatch({ 
        type: 'CONNECTION_ERROR', 
        payload: "Network Error: Could not reach the relay." 
      });
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }

  send(command, id = '') {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    let payload;
    const cmdBase = command.split(' ')[0];
    // Commands that must NOT have an ID prefix
    if (id === 'init' || cmdBase === 'sync' || cmdBase === 'desync') {
      payload = `${command}\n`;
    } else {
      const msgId = id || `msg_${++this.msgId}`;
      payload = `(${msgId}) ${command}\n`;
    }
    
    console.log("Sending:", payload.trim());
    const encoder = new TextEncoder();
    this.ws.send(encoder.encode(payload));
  }

  handleMessage(parsed) {
    const { id, objects } = parsed;
    const cleanId = id.replace(/^\((.*)\)$/, '$1');
    
    if (cleanId === 'version') {
      const info = objects.find(o => o.type === 'info');
      if (info) this.store.dispatch({ type: 'CONNECTION_INFO', payload: { version: info.value } });
    } 
    else if (cleanId === 'nick') {
      const info = objects.find(o => o.type === 'info');
      if (info && info.value) this.store.dispatch({ type: 'CONNECTION_INFO', payload: { nick: info.value } });
    }
    else if (cleanId === 'nick_fallback') {
      const hdata = objects.find(o => o.type === 'hdata');
      if (hdata && hdata.items && hdata.items[0]) {
        this.store.dispatch({ type: 'CONNECTION_INFO', payload: { nick: hdata.items[0].value } });
      }
    }
    else if (cleanId === 'buffers') {
      const hdata = objects.find(o => o.type === 'hdata');
      if (hdata && hdata.hpath && hdata.hpath.includes('buffer')) {
        this.store.dispatch({ type: 'SET_BUFFERS', payload: hdata.items });
        
        // Fetch identity if still missing
        if (!this.store.getState().connection.nick) {
          const ircBuf = hdata.items.find(b => b.local_variables && b.local_variables.nick);
          if (ircBuf) this.store.dispatch({ type: 'CONNECTION_INFO', payload: { nick: ircBuf.local_variables.nick } });
        }

        hdata.items.forEach(buffer => {
          this.send(`hdata buffer:${buffer.pointer}/own_lines/last_line(-50)/data date,displayed,prefix,message,tags`, `lines_${buffer.pointer}`);
          this.send(`nicklist ${buffer.pointer}`, `nicks_${buffer.pointer}`);
        });
      }
    }
    else if (cleanId.startsWith('lines_')) {
      const bufferPointer = cleanId.split('_')[1];
      const hdata = objects.find(o => o.type === 'hdata');
      if (hdata && hdata.items) {
        this.store.dispatch({ type: 'ADD_LINES', payload: { bufferPointer, lines: hdata.items } });
      }
    }
    else if (cleanId.startsWith('nicks_')) {
      const bufferPointer = cleanId.split('_')[1];
      const inl = objects.find(o => o.type === 'infolist');
      const hdata = objects.find(o => o.type === 'hdata');
      const items = (inl && inl.items) || (hdata && hdata.items);
      if (items) {
        this.store.dispatch({ type: 'SET_NICKS', payload: { bufferPointer, nicks: items } });
      }
    }
    else if (cleanId === '_buffer_line_added') {
      const hdata = objects.find(o => o.type === 'hdata');
      if (hdata && hdata.items) {
        hdata.items.forEach(line => {
          // As seen in logs, sync events provide the buffer pointer directly in line.buffer
          const bufferPointer = line.buffer;
          if (bufferPointer) {
            this.store.dispatch({ type: 'ADD_LINES', payload: { bufferPointer, lines: [line] } });
          }
        });
      }
    }
    else if (cleanId === '_nicklist' || cleanId === '_nicklist_diff') {
      const hdata = objects.find(o => o.type === 'hdata');
      if (hdata && hdata.items) {
        hdata.items.forEach(item => {
          const bufferPointer = item.pointers[0];
          this.send(`nicklist ${bufferPointer}`, `nicks_${bufferPointer}`);
        });
      }
    }
  }
}

window.RelayClient = RelayClient;
