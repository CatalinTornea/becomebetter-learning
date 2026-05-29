import React from 'react';
import { PracticeScenario } from '@/components/PracticeScenario';

export default function ScenarioPage({
  params,
}: {
  params: Promise<{ scenarioId: string }>;
}) {
  const { scenarioId } = React.use(params);
  return <PracticeScenario scenarioId={scenarioId} />;
}
