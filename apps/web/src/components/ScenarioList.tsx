'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { apiGet } from '../lib/api';

interface Scenario {
  id: string;
  title: string;
}

export function ScenarioList({ moduleId }: { moduleId: string }) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        const data = await apiGet<Scenario[]>(`/scenarios/course/${moduleId}`);
        setScenarios(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading scenarios');
      } finally {
        setLoading(false);
      }
    };

    fetchScenarios();
  }, [moduleId]);

  if (loading) return <div className="card">Loading scenarios...</div>;
  if (error) return <div className="card error">{error}</div>;
  if (scenarios.length === 0) return <div className="card">No scenarios yet</div>;

  return (
    <div className="scenarios-grid">
      {scenarios.map((scenario) => (
        <Link key={scenario.id} href={`/scenarios/${scenario.id}`}>
          <div className="card scenario-card">
            <h3>{scenario.title}</h3>
          </div>
        </Link>
      ))}
    </div>
  );
}
