import { useState, useEffect, useCallback } from 'react';
import { gbrain } from '../../../api/gbrain';
import type { Agent } from './types';

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAgents = useCallback(() => {
    setLoadError(null);
    gbrain.agents()
      .then(setAgents)
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'Failed to load agents'));
  }, []);

  useEffect(() => {
    // 首次挂载时读取智能体目录。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAgents();
  }, [loadAgents]);

  return { agents, loadError, loadAgents };
}
