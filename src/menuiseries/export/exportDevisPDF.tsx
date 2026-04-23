import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import type { AffaireAper } from '../store/menuiserieStore';
import { calculerPrix } from '../engine/calcPrix';
import { TYPES_PRODUITS } from '../constants/produits';
import { MATERIAUX } from '../constants/materiaux';
import { VITRAGES } from '../constants/vitrages';
import { COULEURS } from '../constants/couleurs';
import { TYPES_OUVERTURES, POIGNEES, NIVEAUX_SECURITE } from '../constants/ouvertures';

const s = StyleSheet.create({
  page: { padding: 30, fontSize: 8, fontFamily: 'Helvetica', color: '#333' },
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, borderBottom: '2 solid #2563eb', paddingBottom: 10 },
  headerLeft: {},
  headerRight: { textAlign: 'right' },
  logo: { fontSize: 18, fontWeight: 'bold', color: '#2563eb' },
  subtitle: { fontSize: 9, color: '#666', marginTop: 2 },
  refText: { fontSize: 8, color: '#999', marginTop: 2 },
  // Meta
  metaSection: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, gap: 20 },
  metaBlock: { flex: 1, padding: 8, backgroundColor: '#f8f9fa', borderRadius: 4 },
  metaTitle: { fontSize: 7, fontWeight: 'bold', color: '#666', textTransform: 'uppercase', marginBottom: 4 },
  metaRow: { flexDirection: 'row', marginBottom: 2 },
  metaLabel: { color: '#888', width: 80, fontSize: 7 },
  metaValue: { fontWeight: 'bold', fontSize: 7 },
  // Table
  table: { marginTop: 8, width: '100%' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#2563eb', paddingVertical: 5, paddingHorizontal: 4, borderRadius: 2 },
  tableHeaderText: { color: '#fff', fontWeight: 'bold', fontSize: 7 },
  tableRow: { flexDirection: 'row', borderBottom: '0.5 solid #e5e7eb', paddingVertical: 4, paddingHorizontal: 4 },
  tableRowAlt: { backgroundColor: '#f8f9fa' },
  cell: { fontSize: 7 },
  cellNum: { width: '4%', textAlign: 'center' },
  cellType: { width: '14%' },
  cellMat: { width: '8%' },
  cellDim: { width: '10%' },
  cellVitrage: { width: '14%' },
  cellOuv: { width: '12%' },
  cellCouleur: { width: '10%' },
  cellQte: { width: '5%', textAlign: 'center' },
  cellPU: { width: '10%', textAlign: 'right' },
  cellTotal: { width: '13%', textAlign: 'right', fontWeight: 'bold' },
  // Totaux
  totals: { marginTop: 12, borderTop: '2 solid #2563eb', paddingTop: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 2 },
  totalLabel: { fontSize: 8, color: '#666', width: 100, textAlign: 'right', marginRight: 10 },
  totalValue: { fontSize: 8, fontWeight: 'bold', width: 80, textAlign: 'right' },
  totalTTC: { fontSize: 12, fontWeight: 'bold', color: '#2563eb' },
  // Footer
  footer: { position: 'absolute', bottom: 20, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between', borderTop: '0.5 solid #e5e7eb', paddingTop: 6 },
  footerText: { fontSize: 6, color: '#999' },
  // Section title
  sectionTitle: { fontSize: 10, fontWeight: 'bold', marginTop: 14, marginBottom: 6, color: '#1e293b' },
  // Detail block
  detailBlock: { padding: 6, backgroundColor: '#f8f9fa', borderRadius: 3, marginBottom: 4 },
  detailTitle: { fontSize: 8, fontWeight: 'bold', color: '#333', marginBottom: 3 },
  detailRow: { flexDirection: 'row', marginBottom: 1 },
  detailLabel: { fontSize: 7, color: '#888', width: 100 },
  detailValue: { fontSize: 7, color: '#333' },
});

function getLabel(id: string, list: { id: string; label: string }[]): string {
  return list.find((i) => i.id === id)?.label ?? id;
}

