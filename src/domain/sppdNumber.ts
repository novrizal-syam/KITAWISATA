const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

/** e.g. sppdNumber(46, "NTI", 2026-10-08) -> "046/SPPD/NTI/X/2026" (Roman month of issue). */
export function sppdNumber(seq: number, companyCode: string, issuedOn: Date): string {
  return `${String(seq).padStart(3, "0")}/SPPD/${companyCode}/${ROMAN[issuedOn.getUTCMonth()]}/${issuedOn.getUTCFullYear()}`;
}
