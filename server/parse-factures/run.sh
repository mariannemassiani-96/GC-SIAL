#!/bin/bash
# Script de parsing des factures PDF → CSV via Claude Code
# Usage: ./run.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PDF_DIR="$SCRIPT_DIR/pdf"
CSV_DIR="$SCRIPT_DIR/csv"

# Creer les dossiers si necessaire
mkdir -p "$PDF_DIR" "$CSV_DIR"

# Verifier qu'il y a des PDFs
PDF_COUNT=$(find "$PDF_DIR" -name "*.pdf" -o -name "*.PDF" | wc -l)
if [ "$PDF_COUNT" -eq 0 ]; then
  echo "Aucun PDF trouve dans $PDF_DIR"
  echo "Copiez vos fichiers PDF dans ce dossier et relancez."
  exit 1
fi

echo "=== Parse Factures SIAL ==="
echo "PDFs trouves : $PDF_COUNT"
echo "Dossier PDF  : $PDF_DIR"
echo "Dossier CSV  : $CSV_DIR"
echo ""

# Lancer Claude Code avec le prompt
cd "$SCRIPT_DIR"
claude --print "Lis tous les fichiers PDF dans ./pdf/ (il y en a $PDF_COUNT). Pour chaque PDF, lis chaque page visuellement. Identifie le fournisseur sur chaque page et extrais les lignes articles (reference, designation, quantite, prix unitaire HT, total HT). Genere un fichier CSV par fournisseur dans ./csv/ en suivant les instructions du CLAUDE.md. Affiche un resume a la fin : nombre de factures, nombre de lignes par fournisseur, total HT par fournisseur."
