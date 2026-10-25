export function Pesan({ sp }: { sp: { ok?: string; err?: string } }) {
  return (
    <>
      {sp.err && <div className="err">{sp.err}</div>}
      {sp.ok && <div className="ok">{sp.ok}</div>}
    </>
  );
}
