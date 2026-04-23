import { useState, useCallback } from 'react';
import { usePlans, createEmptyPlan } from './store';
import { ListePlans } from './ListePlans';
import { Editeur } from './Editeur';

interface WorkshopAppProps {
  onHome: () => void;
}

export function WorkshopApp({ onHome }: WorkshopAppProps) {
  const { plans, addPlan, updatePlan, deletePlan, duplicatePlan } = usePlans();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = plans.find((p) => p.id === selectedId) ?? null;

  const handleNew = useCallback(() => {
    const newPlan = createEmptyPlan(`Plan ${new Date().toLocaleDateString('fr-FR')}`);
    addPlan(newPlan);
    setSelectedId(newPlan.id);
  }, [addPlan]);

  if (selected) {
    return (
      <Editeur
        plan={selected}
        onUpdate={(updates) => updatePlan(selected.id, updates)}
        onBack={() => setSelectedId(null)}
        onHome={onHome}
      />
    );
  }

  return (
    <ListePlans
      plans={plans}
      onSelect={setSelectedId}
      onNew={handleNew}
      onDuplicate={duplicatePlan}
      onDelete={deletePlan}
      onHome={onHome}
    />
  );
}
