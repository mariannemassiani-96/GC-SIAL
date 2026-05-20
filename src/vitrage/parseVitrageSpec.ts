/**
 * Parse glazing composition string into outer/inner glass and spacer thickness.
 *
 * Formats:
 *   "SP10 10 ARG WE 44.2 FE 1.1"
 *   "44,6/10 WE ARG/44,2 FE1,1"
 *   "44.2 /10 ARG WE /44.2 FE 1.0"
 */
export function parseVitrageSpec(spec: string): {
  outer: string;
  inner: string;
  epaisseur: number;
} {
  const s = spec.trim();

  const m = s.match(
    /^(.+?)\s*[/]?\s*(\d+)\s+(?:ARG\s+WE|WE\s+ARG)\s*[/]?\s*(.+)$/i,
  );
  if (m) {
    return {
      outer: m[1].replace(/[/\s]+$/, '').trim(),
      inner: m[3].replace(/^[/\s]+/, '').trim(),
      epaisseur: parseInt(m[2]),
    };
  }

  const m2 = s.match(
    /^(.+?)\s*\/\s*(\d+)\s+(?:WE\s+ARG|ARG\s+WE)\s*\/\s*(.+)$/i,
  );
  if (m2) {
    return {
      outer: m2[1].trim(),
      inner: m2[3].trim(),
      epaisseur: parseInt(m2[2]),
    };
  }

  return { outer: s, inner: s, epaisseur: 10 };
}

export function extractProtoNum(proto: string): string {
  const m = proto.match(/^(\d+)\s*-/);
  return m ? m[1] : proto.trim();
}
