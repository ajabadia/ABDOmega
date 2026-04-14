import { useState, useEffect } from 'react';

export const useAssets = (moduleId: string | undefined) => {
  const [assetStates, setAssetStates] = useState({
    exists: null as boolean | null,
    loading: false,
    fullPath: ''
  });

  useEffect(() => {
    if (!moduleId || moduleId === 'new_module_001' || moduleId === 'new_module' || moduleId === '_module_root') {
      setAssetStates({ exists: null, loading: false, fullPath: '' });
      return;
    }

    const checkAsset = async () => {
      // Detección automática según convención ERA 6
      const assetPath = `ui/assets/modules/${moduleId}/illustration.svg`;
      const protocolUrl = `omega-asset://${assetPath}`;
      
      setAssetStates(prev => ({ ...prev, loading: true, fullPath: protocolUrl }));
      
      // @ts-ignore
      if (window.electronAPI) {
        try {
          // @ts-ignore
          const exists = await window.electronAPI.fileExists(assetPath);
          setAssetStates({ exists, loading: false, fullPath: protocolUrl });
        } catch (e) {
          setAssetStates({ exists: false, loading: false, fullPath: protocolUrl });
        }
      } else {
        setAssetStates({ exists: false, loading: false, fullPath: protocolUrl });
      }
    };

    checkAsset();
  }, [moduleId]);

  return { assetStates };
};
