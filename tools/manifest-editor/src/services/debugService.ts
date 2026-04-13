import { useState, useCallback } from 'react';

export const useDebugService = () => {
  const [debugLogs, setDebugLogs] = useState<string[]>(["[SYSTEM] OMEGA Era 6.1 Debug Service Started."]);

  const addLog = useCallback((msg: string) => {
    setDebugLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  return { debugLogs, addLog };
};
