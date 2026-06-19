import { Document, Page, Text, View, StyleSheet, pdf, Svg, Rect, Line, Circle } from '@react-pdf/renderer';
import type { Affaire, ResultatAffaire, ResultatTravee, Travee } from '../types';
import { ACCESSOIRES } from '../constants/profils';
import { TYPES_GC, TYPES_MC, POSE_DATA } from '../constants/typesGC';
import { USINAGE_ANGLE } from '../constants/parametres';
import { FIXATIONS } from '../constants/fixations';

const s = StyleSheet.create({
  page: { padding: 30, fontSize: 8, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, borderBottom: '1 solid #333', paddingBottom: 8 },
  title: { fontSize: 14, fontWeight: 'bold' },
  subtitle: { fontSize: 10, color: '#666', marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 20, marginBottom: 4, fontSize: 8 },
  metaLabel: { color: '#666', width: 70 },
  metaValue: { fontWeight: 'bold' },
  section: { marginTop: 10, marginBottom: 6 },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', marginBottom: 4, backgroundColor: '#eee', padding: 4 },
  table: { width: '100%' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#ddd', borderBottom: '1 solid #999', paddingVertical: 3 },
  tableRow: { flexDirection: 'row', borderBottom: '0.5 solid #ccc', paddingVertical: 2 },
  cellSm: { width: '8%', paddingHorizontal: 2, textAlign: 'right' },
  cellMd: { width: '12%', paddingHorizontal: 2 },
  cellXl: { width: '35%', paddingHorizontal: 2 },
  bold: { fontWeight: 'bold' },
  controlBox: { marginTop: 16, borderTop: '1 solid #333', paddingTop: 8 },
  controlRow: { flexDirection: 'row', gap: 20, marginBottom: 4 },
  checkbox: { width: 10, height: 10, border: '1 solid #333', marginRight: 4 },
  usinageInfo: { marginTop: 6, padding: 6, backgroundColor: '#f5f5f5', borderRadius: 2 },
});

/**
 * Schéma de la lisse en SVG react-pdf (lignes + rectangles uniquement, pas de SVG Text).
 * Labels affichés en dessous avec des Text PDF normaux.
 */
function SchemaLissePDF({ rt, lisseLabel }: { rt: ResultatTravee; lisseLabel: string }) {
  const u = rt.usinages[0];
  if (!u) return null;

  const L = rt.longueurLisse;
  const svgW = 530;
  const svgH = 50;
  const pad = 8;
  const barY = 16;
  const barH = 16;
  const scale = (svgW - 2 * pad) / L;
  const toX = (mm: number) => pad + mm * scale;

  const raidSet = new Set(rt.posRaidisseurs.map((p) => Math.round(p * 10) / 10));

  const barreaux = u.percageLisse.filter(
    (p) => !raidSet.has(Math.round(p * 10) / 10)
  );

  const allPos = [...u.percageLisse].sort((a, b) => a - b);
  const firstHole = allPos.length > 0 ? allPos[0] : 0;
  const lastHole = allPos.length > 0 ? allPos[allPos.length - 1] : L;
  const bordG = firstHole;
  const bordD = L - lastHole;
  const dimY = barY + barH + 4;

  return (
    <View style={{ marginTop: 2, marginBottom: 2 }}>
      <Text style={{ fontSize: 7, fontWeight: 'bold', marginBottom: 2 }}>
        {`Lisse ${lisseLabel} — L = ${L.toFixed(1)} mm — entraxe = ${rt.entraxeEff.toFixed(1)} mm`}
      </Text>
      <Svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: svgW, height: svgH }}>
        {/* Lisse bar */}
        <Rect x={toX(0)} y={barY} width={toX(L) - toX(0)} height={barH} fill="#e8e8e8" stroke="#999" strokeWidth={0.5} />

        {/* Barreaux (blue) */}
        {barreaux.map((pos, i) => (
          <Line key={`b${i}`} x1={toX(pos)} y1={barY + 1} x2={toX(pos)} y2={barY + barH - 1} stroke="#2563eb" strokeWidth={0.4} />
        ))}

        {/* Raidisseurs (red) */}
        {rt.posRaidisseurs.map((pos, i) => (
          <Line key={`r${i}`} x1={toX(pos)} y1={barY - 6} x2={toX(pos)} y2={barY + barH + 6} stroke="#dc2626" strokeWidth={1.2} />
        ))}

        {/* Cote bord gauche */}
        {allPos.length > 0 && (
          <>
            <Line x1={toX(0)} y1={dimY} x2={toX(firstHole)} y2={dimY} stroke="#333" strokeWidth={0.4} />
            <Line x1={toX(0)} y1={dimY - 2} x2={toX(0)} y2={dimY + 2} stroke="#333" strokeWidth={0.4} />
            <Line x1={toX(firstHole)} y1={dimY - 2} x2={toX(firstHole)} y2={dimY + 2} stroke="#333" strokeWidth={0.4} />
          </>
        )}

        {/* Cote bord droit */}
        {allPos.length > 0 && (
          <>
            <Line x1={toX(lastHole)} y1={dimY} x2={toX(L)} y2={dimY} stroke="#333" strokeWidth={0.4} />
            <Line x1={toX(lastHole)} y1={dimY - 2} x2={toX(lastHole)} y2={dimY + 2} stroke="#333" strokeWidth={0.4} />
            <Line x1={toX(L)} y1={dimY - 2} x2={toX(L)} y2={dimY + 2} stroke="#333" strokeWidth={0.4} />
          </>
        )}

        {/* Angle de coupe gauche */}
        <Text x={toX(0) + 1} y={barY - 1} style={{ fontSize: 5, color: '#666' }}>{rt.travee.coupeG}°</Text>
        {/* Angle de coupe droit */}
        <Text x={toX(L) - 12} y={barY - 1} style={{ fontSize: 5, color: '#666' }}>{rt.travee.coupeD}°</Text>
      </Svg>
      {/* Dimension labels below SVG */}
      {allPos.length > 0 && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: -2 }}>
          <Text style={{ fontSize: 5.5, color: '#333', marginLeft: pad }}>{bordG.toFixed(1)} mm</Text>
          <Text style={{ fontSize: 5.5, color: '#333', marginRight: pad }}>{bordD.toFixed(1)} mm</Text>
        </View>
      )}
      <Text style={{ fontSize: 5.5, color: '#dc2626', marginTop: 1 }}>
        Raidisseurs : {rt.posRaidisseurs.map((p) => p.toFixed(1)).join(' | ')} mm
      </Text>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 1 }}>
        <Text style={{ fontSize: 5, color: '#666' }}>
          <Text style={{ color: '#dc2626' }}>|</Text> Raid.{'  '}
          <Text style={{ color: '#2563eb' }}>|</Text> Barr.
        </Text>
      </View>
    </View>
  );
}

