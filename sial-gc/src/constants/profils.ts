export const LG_BARRE_MM = 6400;

export const PROFILS: Record<string, { label: string; w: number; h: number }> = {
  '180000': { label: 'Raidisseur (Montant fort) 40×20', w: 20, h: 40 },
  '180005': { label: 'Barreau à visser 25×20', w: 20, h: 25 },
  '180010': { label: 'Lisse non percée 46.5×20', w: 22, h: 46.5 },
  '180020': { label: 'Closoir de lisse 40.5×8', w: 8, h: 40.5 },
  '180030': { label: 'Main courante standard plate 52×25', w: 25, h: 52 },
  '180032': { label: 'Main courante design ogive 90×25', w: 25, h: 90 },
  '180033': { label: 'Main courante ronde Ø60×48', w: 48, h: 60 },
  '180040': { label: 'U pour remplissage 20×36', w: 36, h: 20 },
  '140545': { label: 'Tube rond Ø30', w: 30, h: 30 },
  '126129': { label: 'Joint remplissage 8-8.8mm (vendu au ml)', w: 0, h: 0 },
};

export const ACCESSOIRES: Record<string, { label: string; cond: number }> = {
  '6003992': { label: 'Sabot sur dalle — à la française', cond: 1 },
  '6004105': { label: 'Sabot nez de dalle — à l\'anglaise', cond: 1 },
  '110306': { label: 'Goupille support lisse basse (sachet 5)', cond: 5 },
  '110312': { label: 'Vis assemblage barreau (sachet 200)', cond: 200 },
  '110955': { label: 'Ensemble fixation raidisseur/lisse (sac 5)', cond: 5 },
  '110956': { label: 'Renfort clippage main courante', cond: 1 },
  '127143': { label: 'Bouchon MC standard/design (sachet 2)', cond: 2 },
  '127144': { label: 'Bouchon lisse basse (sachet 2)', cond: 2 },
  '127149': { label: 'Patte fixation lisse/mur droite (sac 2)', cond: 2 },
  '127150': { label: 'Patte fixation lisse/mur gauche (sac 2)', cond: 2 },
  '127158': { label: 'Bouchon MC ronde (sachet 2)', cond: 2 },
  '110962': { label: 'Équerre 90° pour lisse', cond: 2 },
  '110966': { label: 'Éclisse droite pour lisse', cond: 2 },
  '6003997': { label: 'Pince fixe U pour vitrage', cond: 1 },
};
