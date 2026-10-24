// Saving files: a download link for a Blob, a small zip writer and variant file names.
(function (kit) {
  function saveBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  // Minimal zip writer (stored, no compression; GLB data barely compresses anyway). files: [{ name, data }],
  // data an ArrayBuffer, typed array or string. Names are UTF-8 and the entries get the current time.
  const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc32 = (u8) => { let c = ~0; for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 255] ^ (c >>> 8); return ~c >>> 0; };
  function makeZip(files) {
    const enc = new TextEncoder(), parts = [], central = []; let off = 0;
    const d = new Date(), time = d.getHours() << 11 | d.getMinutes() << 5 | d.getSeconds() >> 1;
    const date = (d.getFullYear() - 1980) << 9 | (d.getMonth() + 1) << 5 | d.getDate();
    for (const f of files) {
      const name = enc.encode(f.name), bytes = toBytes(f.data), crc = crc32(bytes);
      const h = new DataView(new ArrayBuffer(30)), c = new DataView(new ArrayBuffer(46));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true);
      h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true);
      h.setUint32(18, bytes.length, true); h.setUint32(22, bytes.length, true); h.setUint16(26, name.length, true);
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true);
      c.setUint32(20, bytes.length, true); c.setUint32(24, bytes.length, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      parts.push(new Uint8Array(h.buffer), name, bytes); central.push(new Uint8Array(c.buffer), name);
      off += 30 + name.length + bytes.length;
    }
    const e = new DataView(new ArrayBuffer(22)), cd = central.reduce((n, a) => n + a.length, 0);
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, cd, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/zip' });
  }
  function toBytes(d) {
    if (typeof d === 'string') return new TextEncoder().encode(d);
    if (d instanceof Uint8Array) return d;
    return ArrayBuffer.isView(d) ? new Uint8Array(d.buffer, d.byteOffset, d.byteLength) : new Uint8Array(d);
  }

  // Variant file names: an id ending in -a counts on (-a, -b, -c), anything else gets -a, -b, -c appended.
  function variantNames(base, n) {
    const m = base.match(/^(.*)-([a-z])$/), stem = m ? m[1] : base, start = m ? m[2].charCodeAt(0) : 97;
    return Array.from({ length: n }, (_, i) => `${stem}-${String.fromCharCode(Math.min(122, start + i))}`);
  }

  Object.assign(kit, { saveBlob, makeZip, crc32, variantNames });
})(window.EmbersKit = window.EmbersKit || {});
