import { useState } from 'react';
import { Accueil, type AppId } from './Accueil';
import { GardeCorpsApp } from './GardeCorpsApp';
import { WorkshopApp } from './workshop/WorkshopApp';

export default function App() {
  const [app, setApp] = useState<AppId | null>(null);

  if (app === 'garde-corps') return <GardeCorpsApp onHome={() => setApp(null)} />;
  if (app === 'atelier') return <WorkshopApp onHome={() => setApp(null)} />;
  return <Accueil onSelect={setApp} />;
}
