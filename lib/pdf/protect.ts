import {
  PDFDocument,
  PDFName,
  PDFDict,
  PDFArray,
  PDFRef,
  PDFString,
  PDFHexString,
  PDFRawStream,
  PDFNumber,
  PDFBool,
} from "pdf-lib";

/**
 * Thrown when a PDF uses encryption this module doesn't implement: AES-256/PDF 2.0 (revision 5
 * or 6), or a document built on compressed object streams (`/Type /ObjStm`). pdf-lib's own
 * parser reads object-stream contents as plain PDF syntax while ignoring encryption entirely, so
 * for an encrypted file that uses them the parsed objects are already unusable garbage before
 * this module ever runs — there's no safe way to recover from that at this layer.
 */
export class UnsupportedEncryptionError extends Error {
  constructor(message = "This PDF uses an encryption method that isn't supported yet.") {
    super(message);
    this.name = "UnsupportedEncryptionError";
  }
}

/** Thrown by `unlockPdf` when the supplied password doesn't open the document. */
export class WrongPasswordError extends Error {
  constructor() {
    super("That password doesn't match this PDF.");
    this.name = "WrongPasswordError";
  }
}

// ---------------------------------------------------------------------------
// MD5 (RFC 1321) — the PDF standard security handler's key derivation is built
// entirely on MD5 + RC4/AES; there's no way around implementing it by hand,
// since neither Web Crypto nor pdf-lib expose MD5.
// ---------------------------------------------------------------------------

const MD5_SHIFTS = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14,
  20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6,
  10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];
const MD5_K = new Int32Array(64);
for (let i = 0; i < 64; i++) MD5_K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) | 0;

function md5(data: Uint8Array): Uint8Array {
  const origLen = data.length;
  const bitLen = origLen * 8;
  const padded = new Uint8Array(((origLen + 8) >> 6) * 64 + 64);
  padded.set(data);
  padded[origLen] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, bitLen >>> 0, true);
  view.setUint32(padded.length - 4, Math.floor(bitLen / 2 ** 32) >>> 0, true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  const rotl = (x: number, c: number) => (x << c) | (x >>> (32 - c));

  for (let chunkStart = 0; chunkStart < padded.length; chunkStart += 64) {
    const M = new Int32Array(16);
    for (let i = 0; i < 16; i++) M[i] = view.getInt32(chunkStart + i * 4, true);

    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;

    for (let i = 0; i < 64; i++) {
      let f: number;
      let g: number;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }
      f = (f + a + MD5_K[i] + M[g]) | 0;
      a = d;
      d = c;
      c = b;
      b = (b + rotl(f, MD5_SHIFTS[i])) | 0;
    }

    a0 = (a0 + a) | 0;
    b0 = (b0 + b) | 0;
    c0 = (c0 + c) | 0;
    d0 = (d0 + d) | 0;
  }

  const out = new Uint8Array(16);
  const outView = new DataView(out.buffer);
  outView.setInt32(0, a0, true);
  outView.setInt32(4, b0, true);
  outView.setInt32(8, c0, true);
  outView.setInt32(12, d0, true);
  return out;
}

// ---------------------------------------------------------------------------
// RC4
// ---------------------------------------------------------------------------

function rc4(key: Uint8Array, data: Uint8Array): Uint8Array {
  const S = new Uint8Array(256);
  for (let i = 0; i < 256; i++) S[i] = i;
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + key[i % key.length]) & 0xff;
    const tmp = S[i];
    S[i] = S[j];
    S[j] = tmp;
  }
  const out = new Uint8Array(data.length);
  let i = 0;
  j = 0;
  for (let n = 0; n < data.length; n++) {
    i = (i + 1) & 0xff;
    j = (j + S[i]) & 0xff;
    const tmp = S[i];
    S[i] = S[j];
    S[j] = tmp;
    out[n] = data[n] ^ S[(S[i] + S[j]) & 0xff];
  }
  return out;
}

// ---------------------------------------------------------------------------
// AES-128-CBC via the standard Web Crypto API (available in both the browser
// and modern Node)
// ---------------------------------------------------------------------------

