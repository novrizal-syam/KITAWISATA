/** Round to the nearest Rp 1,000, as the prototypes do for fares and instalments. */
export const roundThousand = (n: number) => Math.round(n / 1000) * 1000;

export const formatRupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");
