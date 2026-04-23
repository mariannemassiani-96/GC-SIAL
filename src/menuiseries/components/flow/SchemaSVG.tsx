// Schémas SVG pour chaque catégorie d'option du configurateur

interface SvgProps {
  size?: number;
  active?: boolean;
}

const col = (active?: boolean) => active ? '#60a5fa' : '#6b7280';
const fill = (active?: boolean) => active ? 'rgba(96,165,250,0.08)' : 'rgba(255,255,255,0.03)';

// ── Matériaux ────────────────────────────────────────────────────────

export function SvgPVC({ size = 48, active }: SvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <rect x="6" y="6" width="36" height="36" rx="2" fill={fill(active)} stroke={col(active)} strokeWidth="2" />
      {/* Multi-chambres PVC */}
      <line x1="6" y1="18" x2="42" y2="18" stroke={col(active)} strokeWidth="1" opacity=".5" />
      <line x1="6" y1="30" x2="42" y2="30" stroke={col(active)} strokeWidth="1" opacity=".5" />
      <line x1="18" y1="6" x2="18" y2="42" stroke={col(active)} strokeWidth="1" opacity=".5" />
      <line x1="30" y1="6" x2="30" y2="42" stroke={col(active)} strokeWidth="1" opacity=".5" />
      <text x="24" y="26" textAnchor="middle" fontSize="7" fill={col(active)} fontWeight="bold">PVC</text>
    </svg>
  );
}

export function SvgBois({ size = 48, active }: SvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <rect x="6" y="6" width="36" height="36" rx="2" fill={active ? 'rgba(139,69,19,0.15)' : 'rgba(139,69,19,0.05)'} stroke={active ? '#b8860b' : '#6b7280'} strokeWidth="2" />
      {/* Veinures bois */}
      <path d="M10 14 Q20 12 38 16" fill="none" stroke={active ? '#b8860b' : '#6b7280'} strokeWidth="0.8" opacity=".4" />
      <path d="M10 22 Q24 19 38 24" fill="none" stroke={active ? '#b8860b' : '#6b7280'} strokeWidth="0.8" opacity=".4" />
      <path d="M10 30 Q20 28 38 32" fill="none" stroke={active ? '#b8860b' : '#6b7280'} strokeWidth="0.8" opacity=".4" />
      <text x="24" y="26" textAnchor="middle" fontSize="7" fill={active ? '#b8860b' : '#6b7280'} fontWeight="bold">BOIS</text>
    </svg>
  );
}

export function SvgAlu({ size = 48, active }: SvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <rect x="6" y="6" width="36" height="36" rx="1" fill={active ? 'rgba(192,192,192,0.1)' : fill(active)} stroke={col(active)} strokeWidth="2" />
      {/* Profilé fin alu */}
      <rect x="8" y="8" width="32" height="32" rx="1" fill="none" stroke={col(active)} strokeWidth="0.5" />
      <text x="24" y="26" textAnchor="middle" fontSize="7" fill={col(active)} fontWeight="bold">ALU</text>
    </svg>
  );
}

// ── Ouvertures ───────────────────────────────────────────────────────

