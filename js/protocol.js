/**
 * WeeChat Binary Protocol Parser
 * Implements unpacking of the WeeChat custom binary protocol over WebSockets.
 */

class WeechatProtocol {
  constructor(buffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
    this.offset = 0;
    this.decoder = new TextDecoder('utf-8');
  }

  parse() {
    try {
      if (this.buffer.byteLength < 4) return null;
      
      const length = this.view.getUint32(this.offset);
      this.offset += 4;
      
      if (this.buffer.byteLength < length) return null;

      const compression = this.view.getUint8(this.offset);
      this.offset += 1;

      if (compression !== 0) {
        console.warn("Compressed payloads are not supported.");
        return null;
      }

      // ID is a standard WeeChat string (4-byte length prefix)
      const id = this.readString();

      const objects = [];
      while (this.offset < length) {
        const obj = this.readType();
        if (obj === null) break;
        objects.push(obj);
      }

      return { id: id || "", objects };
    } catch (e) {
      console.error("Critical parser failure:", e);
      return null;
    }
  }

  readString() {
    if (this.offset + 4 > this.buffer.byteLength) return null;
    const len = this.view.getInt32(this.offset);
    this.offset += 4;
    if (len === -1) return null;
    if (len === 0) return "";
    
    if (this.offset + len > this.buffer.byteLength) {
      this.offset = this.buffer.byteLength;
      return null;
    }
    
    const str = this.decoder.decode(new Uint8Array(this.buffer, this.offset, len));
    this.offset += len;
    return str;
  }

  readInt() {
    if (this.offset + 4 > this.buffer.byteLength) return 0;
    const val = this.view.getInt32(this.offset);
    this.offset += 4;
    return val;
  }

  readByte() {
    if (this.offset + 1 > this.buffer.byteLength) return 0;
    const val = this.view.getUint8(this.offset);
    this.offset += 1;
    return val;
  }

  readPointer() {
    if (this.offset + 1 > this.buffer.byteLength) return "0x0";
    const len = this.view.getUint8(this.offset);
    this.offset += 1;
    if (len === 0) return "0x0";
    if (this.offset + len > this.buffer.byteLength) {
      this.offset = this.buffer.byteLength;
      return "0x0";
    }
    
    const ptr = this.decoder.decode(new Uint8Array(this.buffer, this.offset, len));
    this.offset += len;
    return "0x" + ptr;
  }

  readTime() {
    if (this.offset + 1 > this.buffer.byteLength) return new Date(0);
    const len = this.view.getUint8(this.offset);
    this.offset += 1;
    if (len === 0) return new Date(0);
    if (this.offset + len > this.buffer.byteLength) {
      this.offset = this.buffer.byteLength;
      return new Date(0);
    }
    const timeStr = this.decoder.decode(new Uint8Array(this.buffer, this.offset, len));
    this.offset += len;
    return new Date(parseInt(timeStr, 10) * 1000);
  }

  readLong() {
    if (this.offset + 1 > this.buffer.byteLength) return "0";
    const len = this.view.getUint8(this.offset);
    this.offset += 1;
    if (len === 0) return "0";
    if (this.offset + len > this.buffer.byteLength) {
      this.offset = this.buffer.byteLength;
      return "0";
    }
    const lonStr = this.decoder.decode(new Uint8Array(this.buffer, this.offset, len));
    this.offset += len;
    return lonStr;
  }

  readType() {
    if (this.offset + 3 > this.buffer.byteLength) return null;
    const type = this.decoder.decode(new Uint8Array(this.buffer, this.offset, 3));
    this.offset += 3;
    return this.readTypeSpecific(type);
  }

  readTypeSpecific(type) {
    switch (type) {
      case 'chr': return this.readByte();
      case 'int': return this.readInt();
      case 'lon': return this.readLong();
      case 'str': return this.readString();
      case 'buf': {
        const len = this.readInt();
        if (len === -1 || this.offset + len > this.buffer.byteLength) return null;
        const buf = this.buffer.slice(this.offset, this.offset + len);
        this.offset += len;
        return buf;
      }
      case 'ptr': return this.readPointer();
      case 'tim': return this.readTime();
      case 'htb': {
        if (this.offset + 6 > this.buffer.byteLength) return {};
        const keyType = this.decoder.decode(new Uint8Array(this.buffer, this.offset, 3));
        this.offset += 3;
        const valType = this.decoder.decode(new Uint8Array(this.buffer, this.offset, 3));
        this.offset += 3;
        const count = this.readInt();
        const htb = {};
        for (let i = 0; i < count; i++) {
          const k = this.readTypeSpecific(keyType);
          const v = this.readTypeSpecific(valType);
          if (k !== null) htb[k] = v;
        }
        return htb;
      }
      case 'inf': {
        const name = this.readString();
        const value = this.readString();
        return { type: 'info', name, value };
      }
      case 'arr': {
        if (this.offset + 3 > this.buffer.byteLength) return [];
        const arrayType = this.decoder.decode(new Uint8Array(this.buffer, this.offset, 3));
        this.offset += 3;
        const count = this.readInt();
        const arr = [];
        for (let i = 0; i < count; i++) {
          arr.push(this.readTypeSpecific(arrayType));
        }
        return arr;
      }
      case 'inl': return this.readInfolist();
      case 'hda': return this.readHdata();
      default:
        console.warn(`Unknown type: ${type} at offset ${this.offset}`);
        this.offset = this.buffer.byteLength;
        return null;
    }
  }

  readInfolist() {
    const name = this.readString();
    const pointer = this.readPointer();
    const count = this.readInt();
    const items = [];

    for (let i = 0; i < count; i++) {
      const varCount = this.readInt();
      const item = {};
      for (let v = 0; v < varCount; v++) {
        const varName = this.readString();
        const varType = this.readByte();
        let value;
        switch (varType) {
          case 0: value = this.readByte(); break; // chr
          case 1: value = this.readInt(); break;  // int
          case 2: value = this.readLong(); break; // lon
          case 3: value = this.readString(); break; // str
          case 4: value = this.readPointer(); break; // ptr
          case 5: value = this.readTime(); break; // tim
          default:
            console.warn(`Unknown infolist varType: ${varType}`);
            this.offset = this.buffer.byteLength;
            return { type: 'infolist', name, items };
        }
        item[varName] = value;
      }
      items.push(item);
    }
    return { type: 'infolist', name, items };
  }

  readHdata() {
    const hpath = this.readString();
    const keysStr = this.readString();
    const count = this.readInt();

    if (!keysStr) return { type: 'hdata', hpath, items: [] };

    const keys = keysStr.split(',').map(k => {
      const parts = k.split(':');
      return { name: parts[0], type: parts[1] };
    });

    // Pointer count is equal to number of elements in path (separated by /)
    const pointerCount = hpath ? hpath.split('/').length : 1;

    const items = [];
    for (let i = 0; i < count; i++) {
      if (this.offset >= this.buffer.byteLength) break;
      const item = { pointers: [] };
      for (let p = 0; p < pointerCount; p++) {
        item.pointers.push(this.readPointer());
      }
      item.pointer = item.pointers[item.pointers.length - 1];

      for (const key of keys) {
        item[key.name] = this.readTypeSpecific(key.type);
      }
      items.push(item);
    }

    return { type: 'hdata', hpath, items };
  }
}

window.WeechatProtocol = WeechatProtocol;
