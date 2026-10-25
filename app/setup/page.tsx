import { aksiSetup } from "../actions";
import { Pesan } from "../pesan";

export default async function Setup(props: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const searchParams = await props.searchParams;
  return (
    <>
      <h1>Setup Google Sheet</h1>
      <Pesan sp={searchParams} />
      <p>Membuat tab dan header yang belum ada, lalu mengisi tab Parameter jika masih kosong. Aman dijalankan ulang: tidak menimpa data yang sudah ada.</p>
      <form action={aksiSetup}><button>Siapkan struktur Sheet</button></form>
    </>
  );
}
