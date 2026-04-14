import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import type { Affaire, ResultatAffaire, ResultatTravee } from '../types';
import { ACCESSOIRES } from '../constants/profils';
import { TYPES_GC, TYPES_MC, POSE_DATA } from '../constants/typesGC';
import { USINAGE_ANGLE } from '../constants/parametres';

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
  cellLg: { width: '25%', paddingHorizontal: 2 },
  cellXl: { width: '35%', paddingHorizontal: 2 },
  bold: { fontWeight: 'bold' },
  controlBox: { marginTop: 16, borderTop: '1 solid #333', paddingTop: 8 },
  controlRow: { flexDirection: 'row', gap: 20, marginBottom: 4 },
  checkbox: { width: 10, height: 10, border: '1 solid #333', marginRight: 4 },
  usinageInfo: { marginTop: 6, padding: 6, backgroundColor: '#f5f5f5', borderRadius: 2 },
});

function FicheFabricationPage({ affaire, rt }: { affaire: Affaire; rt: ResultatTravee }) {
  const gc = TYPES_GC[affaire.typeGC];
  const mc = TYPES_MC[affaire.mc];
  const pose = POSE_DATA[affaire.pose];
  const usinageAngle = USINAGE_ANGLE[affaire.angle] ?? USINAGE_ANGLE[0];
  const lisseLabels = ['INF', 'SUP', 'MED'];

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
          Travée {rt.travee.repere} — {rt.travee.etage} — L={rt.travee.largeur}mm — H={affaire.hauteur}mm — Qté={rt.travee.qte}
        </Text>
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

      {/* Usinages */}
      {rt.usinages.length > 0 && (
        <View style={s.section}>
          <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 3 }}>Usinages Lisses</Text>
          {rt.usinages.map((u, li) => (
            <View key={li} style={{ marginBottom: 4 }}>
              <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#333' }}>
                Lisse {lisseLabels[li]} — L = {rt.longueurLisse.toFixed(1)}mm
              </Text>
              <Text style={{ fontSize: 7, color: '#444', marginTop: 1 }}>
                Perçage Lisse : {u.percageLisse.map((p) => p.toFixed(1)).join(' | ')} mm
              </Text>
              <Text style={{ fontSize: 7, color: '#444', marginTop: 1 }}>
                Perçage Raidisseur : {u.percageLisseRaidisseur.map((p) => p.toFixed(1)).join(' | ')} mm
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Raidisseur usinages */}
      <View style={s.usinageInfo}>
        <Text style={{ fontSize: 8, fontWeight: 'bold', marginBottom: 2 }}>
          Usinages Raidisseur (180000) — Angle {affaire.angle}°
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
