# Implementation Plan: Weechat Web Client (Terminal Editorial)

## Background & Motivation
The goal is to build a high-end, structural web client for WeeChat's custom relay protocol. Drawing inspiration from "Glowing Bear", this client will use vanilla JavaScript to ensure a lightweight footprint. The design language is "Terminal Editorial", characterized by 0px border radii, deep charcoal foundations, pastel accents, dense typography, and an overarching "Digital Architect" aesthetic as outlined in the provided mockups.

## Scope & Impact
- **Pure Client-Side**: No backend required beyond the WeeChat relay itself.
- **Protocol**: Implementing the WeeChat binary relay protocol over WebSockets.
- **Architecture**: A Reactive State Store pattern to manage UI data predictably, avoiding tangled DOM manipulation.
- **UI & Styling**: Directly implementing the Tailwind configuration and HTML structures from the provided design files.

## Proposed Solution

The architecture will be split into four primary layers:
1. **Connection Layer (`relay.js`)**: Manages the WebSocket connection, authentication (`init`), and raw byte transmission.
2. **Protocol Parser (`protocol.js`)**: Decodes the binary data from WeeChat into structured JavaScript objects. It will handle the parsing of Weechat types (e.g., `hdata`, `infolist`, `pointer`, `time`, `array`).
3. **State Store (`store.js`)**: A lightweight pub/sub system holding the application state:
   - `buffers`: List of available channels/queries.
   - `lines`: Chat history per buffer.
   - `nicks`: User lists per buffer.
   - `activeBuffer`: The currently viewed buffer.
   - `connection`: Status, latency, version.
4. **UI Layer (`ui.js` & `app.js`)**: Subscribes to the State Store and updates the DOM using the "Terminal Editorial" HTML templates. It will handle rendering, scrolling, and user inputs.

## Implementation Steps

### Phase 0: Project Documentation & Agent Setup
1. Create a `plan/` directory in the project root and copy this implementation plan into it (e.g., `plan/weechat-web-client.md`).
2. Create an `AGENTS.md` file in the project root containing instructions, guidelines, and context for future AI agents working on this project (e.g., architecture decisions, design system constraints, and file structure).

### Phase 1: Foundation & Design Shell
1. Create `index.html` using the core layout from `@design/weechat_client_icon_notices_synced_nick_colors/code.html`.
2. Include the specific Tailwind configuration (`tailwind-config` script) and custom CSS (scrollbars, fonts).
3. Extract static sections (Sidebar, Chat Area, Nicklist, Status Bar) into distinct, queryable container elements.

### Phase 2: Core Logic (State & Parser)
1. **`store.js`**: Implement a simple `Store` class with `getState()`, `dispatch(action)`, and `subscribe(listener)` methods.
2. **`protocol.js`**: Implement the binary parser.
   - Use `ArrayBuffer` and `DataView` to read headers, message IDs, and data blocks.
   - Handle decompression (zlib/pako if needed, or stick to uncompressed initially).
   - Parse `hdata` structures for buffers and lines.

### Phase 3: Networking
1. **`relay.js`**: 
   - Establish `WebSocket` to `ws://[host]:[port]/weechat`.
   - Send connection init command: `init password=...`.
   - Send `sync` and `hdata` commands to fetch initial buffers and backlog.
   - Pass incoming blobs to `protocol.js` and dispatch results to `store.js`.

### Phase 4: UI Binding & Rendering
1. **`ui.js`**: Create render functions for each UI segment.
   - `renderBuffers(buffers)`: Updates the left sidebar.
   - `renderLines(lines)`: Appends to the chat area and auto-scrolls.
   - `renderNicks(nicks)`: Updates the right sidebar.
   - `updateStatusBar(stats)`: Modifies the bottom footer.
2. **`app.js`**: Initialize the store, relay client, and set up DOM event listeners (input field submission, buffer clicks). Hook the UI renderers to the store's `subscribe` event.

### Phase 5: Polish & Responsiveness
1. Incorporate mobile layout adjustments from `@design/weechat_client_mobile_no_timestamps/code.html` using CSS media queries.
2. Ensure strict adherence to the "No-Line" rule and 0px border-radius constraints defined in `DESIGN.md`.

## Verification & Testing
- **Protocol**: Verify successful connection and handshake with a live WeeChat relay.
- **State**: Confirm that receiving an IRC message updates the store and triggers a single render cycle.
- **UI**: Ensure switching buffers visually updates the header, chat history, and nicklist instantly. Check that scrolling behavior matches standard TUI expectations (sticks to bottom).
- **Design Check**: Audit the final DOM against `DESIGN.md` to ensure correct typographic scaling (Space Grotesk / JetBrains Mono) and color palettes (Tokyo Night/Catppuccin inspired).