function SchemaConfigPDF({ rt, parentTravee }: { rt: ResultatTravee; parentTravee?: Travee }) {
  // Always draw the full shape from the parent travee
  const src = parentTravee ?? rt.travee;
  const hasAngleG = src.coupeG === '45';
  const hasAngleD = src.coupeD === '45';
  const isU = hasAngleG && hasAngleD;

  // Determine which part is current (for highlighting)
  const currentId = rt.travee.id;
  const isRetourD = currentId.endsWith('_retD');
  const isRetourG = currentId.endsWith('_retG');
  const isCentre = !isRetourD && !isRetourG;

  const svgW = 500;
  const px = 0.07;
  const barH = 6;

  const centreW = src.largeur * px;
  const leftLen = hasAngleG ? (isU ? (src.largeur3 || 0) : (src.largeur2 || 0)) : 0;
  const rightLen = hasAngleD ? (src.largeur2 || 0) : 0;
  const leftH = leftLen * px;
  const rightH = rightLen * px;
  const maxRetour = Math.max(leftH, rightH);
  const svgH = 50 + maxRetour + 20;

  const originX = svgW / 2 - centreW / 2;
  const originY = 20;

  const fixLabel = (id: string) => FIXATIONS[id as keyof typeof FIXATIONS]?.label ?? id;

  const centreColor = isCentre ? '#3b82f6' : '#3b82f680';
  const leftColor = isRetourG ? '#f59e0b' : '#f59e0b80';
  const rightColor = isRetourD ? '#10b981' : '#10b98180';

  return (
    <Svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: svgW, height: svgH, marginBottom: 4 }}>
      {/* EXT / INT */}
      <Text x={2} y={8} style={{ fontSize: 5, color: '#999' }}>EXT</Text>
      <Text x={2} y={svgH - 4} style={{ fontSize: 5, color: '#999' }}>INT</Text>

      {/* Centre bar */}
      <Rect x={originX} y={originY - barH / 2} width={centreW} height={barH} fill={centreColor} opacity={isCentre ? 0.5 : 0.2} />
      <Line x1={originX} y1={originY} x2={originX + centreW} y2={originY} stroke={centreColor} strokeWidth={1.5} />

      {/* Left branch — goes DOWN (toward INT) */}
      {hasAngleG && leftH > 0 && (
        <>
          <Rect x={originX - barH / 2} y={originY} width={barH} height={leftH} fill={leftColor} opacity={isRetourG ? 0.4 : 0.15} />
          <Line x1={originX} y1={originY} x2={originX} y2={originY + leftH} stroke={leftColor} strokeWidth={1.5} />
          <Text x={originX - 14} y={originY + leftH / 2} style={{ fontSize: 6, color: leftColor }}>{leftLen}</Text>
        </>
      )}

      {/* Right branch — goes DOWN (toward INT) */}
      {hasAngleD && rightH > 0 && (
        <>
          <Rect x={originX + centreW - barH / 2} y={originY} width={barH} height={rightH} fill={rightColor} opacity={isRetourD ? 0.4 : 0.15} />
          <Line x1={originX + centreW} y1={originY} x2={originX + centreW} y2={originY + rightH} stroke={rightColor} strokeWidth={1.5} />
          <Text x={originX + centreW + 4} y={originY + rightH / 2} style={{ fontSize: 6, color: rightColor }}>{rightLen}</Text>
        </>
      )}

      {/* Raidisseurs on centre */}
      {isCentre && rt.posRaidisseurs.map((pos, i) => (
        <Rect key={`r-${i}`} x={originX + pos * px - 2} y={originY - 10} width={4} height={20} fill="#ef4444" opacity={0.6} />
      ))}

      {/* Centre dimension */}
      <Line x1={originX} y1={originY - 10} x2={originX + centreW} y2={originY - 10} stroke="#666" strokeWidth={0.3} />
      <Text x={originX + centreW / 2 - 10} y={originY - 14} style={{ fontSize: 6 }}>{src.largeur} mm</Text>

      {/* Fixation labels */}
      {!hasAngleG && <Text x={originX - 2} y={originY + 14} style={{ fontSize: 5, color: '#999' }}>{fixLabel(src.fixG)}</Text>}
      {!hasAngleD && <Text x={originX + centreW - 20} y={originY + 14} style={{ fontSize: 5, color: '#999' }}>{fixLabel(src.fixD)}</Text>}
      {hasAngleG && <Text x={originX - 8} y={originY + 10} style={{ fontSize: 5, color: '#f59e0b' }}>90°</Text>}
      {hasAngleD && <Text x={originX + centreW + 2} y={originY + 10} style={{ fontSize: 5, color: '#10b981' }}>90°</Text>}

      {/* Raidisseur info */}
      <Text x={2} y={originY + 14} style={{ fontSize: 6, color: '#ef4444' }}>
        {rt.travee.repere} — {rt.nbRaid} raidisseurs — entraxe {rt.entraxeEff.toFixed(0)} mm
      </Text>

      {/* Retour end fixations */}
      {hasAngleG && (
        (src.fixRetourG ?? 'libre') === 'mur'
          ? <Rect x={originX - 4} y={originY + leftH - 1} width={8} height={3} fill="#999" />
          : <Circle cx={originX} cy={originY + leftH} r={2.5} fill="none" stroke="#ef4444" strokeWidth={0.7} />
      )}
      {hasAngleD && (
        (src.fixRetourD ?? 'libre') === 'mur'
          ? <Rect x={originX + centreW - 4} y={originY + rightH - 1} width={8} height={3} fill="#999" />
          : <Circle cx={originX + centreW} cy={originY + rightH} r={2.5} fill="none" stroke="#ef4444" strokeWidth={0.7} />
      )}
    </Svg>
  );
}

