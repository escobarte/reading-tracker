/**
 * Простой ZIP без сжатия (режим store) и без зависимостей — собирается в браузере для полного
 * бэкапа. Формату не нужны сжатие, шифрование или zip64: несколько файлов и десятки фото personal
 * backup влезают далеко внутрь 32-битных лимитов классического ZIP.
 */

const CRC_TABLE = buildCrcTable();

function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}

function crc32(data: Uint8Array<ArrayBuffer>): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date): { time: number; date: number } {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const dosDate = ((Math.max(1980, date.getFullYear()) - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, date: dosDate };
}

type ZipEntry = { nameBytes: Uint8Array<ArrayBuffer>; data: Uint8Array<ArrayBuffer>; crc: number; time: number; date: number };

export class ZipBuilder {
  private entries: ZipEntry[] = [];

  addFile(name: string, data: Uint8Array<ArrayBuffer>, date: Date = new Date()): void {
    const { time, date: dosDate } = dosDateTime(date);
    this.entries.push({
      nameBytes: new TextEncoder().encode(name),
      data,
      crc: crc32(data),
      time,
      date: dosDate,
    });
  }

  build(): Blob {
    const localParts: BlobPart[] = [];
    const centralParts: BlobPart[] = [];
    let offset = 0;

    for (const entry of this.entries) {
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true);
      local.setUint16(6, 0, true);
      local.setUint16(8, 0, true);
      local.setUint16(10, entry.time, true);
      local.setUint16(12, entry.date, true);
      local.setUint32(14, entry.crc, true);
      local.setUint32(18, entry.data.length, true);
      local.setUint32(22, entry.data.length, true);
      local.setUint16(26, entry.nameBytes.length, true);
      local.setUint16(28, 0, true);
      const localBytes = new Uint8Array(local.buffer as ArrayBuffer);
      localParts.push(localBytes, entry.nameBytes, entry.data);

      const central = new DataView(new ArrayBuffer(46));
      central.setUint32(0, 0x02014b50, true);
      central.setUint16(4, 20, true);
      central.setUint16(6, 20, true);
      central.setUint16(8, 0, true);
      central.setUint16(10, 0, true);
      central.setUint16(12, entry.time, true);
      central.setUint16(14, entry.date, true);
      central.setUint32(16, entry.crc, true);
      central.setUint32(20, entry.data.length, true);
      central.setUint32(24, entry.data.length, true);
      central.setUint16(28, entry.nameBytes.length, true);
      central.setUint16(30, 0, true);
      central.setUint16(32, 0, true);
      central.setUint16(34, 0, true);
      central.setUint16(36, 0, true);
      central.setUint32(38, 0, true);
      central.setUint32(42, offset, true);
      centralParts.push(new Uint8Array(central.buffer as ArrayBuffer), entry.nameBytes);

      offset += localBytes.length + entry.nameBytes.length + entry.data.length;
    }

    const centralStart = offset;
    const centralSize = centralParts.reduce((sum, part) => sum + (part as Uint8Array).length, 0);

    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(4, 0, true);
    end.setUint16(6, 0, true);
    end.setUint16(8, this.entries.length, true);
    end.setUint16(10, this.entries.length, true);
    end.setUint32(12, centralSize, true);
    end.setUint32(16, centralStart, true);
    end.setUint16(20, 0, true);

    return new Blob([...localParts, ...centralParts, new Uint8Array(end.buffer as ArrayBuffer)], { type: "application/zip" });
  }
}
