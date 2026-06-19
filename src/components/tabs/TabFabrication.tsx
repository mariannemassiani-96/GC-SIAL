import { Scissors, Wrench, Ruler } from 'lucide-react';
import type { ResultatAffaire, Travee } from '../../types';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { TabDebits } from './TabDebits';
import { TabUsinages } from './TabUsinages';
import { OptimBarresVisu } from '../OptimBarresVisu';

interface Props {
  resultat: ResultatAffaire;
  onUpdateTravee?: (traveeId: string, patch: Partial<Travee>) => void;
}

export function TabFabrication({ resultat, onUpdateTravee }: Props) {
  return (
    <div className="space-y-3">
      <CollapsibleSection title="Débits" icon={<Scissors size={14} className="text-gray-400" />} defaultOpen={true}
        badge={`${resultat.travees.length} travée${resultat.travees.length > 1 ? 's' : ''}`}>
        <TabDebits resultat={resultat} onUpdateTravee={onUpdateTravee} />
      </CollapsibleSection>

      <CollapsibleSection title="Usinages" icon={<Wrench size={14} className="text-gray-400" />} defaultOpen={false}
        badge="Plans de perçage">
        <TabUsinages resultat={resultat} />
      </CollapsibleSection>

      <CollapsibleSection title="Optimisation de coupe" icon={<Ruler size={14} className="text-gray-400" />} defaultOpen={false}
        badge={`${resultat.optimBarres.length} profilé${resultat.optimBarres.length > 1 ? 's' : ''}`}>
        <OptimBarresVisu optimBarres={resultat.optimBarres} />
      </CollapsibleSection>
    </div>
  );
}
