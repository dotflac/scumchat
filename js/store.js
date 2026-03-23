/**
 * Reactive State Store
 * Manages the central application state using a simple pub/sub pattern.
 */

class Store {
  constructor() {
    this.state = {
      connection: {
        status: 'disconnected', // disconnected, connecting, connected
        host: '',
        latency: 0,
        version: '',
        error: null
      },
      buffers: [], // Array of buffer objects
      lines: {},   // Map of buffer pointer -> array of line objects
      nicks: {},   // Map of buffer pointer -> array of nick objects
      activeBuffer: null // Pointer to the currently active buffer
    };
    this.listeners = [];
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  dispatch(action) {
    const prevState = this.state;
    this.state = this.reducer(this.state, action);
    
    // Simple notification; could be optimized to pass action details
    this.listeners.forEach(listener => listener(this.state, prevState, action));
  }

  reducer(state, action) {
    switch (action.type) {
      case 'CONNECTION_STATUS':
        return {
          ...state,
          connection: { ...state.connection, status: action.payload }
        };
      
      case 'CONNECTION_INFO':
        return {
          ...state,
          connection: { ...state.connection, ...action.payload }
        };

      case 'CONNECTION_ERROR':
        return {
          ...state,
          connection: { ...state.connection, error: action.payload, status: 'disconnected' }
        };

      case 'SET_BUFFERS':
        return {
          ...state,
          buffers: action.payload,
          // Auto-select first buffer if none active
          activeBuffer: state.activeBuffer || (action.payload[0] ? action.payload[0].pointer : null)
        };

      case 'ADD_BUFFER':
        return {
          ...state,
          buffers: [...state.buffers, action.payload]
        };

      case 'SET_ACTIVE_BUFFER':
        return {
          ...state,
          activeBuffer: action.payload
        };

      case 'ADD_LINES': {
        const { bufferPointer, lines } = action.payload;
        const existingLines = state.lines[bufferPointer] || [];
        
        // Combine and sort by date
        const combined = [...existingLines, ...lines];
        combined.sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0));
        
        // Keep last 1000 lines
        const newLines = combined.slice(-1000);
        return {
          ...state,
          lines: {
            ...state.lines,
            [bufferPointer]: newLines
          }
        };
      }

      case 'SET_NICKS': {
        const { bufferPointer, nicks } = action.payload;
        return {
          ...state,
          nicks: {
            ...state.nicks,
            [bufferPointer]: nicks
          }
        };
      }

      default:
        return state;
    }
  }
}

// Global singleton instance
window.store = new Store();
