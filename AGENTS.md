# WeeChat Web Client (Terminal Editorial) - Agent Guidelines

This document provides context and guidelines for AI agents working on this repository.

## 1. Core Architecture
- **Vanilla JavaScript Only**: Do not use frameworks like React, Vue, or Svelte.
- **State Management**: We use a custom Reactive State Store (`store.js`) using a pub/sub pattern. All UI updates should be triggered by subscribing to this central store. Avoid direct, tangled DOM manipulations in the network or protocol layers.
- **Protocol**: We are implementing the WeeChat binary relay protocol over WebSockets. The connection and parsing layers (`relay.js` and `protocol.js`) must remain decoupled from the DOM.

## 2. Design System: Terminal Editorial
- **Visual Aesthetic**: The app must look like a high-end TUI (Terminal User Interface). Refer to `DESIGN.md` (or the provided designs) for exact rules.
- **No-Line Rule**: Avoid 1px solid borders for sectioning; use background color shifts instead.
- **0px Border Radius**: Strict prohibition on rounded corners. All elements must have a 0px radius.
- **Typography**: Dense, TUI-like typography using Space Grotesk and JetBrains Mono. Maintain tight tracking on headings.
- **Depth**: Achieved via luminance stacking, not drop shadows. 

## 3. Implementation Process
- Follow the phases outlined in `plan/weechat-web-client.md`.
- Keep modules clean and separated into Connection, Protocol, State, and UI layers.
- Validate features empirically with a live WeeChat relay when working on protocol features.

## 4. File Structure
- `index.html`: The main structural shell containing Tailwind configurations.
- `js/store.js`: The central reactive state.
- `js/protocol.js`: Binary parsing for the WeeChat relay protocol.
- `js/relay.js`: WebSocket connection and data dispatching.
- `js/ui.js`: DOM update functions bound to the store.
- `js/app.js`: Application initialization and event wiring.