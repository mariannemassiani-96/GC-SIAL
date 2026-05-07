# Parse Factures PDF → CSV

## Objectif
Lire les fichiers PDF de factures fournisseurs dans `./pdf/` et generer des fichiers CSV dans `./csv/`.

## Contexte
L'entreprise SIAL (menuiserie aluminium/PVC, Biguglia, Corse) recoit des factures de ses fournisseurs. Un seul PDF peut contenir plusieurs factures de fournisseurs differents sur des pages differentes.

## Fournisseurs connus
Kawneer, PRO Equipe (Proequip), Foussier, Ferco, Boschat Laveix, Wurth, Rehau, Rey, Nerfs, Saint-Gobain, Somfy, Hoppe, Sika, Isula Vitrage, SETEC Transport, AM Environnement, LAE Location, Advance Emploi, Transports Nicoletti, CAP 20, Thermo Sud, Hilti, FIF Volets, Yesss Electrique, Emaver, Gaspari, Cortizo, Synerglass

## Instructions

1. Lire chaque fichier PDF dans `./pdf/`
2. Pour chaque page, identifier le fournisseur
3. Extraire les lignes articles avec : reference, designation, quantite, prix unitaire HT, total ligne HT
4. Generer UN fichier CSV par fournisseur dans `./csv/` nomme `{fournisseur}_{date}.csv`
5. Format CSV : separateur point-virgule, encodage UTF-8

## Format CSV de sortie

```
fournisseur;date_facture;num_facture;ref_article;designation;coloris;conditionnement;qte;prix_unitaire_ht;total_ht
Kawneer;2026-04-15;3604249;0177199;Dormant 2 rails drain.cach 6,7m;;BAR;2;95.11;190.22
```

## Regles importantes

- Les prix sont en EUR HT (hors taxes)
- Utiliser le point comme separateur decimal dans le CSV (pas la virgule)
- Ignorer les pages de CGV, conditions generales, mentions legales
- Ignorer les lignes de sous-total, total, TVA, port, frais de gestion
- Pour Kawneer : les donnees sont en double (2 colonnes miroir), ne prendre qu'une fois
- Pour Kawneer : appliquer la remise (%) au prix unitaire pour obtenir le prix net
- Pour PRO Equipe : le prix net est deja calcule, utiliser le montant en fin de ligne
- Si un fournisseur n'est pas dans la liste, utiliser le nom detecte sur la facture
