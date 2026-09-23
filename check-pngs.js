// Run from backend root folder:
//   node check-pngs.js
//
// Verifies every embedded base64 PNG in media.provider.ts is valid
// Identifies which one is corrupt (causing LibreOffice IDAT error)

const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, 'src/media/media.provider.ts');
const src = fs.readFileSync(FILE, 'utf8');

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// Extract all base64 constants
const regex = /private static readonly (\w+_B64)\s*=\s*['"]([A-Za-z0-9+/=]+)['"]/g;
const constants = [];
let m;
while ((m = regex.exec(src)) !== null) {
  constants.push({ name: m[1], b64: m[2] });
}

console.log(`\n📊 Found ${constants.length} base64 constants:\n`);

let badCount = 0;
for (const { name, b64 } of constants) {
  const buf = Buffer.from(b64, 'base64');
  const len = buf.length;
  const sigOk = buf.slice(0, 8).equals(PNG_SIG);

  if (!sigOk) {
    console.log(`❌ ${name}: NOT A VALID PNG (signature wrong) — ${len} bytes`);
    badCount++;
    continue;
  }

  let pos = 8;
  let chunkErrors = [];
  let chunks = [];
  while (pos < buf.length - 4) {
    const length = buf.readUInt32BE(pos);
    const type = buf.slice(pos + 4, pos + 8).toString('ascii');
    const dataStart = pos + 8;
    const dataEnd = dataStart + length;
    const crcStart = dataEnd;
    if (crcStart + 4 > buf.length) {
      chunkErrors.push(`${type} chunk truncated`);
      break;
    }
    chunks.push({ type, length });
    pos = crcStart + 4;
    if (type === 'IEND') break;
  }

  if (chunkErrors.length) {
    console.log(`❌ ${name}: ${chunkErrors.join('; ')}`);
    badCount++;
  } else {
    const types = chunks.map((c) => c.type).join(',');
    console.log(`✅ ${name}: ${len} bytes, chunks: ${types}`);
  }
}

console.log(`\n${badCount === 0 ? '🎉 All PNGs structurally OK' : `⚠️ ${badCount} bad PNG(s) found`}\n`);

// Deep validate with sharp (catches IDAT/zlib errors)
console.log('Now trying to decode each with sharp (catches IDAT/zlib errors):\n');
let sharp;
try {
  sharp = require('sharp');
} catch {
  console.log('⚠️ sharp not available, skipping deep validation');
  process.exit(0);
}

(async () => {
  for (const { name, b64 } of constants) {
    const buf = Buffer.from(b64, 'base64');
    try {
      const meta = await sharp(buf).metadata();
      console.log(`✅ ${name}: ${meta.width}x${meta.height} ${meta.format}`);
    } catch (err) {
      console.log(`🔥 ${name}: sharp decode FAILED — ${err.message}`);
    }
  }
})();