// TS's DOM typings require Web Crypto's BufferSource args to be backed by a concrete
// ArrayBuffer (not the wider ArrayBufferLike a Uint8Array is typed with) — a real-buffer copy
// keeps this honest instead of just asserting the type away.
function toArrayBufferView(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(bytes);
}

async function aesCbcDecrypt(key: Uint8Array, iv: Uint8Array, ciphertext: Uint8Array): Promise<Uint8Array> {
  if (ciphertext.length === 0) return new Uint8Array(0);
  const cryptoKey = await crypto.subtle.importKey("raw", toArrayBufferView(key), { name: "AES-CBC" }, false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-CBC", iv: toArrayBufferView(iv) }, cryptoKey, toArrayBufferView(ciphertext));
  return new Uint8Array(plain);
}

async function aesCbcEncrypt(key: Uint8Array, iv: Uint8Array, plaintext: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey("raw", toArrayBufferView(key), { name: "AES-CBC" }, false, ["encrypt"]);
  const cipher = await crypto.subtle.encrypt({ name: "AES-CBC", iv: toArrayBufferView(iv) }, cryptoKey, toArrayBufferView(plaintext));
  return new Uint8Array(cipher);
}

// ---------------------------------------------------------------------------
// PDF standard security handler (ISO 32000-1 §7.6.2-7.6.3) — revisions 2-4
// (40/128-bit RC4 and AES-128). Revision 5/6 (AES-256, PDF 2.0) isn't
// implemented; `assertSupportedEncryption` rejects it explicitly.
// ---------------------------------------------------------------------------

const PAD = new Uint8Array([
  0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41, 0x64, 0x00, 0x4e, 0x56, 0xff, 0xfa, 0x01, 0x08,
  0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e, 0x80, 0x2f, 0x0c, 0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a,
]);
const AES_SALT = new Uint8Array([0x73, 0x41, 0x6c, 0x54]); // "sAlT"

function padPassword(password: Uint8Array): Uint8Array {
  if (password.length >= 32) return password.slice(0, 32);
  const out = new Uint8Array(32);
  out.set(password);
  out.set(PAD.slice(0, 32 - password.length), password.length);
  return out;
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function int32LEBytes(n: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setInt32(0, n, true);
  return out;
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

/** Algorithm 2 — derives the file encryption key from a (padded) password. */
function computeFileKey(
  passwordBytes: Uint8Array,
  O: Uint8Array,
  P: number,
  id0: Uint8Array,
  keyLengthBytes: number,
  R: number,
  encryptMetadata: boolean,
): Uint8Array {
  const parts = [padPassword(passwordBytes), O, int32LEBytes(P), id0];
  if (R >= 4 && !encryptMetadata) parts.push(new Uint8Array([0xff, 0xff, 0xff, 0xff]));
  let digest = md5(concatBytes(...parts));
  if (R >= 3) {
    for (let i = 0; i < 50; i++) digest = md5(digest.slice(0, keyLengthBytes));
  }
  return digest.slice(0, keyLengthBytes);
}

/** Algorithm 3 — computes the /O entry when creating a new encrypted document. */
function computeOwnerEntry(
  ownerPasswordBytes: Uint8Array,
  userPasswordBytes: Uint8Array,
  keyLengthBytes: number,
  R: number,
): Uint8Array {
  let digest = md5(padPassword(ownerPasswordBytes));
  if (R >= 3) {
    for (let i = 0; i < 50; i++) digest = md5(digest);
  }
  const rc4Key = digest.slice(0, keyLengthBytes);
  let encrypted = rc4(rc4Key, padPassword(userPasswordBytes));
  if (R >= 3) {
    for (let i = 1; i <= 19; i++) {
      const roundKey = rc4Key.map((b) => b ^ i);
      encrypted = rc4(roundKey, encrypted);
    }
  }
  return encrypted;
}

/** Algorithm 4/5 — computes the /U entry from an already-derived file key. */
function computeUserEntry(fileKey: Uint8Array, id0: Uint8Array, R: number, tailPadding: Uint8Array): Uint8Array {
  if (R === 2) return rc4(fileKey, PAD);
  const digest = md5(concatBytes(PAD, id0));
  let encrypted = rc4(fileKey, digest);
  for (let i = 1; i <= 19; i++) {
    const roundKey = fileKey.map((b) => b ^ i);
    encrypted = rc4(roundKey, encrypted);
  }
  return concatBytes(encrypted, tailPadding.slice(0, 16));
}

/** Algorithm 1 — per-object key derivation, used for both encrypting and decrypting. */
function computeObjectKey(fileKey: Uint8Array, objectNumber: number, generationNumber: number, useAes: boolean): Uint8Array {
  const numBytes = new Uint8Array([objectNumber & 0xff, (objectNumber >> 8) & 0xff, (objectNumber >> 16) & 0xff]);
  const genBytes = new Uint8Array([generationNumber & 0xff, (generationNumber >> 8) & 0xff]);
  const input = useAes ? concatBytes(fileKey, numBytes, genBytes, AES_SALT) : concatBytes(fileKey, numBytes, genBytes);
  return md5(input).slice(0, Math.min(fileKey.length + 5, 16));
}

type CryptMethod = "RC4" | "AESV2" | "Identity";

interface EncryptDictInfo {
  ref: PDFRef;
  R: number;
  O: Uint8Array;
  U: Uint8Array;
  P: number;
  id0: Uint8Array;
  keyLengthBytes: number;
  encryptMetadata: boolean;
  streamMethod: CryptMethod;
  stringMethod: CryptMethod;
}

function stringBytes(obj: unknown): Uint8Array | null {
  if (obj instanceof PDFHexString || obj instanceof PDFString) return obj.asBytes();
  return null;
}

/** Reads and validates a parsed document's `/Encrypt` dictionary. Returns `null` if the document
 * isn't encrypted at all. Throws `UnsupportedEncryptionError` for structures this module can't
 * safely handle. */
function parseEncryptDict(doc: PDFDocument): EncryptDictInfo | null {
  const context = doc.context;
  const encryptEntry = context.trailerInfo.Encrypt;
  if (!encryptEntry) return null;

  const ref = encryptEntry instanceof PDFRef ? encryptEntry : context.getObjectRef(context.lookup(encryptEntry, PDFDict));
  const dict = context.lookup(encryptEntry, PDFDict);
  if (!ref) throw new UnsupportedEncryptionError();

  // Any document built on compressed object/cross-reference streams has already been mis-parsed
  // by pdf-lib before we get here (see the class doc comment) — bail out rather than silently
  // corrupting it. Both /ObjStm and /XRef objects are streams (PDFRawStream), whose /Type lives
  // on their own `.dict`, not the stream object itself.
  for (const [, object] of context.enumerateIndirectObjects()) {
    const objectDict = object instanceof PDFRawStream ? object.dict : object instanceof PDFDict ? object : null;
    if (!objectDict) continue;
    const type = objectDict.get(PDFName.of("Type"));
    if (type instanceof PDFName && (type.asString() === "/ObjStm" || type.asString() === "/XRef")) {
      throw new UnsupportedEncryptionError(
        "This PDF uses a compressed cross-reference structure that isn't supported yet.",
      );
    }
  }

  const V = dict.lookupMaybe(PDFName.of("V"), PDFNumber)?.asNumber() ?? 0;
  const R = dict.lookupMaybe(PDFName.of("R"), PDFNumber)?.asNumber() ?? 2;
  if (V >= 5 || R >= 5) {
    throw new UnsupportedEncryptionError("This PDF uses AES-256 (PDF 2.0) encryption, which isn't supported yet.");
  }

  const O = stringBytes(dict.get(PDFName.of("O")));
  const U = stringBytes(dict.get(PDFName.of("U")));
  if (!O || !U) throw new UnsupportedEncryptionError();

  const P = dict.lookupMaybe(PDFName.of("P"), PDFNumber)?.asNumber() ?? 0;
  const encryptMetadata = dict.lookupMaybe(PDFName.of("EncryptMetadata"), PDFBool)?.asBoolean() ?? true;

  const idArray = context.trailerInfo.ID ? context.lookupMaybe(context.trailerInfo.ID, PDFArray) : undefined;
  const id0Raw = idArray ? idArray.get(0) : undefined;
  const id0 = stringBytes(id0Raw) ?? new Uint8Array(0);

  const lengthBits = dict.lookupMaybe(PDFName.of("Length"), PDFNumber)?.asNumber();
  let keyLengthBytes = lengthBits ? Math.ceil(lengthBits / 8) : 5;

  let streamMethod: CryptMethod = "RC4";
  let stringMethod: CryptMethod = "RC4";
  if (V === 4) {
    const cf = dict.lookupMaybe(PDFName.of("CF"), PDFDict);
    const stmF = dict.lookupMaybe(PDFName.of("StmF"), PDFName)?.asString() ?? "/Identity";
    const strF = dict.lookupMaybe(PDFName.of("StrF"), PDFName)?.asString() ?? "/Identity";

    const resolveMethod = (filterName: string): CryptMethod => {
      if (filterName === "/Identity") return "Identity";
      const filterDict = cf?.lookupMaybe(PDFName.of(filterName.slice(1)), PDFDict);
      const cfm = filterDict?.lookupMaybe(PDFName.of("CFM"), PDFName)?.asString();
      if (cfm === "/AESV2") return "AESV2";
      if (cfm === "/V2") return "RC4";
      return "Identity";
    };
    streamMethod = resolveMethod(stmF);
    stringMethod = resolveMethod(strF);

    const stdCf = cf?.lookupMaybe(PDFName.of("StdCF"), PDFDict);
    const cfLength = stdCf?.lookupMaybe(PDFName.of("Length"), PDFNumber)?.asNumber();
    if (!lengthBits && cfLength) keyLengthBytes = cfLength;
  }

  return { ref, R, O, U, P, id0, keyLengthBytes, encryptMetadata, streamMethod, stringMethod };
}

interface ObjectCryptContext {
  fileKey: Uint8Array;
  streamMethod: CryptMethod;
  stringMethod: CryptMethod;
}

async function transformString(
  bytes: Uint8Array,
  ctx: ObjectCryptContext,
  objectNumber: number,
  generationNumber: number,
  direction: "encrypt" | "decrypt",
): Promise<Uint8Array> {
  return transformBytes(bytes, ctx.stringMethod, ctx.fileKey, objectNumber, generationNumber, direction);
}

async function transformStreamBytes(
  bytes: Uint8Array,
  ctx: ObjectCryptContext,
  objectNumber: number,
  generationNumber: number,
  direction: "encrypt" | "decrypt",
): Promise<Uint8Array> {
  return transformBytes(bytes, ctx.streamMethod, ctx.fileKey, objectNumber, generationNumber, direction);
}

async function transformBytes(
  bytes: Uint8Array,
  method: CryptMethod,
  fileKey: Uint8Array,
  objectNumber: number,
  generationNumber: number,
  direction: "encrypt" | "decrypt",
): Promise<Uint8Array> {
  if (method === "Identity") return bytes;
  const objectKey = computeObjectKey(fileKey, objectNumber, generationNumber, method === "AESV2");
  if (method === "RC4") return rc4(objectKey, bytes);

  // AESV2: stored form is a 16-byte random IV followed by the AES-128-CBC ciphertext.
  if (direction === "decrypt") {
    if (bytes.length < 16) return new Uint8Array(0);
    const iv = bytes.slice(0, 16);
    const ciphertext = bytes.slice(16);
    return aesCbcDecrypt(objectKey, iv, ciphertext);
  }
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const ciphertext = await aesCbcEncrypt(objectKey, iv, bytes);
  return concatBytes(iv, ciphertext);
}

/** Recursively walks a directly-nested value (never following `PDFRef`s — those are separate
 * indirect objects, handled by the caller's own top-level loop with their own object numbers)
 * and encrypts/decrypts every string and stream it finds in place. */
async function transformValue(
  value: unknown,
  ctx: ObjectCryptContext,
  objectNumber: number,
  generationNumber: number,
  direction: "encrypt" | "decrypt",
): Promise<void> {
  if (value instanceof PDFRawStream) {
    // `contents` is typed readonly, but pdf-lib's own JS implementation is a plain mutable
    // property — this is the supported way to swap a raw stream's bytes in place.
    (value as { contents: Uint8Array }).contents = await transformStreamBytes(
      value.contents,
      ctx,
      objectNumber,
      generationNumber,
      direction,
    );
    await transformValue(value.dict, ctx, objectNumber, generationNumber, direction);
    return;
  }
  if (value instanceof PDFDict) {
    for (const [key, entry] of value.entries()) {
      if (entry instanceof PDFString || entry instanceof PDFHexString) {
        value.set(key, await transformStringValue(entry, ctx, objectNumber, generationNumber, direction));
      } else {
        await transformValue(entry, ctx, objectNumber, generationNumber, direction);
      }
    }
    return;
  }
  if (value instanceof PDFArray) {
    for (let i = 0; i < value.size(); i++) {
      const entry = value.get(i);
      if (entry instanceof PDFString || entry instanceof PDFHexString) {
        value.set(i, await transformStringValue(entry, ctx, objectNumber, generationNumber, direction));
      } else {
        await transformValue(entry, ctx, objectNumber, generationNumber, direction);
      }
    }
  }
}

async function transformStringValue(
  entry: PDFString | PDFHexString,
  ctx: ObjectCryptContext,
  objectNumber: number,
  generationNumber: number,
  direction: "encrypt" | "decrypt",
): Promise<PDFHexString> {
  // Always written back as a hex string, regardless of the original's representation: both
  // encrypted ciphertext and arbitrary decrypted plaintext are just raw bytes that can contain
  // unescaped `(`, `)`, or `\` — bytes pdf-lib's literal-string writer doesn't escape, which
  // silently corrupts the file's syntax. Hex string content is always just 0-9a-f, so it's safe
  // no matter what the underlying bytes are.
  const decrypted = await transformString(entry.asBytes(), ctx, objectNumber, generationNumber, direction);
  return PDFHexString.of(bytesToHex(decrypted));
}

async function transformDocument(doc: PDFDocument, ctx: ObjectCryptContext, encryptRef: PDFRef | null, direction: "encrypt" | "decrypt"): Promise<void> {
  for (const [ref, object] of doc.context.enumerateIndirectObjects()) {
    if (encryptRef && ref === encryptRef) continue;
    await transformValue(object, ctx, ref.objectNumber, ref.generationNumber, direction);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Checks whether an empty user password already opens the document — true for the very common
 * case of PDFs that only restrict permissions (printing, copying, etc.) without requiring a
 * password to view them at all. */
export async function unlocksWithEmptyPassword(bytes: Uint8Array): Promise<boolean> {
  // `updateMetadata` (on by default) rewrites /Producer and /ModDate the instant the document is
  // loaded — before this module ever sees it. For `unlockPdf` that clobbers the still-encrypted
  // ciphertext in those two fields with fresh plaintext, so decrypting them later fails; for
  // `lockPdf` it's just an unwanted side effect. Disabled everywhere for both reasons.
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const info = parseEncryptDict(doc);
  if (!info) return true;
  const fileKey = computeFileKey(new Uint8Array(0), info.O, info.P, info.id0, info.keyLengthBytes, info.R, info.encryptMetadata);
  const computedU = computeUserEntry(fileKey, info.id0, info.R, info.U);
  return info.R === 2 ? bytesEqual(computedU, info.U) : bytesEqual(computedU.slice(0, 16), info.U.slice(0, 16));
}

/**
 * Removes password protection from a PDF, returning a new, unencrypted copy of its bytes.
 *
 * Only the *user* password is checked (the password a viewer prompts for when opening the file).
 * Documents that only restrict permissions via an owner password — the far more common case —
 * have an empty user password and are unlocked automatically without needing one supplied.
 */
export async function unlockPdf(bytes: Uint8Array, password = ""): Promise<Uint8Array> {
  // `updateMetadata` (on by default) rewrites /Producer and /ModDate the instant the document is
  // loaded — before this module ever sees it. For `unlockPdf` that clobbers the still-encrypted
  // ciphertext in those two fields with fresh plaintext, so decrypting them later fails; for
  // `lockPdf` it's just an unwanted side effect. Disabled everywhere for both reasons.
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const info = parseEncryptDict(doc);
  if (!info) return doc.save();

  const passwordBytes = new TextEncoder().encode(password);
  const fileKey = computeFileKey(passwordBytes, info.O, info.P, info.id0, info.keyLengthBytes, info.R, info.encryptMetadata);
  const computedU = computeUserEntry(fileKey, info.id0, info.R, info.U);
  const matches = info.R === 2 ? bytesEqual(computedU, info.U) : bytesEqual(computedU.slice(0, 16), info.U.slice(0, 16));
  if (!matches) throw new WrongPasswordError();

  await transformDocument(doc, { fileKey, streamMethod: info.streamMethod, stringMethod: info.stringMethod }, info.ref, "decrypt");
  doc.context.trailerInfo.Encrypt = undefined;
  return doc.save();
}

/**
 * Adds password protection to a PDF using the standard security handler (V4/R4, AES-128-CBC for
 * both streams and strings) — supported by essentially every PDF reader made in the last ~15
 * years. The owner password (which governs permissions rather than opening the file) is
 * generated randomly since this tool doesn't expose a permissions UI.
 */
export async function lockPdf(bytes: Uint8Array, password: string): Promise<Uint8Array> {
  if (!password) throw new Error("A password is required to lock a PDF.");
  // `updateMetadata` (on by default) rewrites /Producer and /ModDate the instant the document is
  // loaded — before this module ever sees it. For `unlockPdf` that clobbers the still-encrypted
  // ciphertext in those two fields with fresh plaintext, so decrypting them later fails; for
  // `lockPdf` it's just an unwanted side effect. Disabled everywhere for both reasons.
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  if (parseEncryptDict(doc)) {
    throw new Error("This PDF is already password-protected.");
  }

  const R = 4;
  const keyLengthBytes = 16;
  const userPasswordBytes = new TextEncoder().encode(password);
  const ownerPasswordBytes = crypto.getRandomValues(new Uint8Array(32));
  // All permission bits granted; bits 1-2 are reserved and must be 0 per §7.6.3.2 Table 22.
  const P = -4;

  let id0 = stringBytes(
    doc.context.trailerInfo.ID
      ? doc.context.lookupMaybe(doc.context.trailerInfo.ID, PDFArray)?.get(0)
      : undefined,
  );
  if (!id0) {
    id0 = crypto.getRandomValues(new Uint8Array(16));
    const id1 = crypto.getRandomValues(new Uint8Array(16));
    doc.context.trailerInfo.ID = doc.context.obj([PDFHexString.of(bytesToHex(id0)), PDFHexString.of(bytesToHex(id1))]);
  }

  const O = computeOwnerEntry(ownerPasswordBytes, userPasswordBytes, keyLengthBytes, R);
  const fileKey = computeFileKey(userPasswordBytes, O, P, id0, keyLengthBytes, R, true);
  const U = computeUserEntry(fileKey, id0, R, crypto.getRandomValues(new Uint8Array(16)));

  await transformDocument(doc, { fileKey, streamMethod: "AESV2", stringMethod: "AESV2" }, null, "encrypt");

  const encryptDict = doc.context.obj({
    Filter: "Standard",
    V: 4,
    R,
    Length: keyLengthBytes * 8,
    CF: { StdCF: { CFM: "AESV2", AuthEvent: "DocOpen", Length: keyLengthBytes } },
    StmF: "StdCF",
    StrF: "StdCF",
    EncryptMetadata: true,
    O: PDFHexString.of(bytesToHex(O)),
    U: PDFHexString.of(bytesToHex(U)),
    P,
  });
  const encryptRef = doc.context.register(encryptDict);
  doc.context.trailerInfo.Encrypt = encryptRef;

  // pdf-lib's default writer packs some objects into a freshly-created compressed object stream
  // as a size optimization — created during save(), entirely after the encryption pass above ran.
  // That container (and whatever it swallows) would then be written as plaintext while every
  // reader, seeing the document is encrypted, tries to AES-decrypt it anyway — corrupting the
  // file. Disabling it keeps every object a plain top-level one, matching what got encrypted.
  return doc.save({ useObjectStreams: false });
}
