// Autentikasi admin tunggal. Password dan secret HANYA dari environment variable.
// Memakai Web Crypto supaya jalan di middleware (edge) maupun server Node.

const enc = new TextEncoder();

async function hmac(secret: string, pesan: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(pesan));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const COOKIE = "kop_sess";

export async function tokenSesi(): Promise<string> {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) throw new Error("SESSION_SECRET belum diisi (minimal 16 karakter).");
  return hmac(secret, "admin-koperasi");
}

export async function sesiValid(cookie: string | undefined): Promise<boolean> {
  if (!cookie) return false;
  try {
    const harapan = await tokenSesi();
    if (cookie.length !== harapan.length) return false;
    let d = 0;
    for (let i = 0; i < harapan.length; i++) d |= cookie.charCodeAt(i) ^ harapan.charCodeAt(i);
    return d === 0;
  } catch {
    return false;
  }
}

export function passwordBenar(input: string): boolean {
  const p = process.env.ADMIN_PASSWORD;
  if (!p) throw new Error("ADMIN_PASSWORD belum diisi.");
  if (input.length !== p.length) return false;
  let d = 0;
  for (let i = 0; i < p.length; i++) d |= input.charCodeAt(i) ^ p.charCodeAt(i);
  return d === 0;
}
