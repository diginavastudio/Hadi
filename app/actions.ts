"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { COOKIE, passwordBenar, tokenSesi } from "@/lib/auth";
import { tambahAnggota, cairkanPinjaman, catatPembayaran } from "@/lib/db";
import { getStore } from "@/lib/store";

const pesan = (e: unknown) => encodeURIComponent(e instanceof Error ? e.message : "Terjadi kesalahan");
const f = (fd: FormData, k: string) => String(fd.get(k) ?? "");

export async function login(fd: FormData) {
  if (!passwordBenar(f(fd, "password"))) redirect("/login?e=1");
  (await cookies()).set(COOKIE, await tokenSesi(), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7,
  });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(COOKIE);
  redirect("/login");
}

export async function aksiTambahAnggota(fd: FormData) {
  try {
    await tambahAnggota({ nama: f(fd, "nama"), noHp: f(fd, "noHp"), alamat: f(fd, "alamat"), usaha: f(fd, "usaha"), petugasId: f(fd, "petugasId") });
  } catch (e) { redirect(`/anggota?err=${pesan(e)}`); }
  revalidatePath("/anggota");
  redirect("/anggota?ok=Anggota ditambahkan");
}

export async function aksiCairkan(fd: FormData) {
  try {
    await cairkanPinjaman({ anggotaId: f(fd, "anggotaId"), tglCair: f(fd, "tglCair") });
  } catch (e) { redirect(`/pinjaman?err=${pesan(e)}`); }
  revalidatePath("/pinjaman");
  redirect("/pinjaman?ok=Pinjaman dicairkan");
}

export async function aksiSetoran(fd: FormData) {
  try {
    await catatPembayaran({ pinjamanId: f(fd, "pinjamanId"), tgl: f(fd, "tgl"), jumlah: Number(f(fd, "jumlah")), catatan: f(fd, "catatan") });
  } catch (e) { redirect(`/setoran?err=${pesan(e)}`); }
  revalidatePath("/setoran");
  redirect("/setoran?ok=Setoran dicatat");
}

export async function aksiSetup() {
  let hasil: string;
  try { hasil = await getStore().ensureSchema(); } catch (e) { redirect(`/setup?err=${pesan(e)}`); }
  redirect(`/setup?ok=${encodeURIComponent(hasil)}`);
}