export function SvgOuverture({ type, size = 56, active }: SvgProps & { type: string }) {
  const s = col(active);
  const f = fill(active);
  return (
    <svg width={size} height={size} viewBox="0 0 56 56">
      <rect x="4" y="4" width="48" height="48" rx="2" fill={f} stroke={s} strokeWidth="2" />
      {type === 'fixe' && (
        <>
          <line x1="4" y1="4" x2="52" y2="52" stroke={s} strokeWidth="0.5" opacity=".4" />
          <line x1="52" y1="4" x2="4" y2="52" stroke={s} strokeWidth="0.5" opacity=".4" />
        </>
      )}
      {(type === 'battant_gauche' || type === 'oscillo_battant_gauche') && (
        <>
          <path d="M6 6 L28 28 L6 50" fill="none" stroke={s} strokeWidth="1.2" strokeDasharray="3 2" />
          {type.includes('oscillo') && (
            <path d="M6 50 L28 38 L50 50" fill="none" stroke={s} strokeWidth="0.8" strokeDasharray="2 2" opacity=".5" />
          )}
        </>
      )}
      {(type === 'battant_droit' || type === 'oscillo_battant_droit') && (
        <>
          <path d="M50 6 L28 28 L50 50" fill="none" stroke={s} strokeWidth="1.2" strokeDasharray="3 2" />
          {type.includes('oscillo') && (
            <path d="M6 50 L28 38 L50 50" fill="none" stroke={s} strokeWidth="0.8" strokeDasharray="2 2" opacity=".5" />
          )}
        </>
      )}
      {type === 'a_soufflet' && (
        <path d="M6 6 L28 20 L50 6" fill="none" stroke={s} strokeWidth="1.2" strokeDasharray="3 2" />
      )}
      {(type === 'coulissant' || type === 'soulevant_coulissant' || type === 'oscillo_coulissant') && (
        <>
          <line x1="28" y1="6" x2="28" y2="50" stroke={s} strokeWidth="1.5" />
          <path d="M34 24 L42 28 L34 32" fill={s} />
        </>
      )}
      {type === 'galandage' && (
        <>
          <line x1="28" y1="6" x2="28" y2="50" stroke={s} strokeWidth="1.5" />
          <path d="M34 24 L42 28 L34 32" fill={s} />
          <rect x="50" y="4" width="4" height="48" fill={s} opacity=".15" />
        </>
      )}
    </svg>
  );
}

// ── Vitrages ─────────────────────────────────────────────────────────

export function SvgVitrage({ layers, size = 48, active }: SvgProps & { layers: 2 | 3 }) {
  const s = col(active);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      {/* Cadre */}
      <rect x="4" y="4" width="40" height="40" rx="2" fill="none" stroke={s} strokeWidth="1.5" />
      {layers === 2 ? (
        <>
          <rect x="10" y="8" width="3" height="32" rx="1" fill={s} opacity=".3" />
          <rect x="35" y="8" width="3" height="32" rx="1" fill={s} opacity=".3" />
          <line x1="13" y1="24" x2="35" y2="24" stroke={s} strokeWidth="0.5" strokeDasharray="2 2" opacity=".3" />
          <text x="24" y="20" textAnchor="middle" fontSize="6" fill={s} opacity=".7">2x</text>
        </>
      ) : (
        <>
          <rect x="8" y="8" width="3" height="32" rx="1" fill={s} opacity=".3" />
          <rect x="22.5" y="8" width="3" height="32" rx="1" fill={s} opacity=".3" />
          <rect x="37" y="8" width="3" height="32" rx="1" fill={s} opacity=".3" />
          <text x="24" y="20" textAnchor="middle" fontSize="6" fill={s} opacity=".7">3x</text>
        </>
      )}
    </svg>
  );
}

// ── Formes ────────────────────────────────────────────────────────────

export function SvgForme({ forme, size = 48, active }: SvgProps & { forme: string }) {
  const s = col(active);
  const f = fill(active);
  switch (forme) {
    case 'rectangulaire':
      return <svg width={size} height={size}><rect x="8" y="8" width="32" height="32" rx="1" fill={f} stroke={s} strokeWidth="2" /></svg>;
    case 'cintre':
      return <svg width={size} height={size}><path d="M8 40 V18 A16 16 0 0 1 40 18 V40 Z" fill={f} stroke={s} strokeWidth="2" /></svg>;
    case 'arc_surbaisse':
      return <svg width={size} height={size}><path d="M8 40 V22 Q24 8 40 22 V40 Z" fill={f} stroke={s} strokeWidth="2" /></svg>;
    case 'trapeze':
      return <svg width={size} height={size}><path d="M12 40 L4 8 H44 L36 40 Z" fill={f} stroke={s} strokeWidth="2" /></svg>;
    case 'triangle':
      return <svg width={size} height={size}><path d="M24 6 L42 40 H6 Z" fill={f} stroke={s} strokeWidth="2" /></svg>;
    case 'rond':
      return <svg width={size} height={size}><circle cx="24" cy="24" r="18" fill={f} stroke={s} strokeWidth="2" /></svg>;
    case 'oeil_de_boeuf':
      return <svg width={size} height={size}><ellipse cx="24" cy="24" rx="20" ry="14" fill={f} stroke={s} strokeWidth="2" /></svg>;
    default:
      return <svg width={size} height={size}><rect x="8" y="8" width="32" height="32" fill={f} stroke={s} strokeWidth="2" /></svg>;
  }
}
