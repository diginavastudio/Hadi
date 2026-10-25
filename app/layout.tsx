import "./globals.css";
import Link from "next/link";
import { cookies } from "next/headers";
import { COOKIE, sesiValid } from "@/lib/auth";
import { logout } from "./actions";

export const metadata = { title: "Koperasi Mikro" };
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const masuk = await sesiValid((await cookies()).get(COOKIE)?.value);
  const mock = process.env.MOCK === "1" && !(process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  return (
    <html lang="id">
      <body>
        {mock && <div className="mock">MODE UJI: data tiruan di memori, bukan data sungguhan. Tidak tersambung ke Google Sheet.</div>}
        {masuk && (
          <nav>
            <b>Koperasi Mikro</b>
            <Link href="/">Dashboard</Link>
            <Link href="/anggota">Anggota</Link>
            <Link href="/pinjaman">Pinjaman</Link>
            <Link href="/setoran">Setoran</Link>
            <Link href="/parameter">Parameter</Link>
            <Link href="/setup">Setup</Link>
            <form action={logout} style={{ marginLeft: "auto" }}>
              <button style={{ background: "#667085" }}>Keluar</button>
            </form>
          </nav>
        )}
        <main>{children}</main>
      </body>
    </html>
  );
}
