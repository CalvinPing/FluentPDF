import JSZip from "jszip";

export async function zipFiles(files: { name: string; bytes: Uint8Array }[]): Promise<Uint8Array> {
  const zip = new JSZip();
  files.forEach((f) => zip.file(f.name, f.bytes));
  const blob = await zip.generateAsync({ type: "uint8array" });
  return blob;
}
