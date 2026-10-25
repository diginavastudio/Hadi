export const rp = (v: number) => "Rp" + Math.round(v).toLocaleString("id-ID");
export const pct = (v: number) => v.toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "%";
