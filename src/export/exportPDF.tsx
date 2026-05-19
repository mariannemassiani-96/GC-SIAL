import { Document, Page, Text, View, StyleSheet, pdf, Svg, Rect, Line, Circle } from '@react-pdf/renderer';
import type { Affaire, ResultatAffaire, ResultatTravee } from '../types';
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
  const svgH = 36;
  const pad = 8;
  const barY = 10;
  const barH = 16;
  const scale = (svgW - 2 * pad) / L;
  const toX = (mm: number) => pad + mm * scale;

  const raidSet = new Set(rt.posRaidisseurs.map((p) => Math.round(p * 10) / 10));
  const goupilleG = 68.3;
  const goupilleD = Math.round((L - 68.3) * 10) / 10;

  const barreaux = u.percageLisse.filter(
    (p) =>
      !raidSet.has(Math.round(p * 10) / 10) &&
      Math.abs(p - goupilleG) > 0.05 &&
      Math.abs(p - goupilleD) > 0.05
  );

  return (
    <View style={{ marginTop: 2, marginBottom: 2 }}>
      <Text style={{ fontSize: 7, fontWeight: 'bold', marginBottom: 2 }}>
        {`Lisse ${lisseLabel} — L = ${L.toFixed(1)} mm — entraxe = ${rt.entraxeEff.toFixed(1)} mm`}
      </Text>
      <Svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: svgW, height: svgH }}>
        {/* Lisse bar */}
        <Rect x={toX(0)} y={barY} width={toX(L) - toX(0)} height={barH} fill="#e8e8e8" stroke="#999" strokeWidth={0.5} />

        {/* Goupilles (green dashed) */}
        {[goupilleG, goupilleD].map((pos, i) => (
          <Line key={`g${i}`} x1={toX(pos)} y1={barY - 2} x2={toX(pos)} y2={barY + barH + 2} stroke="#16a34a" strokeWidth={0.7} strokeDasharray="2,1" />
        ))}

        {/* Barreaux (blue) */}
        {barreaux.map((pos, i) => (
          <Line key={`b${i}`} x1={toX(pos)} y1={barY + 1} x2={toX(pos)} y2={barY + barH - 1} stroke="#2563eb" strokeWidth={0.4} />
        ))}

        {/* Raidisseurs (red) */}
        {rt.posRaidisseurs.map((pos, i) => (
          <Line key={`r${i}`} x1={toX(pos)} y1={barY - 6} x2={toX(pos)} y2={barY + barH + 6} stroke="#dc2626" strokeWidth={1.2} />
        ))}
      </Svg>
      {/* Raidisseur position labels below */}
      <Text style={{ fontSize: 5.5, color: '#dc2626', marginTop: 0 }}>
        Raidisseurs : {rt.posRaidisseurs.map((p) => p.toFixed(1)).join(' | ')} mm
      </Text>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 1 }}>
        <Text style={{ fontSize: 5, color: '#666' }}>
          <Text style={{ color: '#dc2626' }}>|</Text> Raid.{'  '}
          <Text style={{ color: '#2563eb' }}>|</Text> Barr.{'  '}
          <Text style={{ color: '#16a34a' }}>:</Text> Goup.
        </Text>
      </View>
    </View>
  );
}