function DevisPDF({ affaire }: { affaire: AffaireAper }) {
  const totalHT = affaire.menuiseries.reduce((acc, m) => acc + calculerPrix(m).totalHT, 0);
  const tva = Math.round(totalHT * 0.2);
  const totalTTC = totalHT + tva;

  return (
    <Document>
      {/* Page 1 — Récapitulatif */}
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.logo}>APER</Text>
            <Text style={s.subtitle}>Configurateur Menuiseries Pro</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={{ fontSize: 12, fontWeight: 'bold' }}>DEVIS</Text>
            <Text style={s.refText}>{affaire.ref}</Text>
            <Text style={s.refText}>Date : {affaire.dateModification}</Text>
          </View>
        </View>

        {/* Meta */}
        <View style={s.metaSection}>
          <View style={s.metaBlock}>
            <Text style={s.metaTitle}>Projet</Text>
            <View style={s.metaRow}><Text style={s.metaLabel}>Affaire</Text><Text style={s.metaValue}>{affaire.nom}</Text></View>
            <View style={s.metaRow}><Text style={s.metaLabel}>Client</Text><Text style={s.metaValue}>{affaire.client}</Text></View>
            <View style={s.metaRow}><Text style={s.metaLabel}>Adresse</Text><Text style={s.metaValue}>{affaire.adresse}</Text></View>
          </View>
          <View style={s.metaBlock}>
            <Text style={s.metaTitle}>Chantier</Text>
            <View style={s.metaRow}><Text style={s.metaLabel}>Bâtiment</Text><Text style={s.metaValue}>{affaire.contexte.typeBatiment}</Text></View>
            <View style={s.metaRow}><Text style={s.metaLabel}>Terrain</Text><Text style={s.metaValue}>{affaire.contexte.terrain}</Text></View>
            <View style={s.metaRow}><Text style={s.metaLabel}>Bord de mer</Text><Text style={s.metaValue}>{affaire.contexte.bordDeMer ? 'Oui' : 'Non'}</Text></View>
          </View>
        </View>

        {/* Tableau récapitulatif */}
        <Text style={s.sectionTitle}>Récapitulatif des menuiseries</Text>
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderText, s.cellNum]}>#</Text>
            <Text style={[s.tableHeaderText, s.cellType]}>Type</Text>
            <Text style={[s.tableHeaderText, s.cellMat]}>Matériau</Text>
            <Text style={[s.tableHeaderText, s.cellDim]}>Dimensions</Text>
            <Text style={[s.tableHeaderText, s.cellVitrage]}>Vitrage</Text>
            <Text style={[s.tableHeaderText, s.cellOuv]}>Ouverture</Text>
            <Text style={[s.tableHeaderText, s.cellCouleur]}>Couleur</Text>
            <Text style={[s.tableHeaderText, s.cellQte]}>Qté</Text>
            <Text style={[s.tableHeaderText, s.cellPU]}>P.U. HT</Text>
            <Text style={[s.tableHeaderText, s.cellTotal]}>Total HT</Text>
          </View>
          {affaire.menuiseries.map((m, i) => {
            const prix = calculerPrix(m);
            const ouvertures = (m.vantaux ?? []).map((v) => getLabel(v.ouverture, TYPES_OUVERTURES)).join(', ');
            return (
              <View key={m.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                <Text style={[s.cell, s.cellNum]}>{i + 1}</Text>
                <Text style={[s.cell, s.cellType]}>{getLabel(m.typeProduit, TYPES_PRODUITS)}</Text>
                <Text style={[s.cell, s.cellMat]}>{getLabel(m.materiau, MATERIAUX)}</Text>
                <Text style={[s.cell, s.cellDim]}>{m.largeur}×{m.hauteur}</Text>
                <Text style={[s.cell, s.cellVitrage]}>{getLabel(m.vitrage, VITRAGES)}</Text>
                <Text style={[s.cell, s.cellOuv]}>{ouvertures || '—'}</Text>
                <Text style={[s.cell, s.cellCouleur]}>{getLabel(m.couleurExterieure, COULEURS)}</Text>
                <Text style={[s.cell, s.cellQte]}>{m.qte ?? 1}</Text>
                <Text style={[s.cell, s.cellPU]}>{prix.prixUnitaireHT.toLocaleString('fr-FR')} €</Text>
                <Text style={[s.cell, s.cellTotal]}>{prix.totalHT.toLocaleString('fr-FR')} €</Text>
              </View>
            );
          })}
        </View>

        {/* Totaux */}
        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total HT</Text>
            <Text style={s.totalValue}>{totalHT.toLocaleString('fr-FR')} €</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>TVA 20%</Text>
            <Text style={s.totalValue}>{tva.toLocaleString('fr-FR')} €</Text>
          </View>
          <View style={[s.totalRow, { marginTop: 4 }]}>
            <Text style={[s.totalLabel, { fontSize: 10 }]}>Total TTC</Text>
            <Text style={[s.totalValue, s.totalTTC]}>{totalTTC.toLocaleString('fr-FR')} €</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>APER Configurateur Menuiseries — {affaire.ref}</Text>
          <Text style={s.footerText}>Devis généré le {new Date().toLocaleDateString('fr-FR')}</Text>
        </View>
      </Page>

      {/* Page 2+ — Détail par menuiserie */}
      {affaire.menuiseries.map((m, i) => {
        const prix = calculerPrix(m);
        const produit = TYPES_PRODUITS.find((p) => p.id === m.typeProduit);
        const materiau = MATERIAUX.find((mat) => mat.id === m.materiau);
        const vitrage = VITRAGES.find((v) => v.id === m.vitrage);
        const couleurExt = COULEURS.find((c) => c.id === m.couleurExterieure);
        const couleurInt = COULEURS.find((c) => c.id === m.couleurInterieure);
        const poignee = POIGNEES.find((p) => p.id === m.poignee);
        const securite = NIVEAUX_SECURITE.find((sec) => sec.id === m.securite);

        return (
          <Page key={m.id} size="A4" style={s.page}>
            <View style={s.header}>
              <View>
                <Text style={{ fontSize: 12, fontWeight: 'bold' }}>Menuiserie #{i + 1}</Text>
                <Text style={s.subtitle}>{produit?.label} — {materiau?.label}</Text>
              </View>
              <View style={s.headerRight}>
                <Text style={s.refText}>{affaire.ref}</Text>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#2563eb' }}>{prix.totalHT.toLocaleString('fr-FR')} € HT</Text>
              </View>
            </View>

            {/* Détails techniques */}
            <View style={s.detailBlock}>
              <Text style={s.detailTitle}>Caractéristiques</Text>
              <View style={s.detailRow}><Text style={s.detailLabel}>Type</Text><Text style={s.detailValue}>{produit?.label}</Text></View>
              <View style={s.detailRow}><Text style={s.detailLabel}>Matériau</Text><Text style={s.detailValue}>{materiau?.label}</Text></View>
              <View style={s.detailRow}><Text style={s.detailLabel}>Dimensions</Text><Text style={s.detailValue}>{m.largeur} × {m.hauteur} mm ({((m.largeur / 1000) * (m.hauteur / 1000)).toFixed(2)} m²)</Text></View>
              <View style={s.detailRow}><Text style={s.detailLabel}>Vantaux</Text><Text style={s.detailValue}>{m.nbVantaux}</Text></View>
              <View style={s.detailRow}><Text style={s.detailLabel}>Forme</Text><Text style={s.detailValue}>{m.forme}</Text></View>
              {m.imposte && <View style={s.detailRow}><Text style={s.detailLabel}>Imposte</Text><Text style={s.detailValue}>{m.hauteurImposte ?? 300} mm</Text></View>}
              {m.allege && <View style={s.detailRow}><Text style={s.detailLabel}>Allège</Text><Text style={s.detailValue}>{m.hauteurAllege ?? 400} mm</Text></View>}
            </View>

            <View style={s.detailBlock}>
              <Text style={s.detailTitle}>Ouverture</Text>
              {(m.vantaux ?? []).map((v, vi) => (
                <View key={vi} style={s.detailRow}>
                  <Text style={s.detailLabel}>Vantail {vi + 1}</Text>
                  <Text style={s.detailValue}>{getLabel(v.ouverture, TYPES_OUVERTURES)}</Text>
                </View>
              ))}
            </View>

            <View style={s.detailBlock}>
              <Text style={s.detailTitle}>Vitrage & Performances</Text>
              <View style={s.detailRow}><Text style={s.detailLabel}>Vitrage</Text><Text style={s.detailValue}>{vitrage?.label}</Text></View>
              <View style={s.detailRow}><Text style={s.detailLabel}>Ug</Text><Text style={s.detailValue}>{vitrage?.ug} W/m²K</Text></View>
              <View style={s.detailRow}><Text style={s.detailLabel}>Rw</Text><Text style={s.detailValue}>{vitrage?.affaiblissement} dB</Text></View>
              {vitrage?.classeSecurite && <View style={s.detailRow}><Text style={s.detailLabel}>Sécurité vitrage</Text><Text style={s.detailValue}>{vitrage.classeSecurite}</Text></View>}
            </View>

            <View style={s.detailBlock}>
              <Text style={s.detailTitle}>Couleurs & Finitions</Text>
              <View style={s.detailRow}><Text style={s.detailLabel}>Extérieur</Text><Text style={s.detailValue}>{couleurExt?.label}</Text></View>
              {m.bicolore && <View style={s.detailRow}><Text style={s.detailLabel}>Intérieur</Text><Text style={s.detailValue}>{couleurInt?.label}</Text></View>}
              <View style={s.detailRow}><Text style={s.detailLabel}>Poignée</Text><Text style={s.detailValue}>{poignee?.label}</Text></View>
              <View style={s.detailRow}><Text style={s.detailLabel}>Sécurité</Text><Text style={s.detailValue}>{securite?.label}</Text></View>
              {m.croisillons && <View style={s.detailRow}><Text style={s.detailLabel}>Croisillons</Text><Text style={s.detailValue}>{m.typeCroisillon}</Text></View>}
            </View>

            {m.voletRoulant && (
              <View style={s.detailBlock}>
                <Text style={s.detailTitle}>Volet roulant</Text>
                <View style={s.detailRow}><Text style={s.detailLabel}>Type</Text><Text style={s.detailValue}>{m.voletRoulant.type}</Text></View>
                <View style={s.detailRow}><Text style={s.detailLabel}>Pose</Text><Text style={s.detailValue}>{m.voletRoulant.pose}</Text></View>
              </View>
            )}

            {/* Décomposition prix */}
            <Text style={[s.sectionTitle, { marginTop: 10 }]}>Décomposition du prix</Text>
            <View style={s.table}>
              {prix.details.map((ligne, li) => (
                <View key={li} style={[s.tableRow, li % 2 === 1 ? s.tableRowAlt : {}]}>
                  <Text style={[s.cell, { width: '60%' }]}>{ligne.label}</Text>
                  <Text style={[s.cell, { width: '15%', textAlign: 'center' }]}>{ligne.qte > 1 ? `×${ligne.qte}` : ''}</Text>
                  <Text style={[s.cell, { width: '25%', textAlign: 'right', fontWeight: 'bold' }]}>{Math.round(ligne.prixTotal).toLocaleString('fr-FR')} €</Text>
                </View>
              ))}
            </View>
            <View style={[s.totals, { marginTop: 6 }]}>
              <View style={s.totalRow}><Text style={s.totalLabel}>Quantité</Text><Text style={s.totalValue}>×{m.qte ?? 1}</Text></View>
              <View style={s.totalRow}><Text style={s.totalLabel}>Total HT</Text><Text style={[s.totalValue, { fontWeight: 'bold' }]}>{prix.totalHT.toLocaleString('fr-FR')} €</Text></View>
              <View style={s.totalRow}><Text style={s.totalLabel}>Total TTC</Text><Text style={[s.totalValue, s.totalTTC]}>{prix.totalTTC.toLocaleString('fr-FR')} €</Text></View>
            </View>

            {m.notes && (
              <View style={[s.detailBlock, { marginTop: 8 }]}>
                <Text style={s.detailTitle}>Notes</Text>
                <Text style={{ fontSize: 7, color: '#666' }}>{m.notes}</Text>
              </View>
            )}

            <View style={s.footer}>
              <Text style={s.footerText}>APER — {affaire.ref} — Menuiserie #{i + 1}</Text>
              <Text style={s.footerText}>Page {i + 2}</Text>
            </View>
          </Page>
        );
      })}
    </Document>
  );
}

export async function genererDevisPDF(affaire: AffaireAper): Promise<void> {
  const blob = await pdf(<DevisPDF affaire={affaire} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Devis_${affaire.ref}_${affaire.dateModification}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
