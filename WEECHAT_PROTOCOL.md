# WeeChat Relay Protocol: A Developer's Field Guide

This document is a comprehensive guide to implementing the **WeeChat Binary Relay Protocol** over WebSockets in vanilla JavaScript. It is designed to act as a knowledge base for AI agents and human developers, detailing the protocol's structure, edge cases, and common pitfalls discovered during real-world implementation.

---

## 1. Connection & Handshake
WeeChat's relay operates over WebSockets. Ensure you are connecting via `ws://` (or `wss://` if the relay is behind an SSL reverse proxy).

### The Handshake
Upon establishing the WebSocket connection, you must immediately send an `init` command to authenticate.
**Important:** Unlike almost every other command, the `init` command **must not** have an ID prefix.

```text
// CORRECT
init password=yourpassword,compression=off\n

// INCORRECT (Will be rejected silently by the relay)
(msg_1) init password=yourpassword,compression=off\n
```

We highly recommend requesting `compression=off` for lightweight clients to avoid needing to bundle large `zlib` or `pako` decompression libraries in the browser.

---

## 2. General Command Syntax
Once authenticated, commands should follow the `(id) command\n` format. The ID allows you to asynchronously match responses to your requests.

```text
(version) info version
(nick) info nick
(buffers) hdata buffer:gui_buffers(*) number,full_name,short_name,title
```

---

## 3. Synchronizing Data (The `sync` Command)
To receive real-time updates (new messages, nicklist changes, etc.), you must issue a `sync` command. 

**Pitfall:** The `sync` command, similar to `init`, often behaves better if sent **without an ID prefix** depending on the WeeChat version. It establishes an ongoing stream rather than a single response.

```text
// To receive all data (buffers, lines, nicklist changes)
sync *\n
```
When synced, WeeChat will push unsolicited messages to the client with reserved IDs like `_buffer_line_added`, `_nicklist`, and `_nicklist_diff`.

---

## 4. Binary Message Structure
Incoming WebSocket messages are `ArrayBuffer` payloads. Every message follows a strict header format:

1.  **Length (4 bytes, 32-bit unsigned int):** The total length of the message.
2.  **Compression (1 byte, 8-bit unsigned int):** `0` = none, `1` = zlib, `2` = zstd.
3.  **ID Length (4 bytes, 32-bit unsigned int):** Length of the message ID string.
4.  **ID String (Variable):** UTF-8 string matching the ID you sent (e.g., `buffers` or `_buffer_line_added`).
5.  **Payload (Variable):** A sequence of WeeChat Data Types until the end of the buffer.

---

## 5. Data Types & Parsing Edge Cases
WeeChat data blocks always begin with a 3-character ASCII type identifier (e.g., `chr`, `int`, `str`). 

### Primitive Types
*   **`chr`**: 1 byte unsigned int.
*   **`int`**: 4 byte signed int.
*   **`str`**: 4 byte signed int length, followed by UTF-8 bytes. 
    *   *Edge Case:* A length of `-1` means `null`. A length of `0` means an empty string `""`.
*   **`ptr`**: 1 byte unsigned int length, followed by an ASCII string representing a hex pointer (e.g., `0x55b01fe67980`). Length `0` means a null pointer (`0x0`).

### The 8-Byte Binary Trap (`lon` and `tim`)
In older versions of the protocol, `lon` (long integer) and `tim` (timestamp) were sent as length-prefixed strings. In modern WeeChat relays, **they are strictly 8-byte binary BigInts.** 
**Pitfall:** Attempting to read a modern `lon` or `tim` as a string length will instantly desync the parser and crash the application.

```javascript
// Correct modern parsing for 'lon' and 'tim'
const val = dataView.getBigInt64(offset);
offset += 8;
```

---

## 6. Complex Types (`hdata` and `infolist`)

### Hdata (`hda`)
Hdata represents WeeChat's internal memory trees. It contains a path (`hpath`), a list of keys with their types, and an array of items.

**The Pointer Count Pitfall:**
Every item in an `hdata` response contains an array of parent/child pointers. The number of pointers per item is **not explicitly declared** in the payload. It must be inferred from the `hpath` string.
*   Standard path (e.g., `buffer`): 1 pointer.
*   Path with slashes (e.g., `buffer/own_lines/last_line`): `path.split('/').length` pointers.
*   **Hardcoded Exceptions:** `line_data` *always* has 3 pointers (`buffer`, `line`, `line_data`), even though there are no slashes in its name. `nicklist_item` *always* has 2 pointers (`buffer`, `nicklist_item`).
*   *Failure to account for these hardcoded pointer counts will corrupt the parser offset.*

### Infolist (`inl`)
Infolists are flat, tabular data structures. They are much safer and easier to parse than `hdata`.
**Recommendation:** Always prefer native commands that return infolists (like `nicklist core.weechat`) over trying to traverse the internal `hdata` trees for the same information.

---

## 7. Extracting Data from Sync Events
When WeeChat pushes a `_buffer_line_added` event, you need to know *which* buffer the line belongs to.
*   In the `pointers` array attached to the `line_data` object, the **first pointer** (`pointers[0]`) is the parent buffer.
*   Alternatively, WeeChat often includes a parsed key simply named `buffer` inside the object itself. 

---

## 8. The `0x19` Color & Formatting Protocol
WeeChat embeds colors and text formatting directly into strings using the `0x19` byte (ASCII End of Medium).

**Do not blindly strip `0x19` characters using simple Regex.** If you strip too aggressively, you will accidentally delete legitimate user data (e.g., an op prefix like `@username` getting swallowed because the regex thought it was an extended color).

### The Formatting Anatomy
When a string contains `\x19`, the following characters determine the format:

1.  **Extended Colors:**
    *   `\x19@00186` (Foreground color 186)
    *   `\x19F@00186` (Explicit foreground color 186)
    *   `\x19B@00025` (Explicit background color 25)
2.  **Basic Colors:**
    *   `\x1901` or `\x19f01` (Foreground color 1)
3.  **Attributes:**
    *   `\x19*` (Bold)
    *   `\x19_` (Underline)
    *   `\x19/` (Italic)
    *   `\x19E` (Reset all formatting)

**Parser Strategy:** Instead of regex, use a strict loop that consumes exactly 5 digits if it sees an `@`, or 2 digits if it sees a basic color. This prevents collisions with channel op symbols or standard digits typed by users.

### Other Control Codes
*   `\x1A`: Set attribute flag (followed by 1 byte, e.g., `0x01` for bold).
*   `\x1B`: Remove attribute flag.
*   `\x1C`: Hard reset all styles.