function SchemaConfigPDF({ rt }: { rt: ResultatTravee }) {
  const t = rt.travee;
  const hasAngleG = t.coupeG === '45';
  const hasAngleD = t.coupeD === '45';
  const isU = hasAngleG && hasAngleD;

  const svgW = 500;
  const svgH = 140;
  const px = 0.07; // mm to px
  const barH = 6;

  const centreW = t.largeur * px;
  const leftH = hasAngleG ? (isU ? (t.largeur3 || 0) : (t.largeur2 || 0)) * px : 0;
  const rightH = hasAngleD ? (t.largeur2 || 0) * px : 0;
  const maxRetour = Math.max(leftH, rightH);

  const originX = svgW / 2 - centreW / 2;
  const originY = 20 + maxRetour;

  const fixLabel = (id: string) => FIXATIONS[id as keyof typeof FIXATIONS]?.label ?? id;

  return (
    <Svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: svgW, height: svgH, marginBottom: 4 }}>
      {/* Centre bar */}
      <Rect x={originX} y={originY - barH / 2} width={centreW} height={barH} fill="#3b82f6" opacity={0.5} />
      <Line x1={originX} y1={originY} x2={originX + centreW} y2={originY} stroke="#3b82f6" strokeWidth={1.5} />

      {/* Left branch */}
      {hasAngleG && leftH > 0 && (
        <>
          <Rect x={originX - barH / 2} y={originY - leftH} width={barH} height={leftH} fill="#f59e0b" opacity={0.4} />
          <Line x1={originX} y1={originY} x2={originX} y2={originY - leftH} stroke="#f59e0b" strokeWidth={1.5} />
          <Text x={originX - 12} y={originY - leftH / 2} style={{ fontSize: 6, color: '#f59e0b' }}>{isU ? t.largeur3 : t.largeur2}</Text>
        </>
      )}

      {/* Right branch */}
      {hasAngleD && rightH > 0 && (
        <>
          <Rect x={originX + centreW - barH / 2} y={originY - rightH} width={barH} height={rightH} fill="#10b981" opacity={0.4} />
          <Line x1={originX + centreW} y1={originY} x2={originX + centreW} y2={originY - rightH} stroke="#10b981" strokeWidth={1.5} />
          <Text x={originX + centreW + 4} y={originY - rightH / 2} style={{ fontSize: 6, color: '#10b981' }}>{t.largeur2}</Text>
        </>
      )}

      {/* Raidisseurs on centre */}
      {rt.posRaidisseurs.map((pos, i) => (
        <Rect key={`r-${i}`} x={originX + pos * px - 2} y={originY - 10} width={4} height={20} fill="#ef4444" opacity={0.6} />
      ))}

      {/* Centre dimension */}
      <Line x1={originX} y1={originY + 14} x2={originX + centreW} y2={originY + 14} stroke="#666" strokeWidth={0.3} />
      <Text x={originX + centreW / 2 - 10} y={originY + 20} style={{ fontSize: 6 }}>{t.largeur} mm</Text>

      {/* Fixation labels */}
      {!hasAngleG && <Text x={originX - 2} y={originY + 28} style={{ fontSize: 5, color: '#999' }}>{fixLabel(t.fixG)}</Text>}
      {!hasAngleD && <Text x={originX + centreW - 20} y={originY + 28} style={{ fontSize: 5, color: '#999' }}>{fixLabel(t.fixD)}</Text>}
      {hasAngleG && <Text x={originX - 4} y={originY + 4} style={{ fontSize: 5, color: '#f59e0b' }}>90°</Text>}
      {hasAngleD && <Text x={originX + centreW + 2} y={originY + 4} style={{ fontSize: 5, color: '#10b981' }}>90°</Text>}

      {/* Raidisseur count */}
      <Text x={2} y={svgH - 6} style={{ fontSize: 6, color: '#ef4444' }}>{rt.nbRaid} raidisseurs — entraxe {rt.entraxeEff.toFixed(0)} mm</Text>

      {/* Labels EXT / INT */}
      <Text x={2} y={8} style={{ fontSize: 5, color: '#999' }}>EXT</Text>
      <Text x={2} y={svgH - 16} style={{ fontSize: 5, color: '#999' }}>INT</Text>

      {/* Retour end fixations */}
      {hasAngleG && (
        (t.fixRetourG ?? 'libre') === 'mur'
          ? <Rect x={originX - 4} y={originY - leftH - 2} width={8} height={3} fill="#999" />
          : <Circle cx={originX} cy={originY - leftH} r={2.5} fill="none" stroke="#ef4444" strokeWidth={0.7} />
      )}
      {hasAngleD && (
        (t.fixRetourD ?? 'libre') === 'mur'
          ? <Rect x={originX + centreW - 4} y={originY - rightH - 2} width={8} height={3} fill="#999" />
          : <Circle cx={originX + centreW} cy={originY - rightH} r={2.5} fill="none" stroke="#ef4444" strokeWidth={0.7} />
      )}
    </Svg>
  );
}

function FicheFabricationPage({ affaire, rt }: { affaire: Affaire; rt: ResultatTravee }) {
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
        <SchemaConfigPDF rt={rt} />
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
          {rt.nomenclature.filter((n) => n.type === 'profil').map((n, i) => (
            <View key={i} style={s.tableRow}>
              <Text style={s.cellMd}>{n.ref}</Text>
              <Text style={s.cellXl}>{n.label}</Text>
              <Text style={s.cellMd}>{n.longueur.toFixed(1)}</Text>
              <Text style={s.cellSm}>{n.qte}</Text>
            </View>
          ))}
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
      {resultat.travees.map((rt) => (
        <FicheFabricationPage key={rt.travee.id} affaire={affaire} rt={rt} />
      ))}
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