function FicheFabricationPage({ affaire, rt, parentTravee }: { affaire: Affaire; rt: ResultatTravee; parentTravee?: Travee }) {
  const t = rt.travee;
  const gc = TYPES_GC[t.typeGC];
  const mc = TYPES_MC[t.mc];
  const pose = POSE_DATA[t.pose];
  const usinageAngle = USINAGE_ANGLE[t.angle] ?? USINAGE_ANGLE[0];
  const lisseLabels = ['INF', 'SUP', 'MED'];

  const raidSet = new Set(rt.posRaidisseurs.map((p) => Math.round(p * 10) / 10));

  return (
    <Page size="A4" style={s.page}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>SIAL — Fiche de Fabrication</Text>
          <Text style={s.subtitle}>Kawneer 1800 Kadence</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.bold}>Réf : {affaire.ref}</Text>
          <Text>Date : {affaire.date}</Text>
        </View>
      </View>

      {/* Meta */}
      <View style={s.metaRow}>
        <Text><Text style={s.metaLabel}>Client : </Text><Text style={s.metaValue}>{affaire.client}</Text></Text>
        <Text><Text style={s.metaLabel}>Chantier : </Text><Text style={s.metaValue}>{affaire.chantier}</Text></Text>
        <Text><Text style={s.metaLabel}>Coloris : </Text><Text style={s.metaValue}>{affaire.coloris}</Text></Text>
      </View>
      <View style={s.metaRow}>
        <Text><Text style={s.metaLabel}>Type GC : </Text><Text style={s.metaValue}>{gc.label}</Text></Text>
        <Text><Text style={s.metaLabel}>Pose : </Text><Text style={s.metaValue}>{pose.label}</Text></Text>
        <Text><Text style={s.metaLabel}>MC : </Text><Text style={s.metaValue}>{mc.label}</Text></Text>
      </View>

      {/* Travee info */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>
          Travée {rt.travee.repere} — {rt.travee.etage} — L={rt.travee.largeur}mm — H={t.hauteur}mm — Qté={rt.travee.qte}
        </Text>
      </View>

      {/* Schema de configuration avec position raidisseurs */}
      <View style={s.section}>
        <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 3 }}>Schéma de configuration</Text>
        <SchemaConfigPDF rt={rt} parentTravee={parentTravee} />
      </View>

      {/* Debits table */}
      <View style={s.section}>
        <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 3 }}>Débits</Text>
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={s.cellMd}>Réf</Text>
            <Text style={s.cellXl}>Désignation</Text>
            <Text style={s.cellMd}>L (mm)</Text>
            <Text style={s.cellSm}>Qté</Text>
          </View>
          {rt.nomenclature.filter((n) => n.type === 'profil').map((n, i) => {
            const needsSegments = n.longueur > 6300;
            const isMainCourante = ['180030', '180032', '180033'].includes(n.ref);
            const nbSeg = needsSegments ? Math.ceil(n.longueur / 6300) : 0;
            const baseLen = needsSegments ? Math.ceil(n.longueur / nbSeg) : 0;
            return (
              <View key={i}>
                <View style={s.tableRow}>
                  <Text style={s.cellMd}>{n.ref}</Text>
                  <Text style={s.cellXl}>{n.label}{needsSegments ? ` → ${nbSeg} segments` : ''}</Text>
                  <Text style={s.cellMd}>{n.longueur.toFixed(1)}</Text>
                  <Text style={s.cellSm}>{n.qte}</Text>
                </View>
                {needsSegments && (
                  <View style={{ paddingLeft: 15, paddingBottom: 2 }}>
                    {(() => {
                      const isLisse = n.ref === '180010';
                      const allHoles = isLisse && rt.usinages.length > 0 ? rt.usinages[0].percageLisse : [];
                      const cutPositions = [0];
                      let rest = n.longueur;
                      for (let si = 0; si < nbSeg; si++) {
                        let coupe = baseLen;
                        if (isMainCourante && si === 0) coupe = Math.min(baseLen + 200, 6300);
                        if (si === nbSeg - 1) coupe = rest;
                        if (coupe > 6300) coupe = 6300;
                        cutPositions.push(cutPositions[cutPositions.length - 1] + coupe);
                        rest -= coupe;
                      }
                      return Array.from({ length: nbSeg }, (_, si) => {
                        const segStart = cutPositions[si];
                        const segEnd = cutPositions[si + 1];
                        const segLen = segEnd - segStart;
                        const segHoles = allHoles.filter((h: number) => h >= segStart && h < segEnd);
                        const firstHole = segHoles.length > 0 ? segHoles[0] - segStart : -1;
                        const lastHole = segHoles.length > 0 ? segEnd - segHoles[segHoles.length - 1] : -1;
                        return (
                          <Text key={si} style={{ fontSize: 6, color: '#444' }}>
                            seg.{si + 1}/{nbSeg} : {Math.round(segLen)} mm
                            {isMainCourante && si === 0 ? ' (+200mm décalage MC)' : ''}
                            {isLisse && firstHole >= 0 ? `  —  1er trou: ${Math.round(firstHole)}mm du bord G  |  dernier trou: ${Math.round(lastHole)}mm du bord D  (${segHoles.length} trous)` : ''}
                          </Text>
                        );
                      });
                    })()}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Schema + Usinages per lisse */}
      {rt.usinages.length > 0 && (
        <View style={s.section}>
          <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 3 }}>Usinages Lisses</Text>

          {/* Schema (one for all lisses since identical) */}
          <SchemaLissePDF rt={rt} lisseLabel={lisseLabels[0]} />

          {/* Positions table */}
          {rt.usinages.map((u, li) => {
            const posBarreaux = u.percageLisse.filter(
              (p) => !raidSet.has(Math.round(p * 10) / 10)
            );
            const posRaid = u.percageLisse.filter((p) => raidSet.has(Math.round(p * 10) / 10));

            return (
              <View key={li} style={{ marginTop: 3 }}>
                <Text style={{ fontSize: 7, fontWeight: 'bold', marginBottom: 1 }}>
                  Lisse {lisseLabels[li]} — Positions de perçage
                </Text>
                <View style={s.table}>
                  <View style={{ ...s.tableHeader, backgroundColor: '#eee' }}>
                    <Text style={{ width: '28%', paddingHorizontal: 2, fontSize: 6 }}>Opération</Text>
                    <Text style={{ width: '7%', paddingHorizontal: 2, fontSize: 6, textAlign: 'right' }}>Nb</Text>
                    <Text style={{ width: '65%', paddingHorizontal: 2, fontSize: 6 }}>Positions X (mm)</Text>
                  </View>
                  <View style={s.tableRow}>
                    <Text style={{ width: '28%', paddingHorizontal: 2, fontSize: 6 }}>Perçage barreaux</Text>
                    <Text style={{ width: '7%', paddingHorizontal: 2, fontSize: 6, textAlign: 'right' }}>{posBarreaux.length}</Text>
                    <Text style={{ width: '65%', paddingHorizontal: 2, fontSize: 5.5 }}>{posBarreaux.map((p) => p.toFixed(1)).join(' ; ')}</Text>
                  </View>
                  <View style={s.tableRow}>
                    <Text style={{ width: '28%', paddingHorizontal: 2, fontSize: 6 }}>Perçage raidisseurs</Text>
                    <Text style={{ width: '7%', paddingHorizontal: 2, fontSize: 6, textAlign: 'right' }}>{posRaid.length}</Text>
                    <Text style={{ width: '65%', paddingHorizontal: 2, fontSize: 6 }}>{posRaid.map((p) => p.toFixed(1)).join(' ; ')}</Text>
                  </View>
                  <View style={{ ...s.tableRow, backgroundColor: '#f0f0f0' }}>
                    <Text style={{ width: '28%', paddingHorizontal: 2, fontSize: 6, fontWeight: 'bold' }}>Fraisage raidisseur</Text>
                    <Text style={{ width: '7%', paddingHorizontal: 2, fontSize: 6, textAlign: 'right' }}>{u.percageLisseRaidisseur.length}</Text>
                    <Text style={{ width: '65%', paddingHorizontal: 2, fontSize: 6, fontWeight: 'bold' }}>{u.percageLisseRaidisseur.map((p) => p.toFixed(1)).join(' ; ')}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Raidisseur usinages */}
      <View style={s.usinageInfo}>
        <Text style={{ fontSize: 8, fontWeight: 'bold', marginBottom: 2 }}>
          Usinages Raidisseur (180000) — Angle {t.angle}°
        </Text>
        <Text style={{ fontSize: 7 }}>
          Goupille lisse basse : X=15mm, Y={usinageAngle.goupilleRaidY}mm, Ø{usinageAngle.goupilleDiametre}mm
        </Text>
        <Text style={{ fontSize: 7 }}>
          Fraisage : Ø{usinageAngle.fraisageDiametre}mm, L={usinageAngle.longueurFraisage}mm
        </Text>
        <Text style={{ fontSize: 7 }}>
          Contreperçage : Ø{usinageAngle.contrepercageDiametre}mm
        </Text>
      </View>

      {/* Control zone */}
      <View style={s.controlBox}>
        <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 6 }}>Contrôle Qualité</Text>
        <View style={s.controlRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={s.checkbox} />
            <Text>Débits vérifiés</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={s.checkbox} />
            <Text>Usinages vérifiés</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={s.checkbox} />
            <Text>Assemblage vérifié</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
          <Text>Signature : ___________________</Text>
          <Text>Date : ___________________</Text>
        </View>
      </View>
    </Page>
  );
}

function BonCommandePage({ affaire, resultat }: { affaire: Affaire; resultat: ResultatAffaire }) {
  const accessMap = new Map<string, number>();
  for (const item of resultat.nomenclatureGlobale) {
    if (item.type === 'accessoire') {
      accessMap.set(item.ref, (accessMap.get(item.ref) ?? 0) + item.qte);
    }
  }

  return (
    <Page size="A4" style={s.page}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>SIAL — Bon de Commande Kawneer</Text>
          <Text style={s.subtitle}>Système 1800 Kadence</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.bold}>Réf : {affaire.ref}</Text>
          <Text>Date : {affaire.date}</Text>
          <Text>Client : {affaire.client}</Text>
        </View>
      </View>

      <View style={s.metaRow}>
        <Text><Text style={s.metaLabel}>Chantier : </Text><Text style={s.metaValue}>{affaire.chantier}</Text></Text>
        <Text><Text style={s.metaLabel}>Coloris : </Text><Text style={s.metaValue}>{affaire.coloris}</Text></Text>
      </View>

      {/* Profilés */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Profilés</Text>
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={s.cellMd}>Réf</Text>
            <Text style={s.cellXl}>Désignation</Text>
            <Text style={s.cellSm}>Pièces</Text>
            <Text style={s.cellSm}>Barres</Text>
            <Text style={s.cellMd}>Chute (mm)</Text>
            <Text style={s.cellSm}>% chute</Text>
          </View>
          {resultat.optimBarres.map((opt, i) => (
            <View key={i} style={s.tableRow}>
              <Text style={s.cellMd}>{opt.ref}</Text>
              <Text style={s.cellXl}>{opt.label}</Text>
              <Text style={s.cellSm}>{opt.totalPieces}</Text>
              <Text style={{ ...s.cellSm, fontWeight: 'bold' }}>{opt.nbBarres}</Text>
              <Text style={s.cellMd}>{opt.barres.reduce((sum, b) => sum + b.chute, 0).toFixed(0)}</Text>
              <Text style={s.cellSm}>{(opt.tauxChute * 100).toFixed(1)}%</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Detail aboutages */}
      {resultat.optimBarres.filter(opt => opt.barres.some(b => b.pieces.some(p => p.label.includes('seg.')))).map((opt, oi) => (
        <View key={`about_${oi}`} style={s.section}>
          <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 4 }}>Détail aboutage — {opt.ref} ({opt.label})</Text>
          {opt.barres.map((barre, bi) => {
            const hasSegments = barre.pieces.some(p => p.label.includes('seg.'));
            if (!hasSegments) return null;
            return (
              <View key={bi} style={{ marginBottom: 4 }}>
                <Text style={{ fontSize: 7, fontWeight: 'bold', marginBottom: 1 }}>
                  Barre {bi + 1} — 6400mm — Chute: {barre.chute.toFixed(0)}mm
                </Text>
                <View style={s.table}>
                  <View style={{ ...s.tableHeader, backgroundColor: '#f5f5f5' }}>
                    <Text style={{ width: '8%', paddingHorizontal: 2, fontSize: 6 }}>N°</Text>
                    <Text style={{ width: '42%', paddingHorizontal: 2, fontSize: 6 }}>Pièce</Text>
                    <Text style={{ width: '20%', paddingHorizontal: 2, fontSize: 6, textAlign: 'right' }}>Longueur</Text>
                    <Text style={{ width: '30%', paddingHorizontal: 2, fontSize: 6 }}>Travée</Text>
                  </View>
                  {barre.pieces.map((p, pi) => (
                    <View key={pi} style={s.tableRow}>
                      <Text style={{ width: '8%', paddingHorizontal: 2, fontSize: 6 }}>{pi + 1}</Text>
                      <Text style={{ width: '42%', paddingHorizontal: 2, fontSize: 6, fontWeight: 'bold' }}>{p.label}</Text>
                      <Text style={{ width: '20%', paddingHorizontal: 2, fontSize: 6, textAlign: 'right' }}>{p.longueur.toFixed(1)} mm</Text>
                      <Text style={{ width: '30%', paddingHorizontal: 2, fontSize: 6 }}>{p.traveeRef}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      ))}

      {/* Accessoires */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Accessoires</Text>
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={s.cellMd}>Réf</Text>
            <Text style={s.cellXl}>Désignation</Text>
            <Text style={s.cellSm}>Qté</Text>
            <Text style={s.cellSm}>Cond.</Text>
            <Text style={s.cellSm}>Colis</Text>
          </View>
          {[...accessMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([ref, qty]) => {
            const cond = ACCESSOIRES[ref]?.cond ?? 1;
            return (
              <View key={ref} style={s.tableRow}>
                <Text style={s.cellMd}>{ref}</Text>
                <Text style={s.cellXl}>{ACCESSOIRES[ref]?.label ?? ref}</Text>
                <Text style={s.cellSm}>{qty}</Text>
                <Text style={s.cellSm}>{cond}</Text>
                <Text style={{ ...s.cellSm, fontWeight: 'bold' }}>{Math.ceil(qty / cond)}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </Page>
  );
}

export async function generateFicheFabPDF(affaire: Affaire, resultat: ResultatAffaire): Promise<Blob> {
  const doc = (
    <Document>
      {resultat.travees.map((rt) => {
        const parentId = rt.travee.id.replace(/_ret[DG]$/, '');
        const parentTravee = affaire.travees.find(tr => tr.id === parentId);
        return <FicheFabricationPage key={rt.travee.id} affaire={affaire} rt={rt} parentTravee={parentTravee} />;
      })}
    </Document>
  );
  return await pdf(doc).toBlob();
}

export async function generateBonCommandePDF(affaire: Affaire, resultat: ResultatAffaire): Promise<Blob> {
  const doc = (
    <Document>
      <BonCommandePage affaire={affaire} resultat={resultat} />
    </Document>
  );
  return await pdf(doc).toBlob();
}
