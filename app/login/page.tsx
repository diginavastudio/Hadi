import { login } from "../actions";

export default async function Login(props: { searchParams: Promise<{ e?: string }> }) {
  const searchParams = await props.searchParams;
  return (
    <div style={{ maxWidth: 340, margin: "80px auto" }}>
      <h1>Masuk Admin</h1>
      {searchParams.e && <div className="err">Password salah.</div>}
      <form action={login} className="f" style={{ gridTemplateColumns: "1fr" }}>
        <label>Password<input type="password" name="password" required autoFocus /></label>
        <button>Masuk</button>
      </form>
    </div>
  );
}
