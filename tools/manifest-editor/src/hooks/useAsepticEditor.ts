import { useState, useCallback, useEffect } from 'react';
import type { WasmStatus } from '../types';
import yaml from 'js-yaml';
import AJV from 'ajv';
import addFormats from 'ajv-formats';
import era6Schema from '../schema.json';
import { translateAsepticError, runHeuristicChecks } from '../services/aceLintService';

const ajv = new AJV({ 
  allErrors: true, 
  useDefaults: true, 
  removeAdditional: true,
  strict: false 
});
addFormats(ajv);
const validateEra6 = ajv.compile(era6Schema);

export const useAsepticEditor = (addLog: (msg: string) => void) => {
  const [moduleData, setModuleData] = useState({
    id: 'midi_in',
    name: 'MIDI IN',
    description: 'Canonical MIDI Input Bridge for the OMEGA Rack (Era 6.2 Absolute).',
    modelId: 'ACE-UTIL-MIDI-IN',
    implementationId: 601,
    engine: 'WASM' as any,
    family: 'UTILITY',
    theme: 'aseptic' as any,
    version: '6.2',
    tags: [] as string[],
    registry: [] as any[],
    _user_edits: {} as Record<string, boolean> 
  });

  const [isDirty, setIsDirty] = useState(false);

  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  
  // WASM Heartbeat State
  const [wasmStatus, setWasmStatus] = useState<WasmStatus>('none');
  const [wasmDetails, setWasmDetails] = useState<string | null>(null);
  const [idMismatch, setIdMismatch] = useState(false);
  const [suggestedId, setSuggestedId] = useState<string | null>(null);

  const checkWasmIntegrity = useCallback(async (manifestPath: string, moduleId: string, registry: any[]) => {
    // @ts-ignore
    if (!window.electronAPI) return;

    try {
      // 1. Detección de binario hermano (.wasm)
      const folder = manifestPath.substring(0, manifestPath.lastIndexOf('\\') + 1 || manifestPath.lastIndexOf('/') + 1);
      const fileName = manifestPath.split(/[\\/]/).pop()?.replace('.acemm.working', '').replace('.acemm', '') || '';
      
      // Intentar encontrar el wasm basado en el ID o en el nombre del archivo
      const wasmPathById = `${folder}${moduleId}.wasm`;
      const wasmPathByFile = `${folder}${fileName}.wasm`;
      
      // @ts-ignore
      let exists = await window.electronAPI.fileExists(wasmPathById);
      let activeWasmPath = wasmPathById;
      
      if (!exists && fileName && fileName !== moduleId) {
        // @ts-ignore
        exists = await window.electronAPI.fileExists(wasmPathByFile);
        if (exists) {
          activeWasmPath = wasmPathByFile;
          setIdMismatch(true);
          setSuggestedId(fileName);
        }
      } else {
        setIdMismatch(false);
        setSuggestedId(null);
      }

      if (!exists) {
        setWasmStatus('none');
        setWasmDetails(null);
        return;
      }

      // 2. Escaneo de exportaciones
      // @ts-ignore
      const scanResult = await window.electronAPI.scanWasm(activeWasmPath);
      if (scanResult.error) {
        setWasmStatus('error');
        setWasmDetails(`WASM Scan Error: ${scanResult.error}`);
        return;
      }

      const exports = scanResult.exports as { name: string, kind: string }[];
      const exportNames = exports.filter(e => e.kind === 'function').map(e => e.name);

      // 3. Validación de Contrato Aséptico (Era 6)
      // Buscamos discrepancias entre lo que el binario exporta y lo que el manifiesto declara
      const missingInWasm: string[] = [];
      
      registry.forEach(item => {
        // El estándar aséptico dice que cada ítem del registry debe tener su contrapartida ace_...
        // Nota: Esto es una simplificación inicial, el estándar real es más complejo
        const expectedExport = `ace_param_${item.id}_set`;
        const expectedPort = `ace_port_${item.id}`;
        
        const found = exportNames.some(name => name === expectedExport || name === expectedPort || name === item.id);
        if (!found) {
          missingInWasm.push(item.id);
        }
      });
      
      // 4. Verificación de Familia (Heurística)
      const lowerName = activeWasmPath.toLowerCase();
      const hasOsc = lowerName.includes('osc') || lowerName.includes('vco') || lowerName.includes('oscillator');
      const hasFilter = lowerName.includes('fil') || lowerName.includes('vcf') || lowerName.includes('filter');
      
      const familyMismatch = (hasOsc && moduleId !== 'OSCILLATOR') || (hasFilter && moduleId !== 'FILTER');
      
      if (missingInWasm.length > 0) {
        setWasmStatus('mismatch');
        setWasmDetails(`Mismatch: Binary lacks implementations for [${missingInWasm.join(', ')}]`);
        addLog(`WASM MISMATCH: Binary at ${activeWasmPath} is not synchronized with manifest.`);
      } else if (familyMismatch) {
        setWasmStatus('mismatch');
        setWasmDetails(`Family Alert: Binary name suggests a different family than ${moduleData.family}`);
        addLog(`HEURISTIC ALERT: Binary name suggests ${hasOsc ? 'OSCILLATOR' : 'FILTER'} but manifest says ${moduleData.family}`);
      } else {
        setWasmStatus('sync');
        setWasmDetails('Perfect Aseptic Synchronization');
        addLog(`WASM SYNC: Binary ${moduleId}.wasm matches manifest contract.`);
      }

    } catch (err: any) {
      setWasmStatus('error');
      setWasmDetails(err.message);
    }
  }, [addLog, moduleData.family]);

  const handleAsepticHealing = useCallback(async () => {
    // @ts-ignore
    if (!window.electronAPI || !currentFilePath || !moduleData.id) return;

    addLog("Initiating Aseptic Healing Protocol...");
    
    try {
      const folder = currentFilePath.substring(0, currentFilePath.lastIndexOf('\\') + 1 || currentFilePath.lastIndexOf('/') + 1);
      const fileName = currentFilePath.split(/[\\/]/).pop()?.replace('.acemm.working', '').replace('.acemm', '') || '';
      
      const wasmPathById = `${folder}${moduleData.id}.wasm`;
      const wasmPathByFile = `${folder}${fileName}.wasm`;
      
      // Determinar cuál existe
      // @ts-ignore
      let exists = await window.electronAPI.fileExists(wasmPathById);
      let activeWasmPath = wasmPathById;
      
      if (!exists && fileName !== moduleData.id) {
        // @ts-ignore
        exists = await window.electronAPI.fileExists(wasmPathByFile);
        if (exists) activeWasmPath = wasmPathByFile;
      }
      
      if (!exists) {
        addLog(`Healing Failed: No .wasm binary found at ${folder}`);
        return;
      }

      // @ts-ignore
      const scanResult = await window.electronAPI.scanWasm(activeWasmPath);
      if (scanResult.error) {
        addLog(`Healing Failed: Binary analysis failed (${scanResult.error})`);
        return;
      }

      const exports = scanResult.exports as { name: string, kind: string }[];
      const exportNames = exports.filter(e => e.kind === 'function').map(e => e.name);
      
      const newRegistry = [...moduleData.registry];
      let healedCount = 0;
      let createdCount = 0;

      // Analizar exportaciones para extraer posibles parámetros/puertos
      exportNames.forEach(rawName => {
        // Ignorar funciones internas obvias
        if (rawName.startsWith('__') || rawName.startsWith('memory') || rawName === 'ace_dsp_process') return;

        // Normalizar nombre (quitar ace_..._set, ace_port_..., etc)
        let cleanId = rawName
          .replace(/^ace_param_/, '').replace(/_set$/, '')
          .replace(/^ace_port_/, '')
          .replace(/^ace_get_/, '');
        
        // Evitar duplicados
        const existing = newRegistry.find(item => item.id === cleanId);
        
        if (!existing) {
          // Crear nueva entidad inferida
          const isPort = rawName.includes('port') || rawName.includes('_out') || rawName.includes('_in');
          const isStream = rawName.includes('stream') || rawName.includes('audio') || rawName.includes('cv');
          
          const newItem: any = {
            id: cleanId,
            label: cleanId.toUpperCase().replace(/_/g, ' '),
            type: isStream ? (rawName.includes('cv') ? 'cv' : 'audio') : 'float',
            roles: isPort ? ['output'] : ['control'],
            front: !isPort, 
            back: false
          };

          // Inferencia proactiva de roles
          if (rawName.includes('_in')) newItem.roles = ['input'];
          if (rawName.includes('_out')) newItem.roles = ['output'];
          if (rawName.includes('param')) {
             newItem.roles = ['control'];
             newItem.type = 'float';
          }

          newRegistry.push(newItem);
          createdCount++;
        } else {
          // Si ya existe, podríamos intentar "aseptizar" su tipo si es legacy
          healedCount++;
        }
      });

      setModuleData(prev => ({ ...prev, registry: newRegistry }));
      addLog(`Healing Complete: Injected ${createdCount} missing entities, verified ${healedCount} existing.`);
      
      // Re-verificar integridad después del healing
      checkWasmIntegrity(currentFilePath, moduleData.id, newRegistry);

    } catch (err: any) {
      addLog(`Critical Healing Failure: ${err.message}`);
    }
  }, [currentFilePath, moduleData.id, moduleData.registry, addLog, checkWasmIntegrity]);

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '_')
      .replace(/^-+|-+$/g, '');
  };

  const updateModuleMetadata = (updates: any) => {
    setModuleData(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  };

  const updateRegistryItem = (id: string, updates: any) => {
    setModuleData(prev => {
      const newRegistry = prev.registry.map(item => {
        if (item.id === id) {
          const newItem = { ...item, ...updates };
          
          const isDefaultId = item.id.startsWith('param_') || item.id === '';
          const hasManuallyEdited = prev._user_edits?.[id];

          // Auto-Slug proactivo si el label cambia
          if (updates.label && (isDefaultId || !hasManuallyEdited)) {
             newItem.id = slugify(updates.label);
          }

          return newItem;
        }
        return item;
      });

      // Si el ID de un item cambia por actualización manual, lo rastreamos
      let newUserEdits = { ...prev._user_edits };
      if (updates.id !== undefined) {
        newUserEdits[id] = true;
      }

      return { ...prev, registry: newRegistry, _user_edits: newUserEdits };
    });
  };

  const applyAsepticSuggestion = useCallback(() => {
    if (suggestedId) {
      setModuleData(prev => ({ ...prev, id: suggestedId }));
      addLog(`Aseptic Alignment: ID changed to '${suggestedId}' to match binary.`);
      setIdMismatch(false);
      setSuggestedId(null);
    }
  }, [suggestedId, addLog]);

  // Trigger integrity check on load or path change
  useEffect(() => {
    if (currentFilePath && moduleData.id) {
      checkWasmIntegrity(currentFilePath, moduleData.id, moduleData.registry);
    }
  }, [currentFilePath, moduleData.id, moduleData.registry, checkWasmIntegrity]);

  const normalizeItem = useCallback((item: any) => {
    // Migración Era 6.2: Mover min, max, default al objeto range
    if (item.min !== undefined || item.max !== undefined || item.default !== undefined) {
      if (!item.range) item.range = {};
      if (item.min !== undefined) item.range.min = item.min;
      if (item.max !== undefined) item.range.max = item.max;
      if (item.default !== undefined) item.range.default = item.default;
      
      // Purga de campos obsoletos para cumplir el contrato 6.2
      delete item.min;
      delete item.max;
      delete item.default;
    }

    // Flags de visibilidad por defecto
    if (item.front === undefined) item.front = true;
    if (item.back === undefined) item.back = false;

    return item;
  }, []);

  const sanitizeManifest = useCallback((data: any) => {
    const clean = JSON.parse(JSON.stringify(data));
    if (clean.registry) {
      clean.registry = clean.registry.map((item: any) => {
        const rItem: any = { 
          id: item.id, 
          label: item.label, 
          type: item.type, 
          roles: item.roles,
          front: item.front ?? true,
          back: item.back ?? false
        };
        if (item.type !== 'audio' && item.type !== 'cv' && item.type !== 'midi') {
          rItem.range = {
            min: item.min ?? 0,
            max: item.max ?? 1,
            default: item.default ?? 0
          };
        }
        return rItem;
      });
    }
    delete clean._aseptic_draft;
    return clean;
  }, []);

  const validateManifest = useCallback(() => {
    const sanitized = sanitizeManifest(moduleData);
    const valid = validateEra6(sanitized);
    
    if (!valid) {
      const technicalErrors = validateEra6.errors || [];
      const pedagogicalErrors = technicalErrors.map(translateAsepticError);
      const heuristicErrors = runHeuristicChecks(moduleData);
      
      const allErrors = [...pedagogicalErrors, ...heuristicErrors];
      
      setValidationErrors(allErrors);
      addLog(`Validation FAILED: Found ${allErrors.length} architectural issues.`);
      return false;
    }

    const heuristicErrors = runHeuristicChecks(moduleData);
    if (heuristicErrors.length > 0) {
      setValidationErrors(heuristicErrors);
      addLog(`Validation WARNING: Found ${heuristicErrors.length} Sound Design suggestions.`);
      // No devolvemos false aquí, permitimos salvar pero avisamos
    } else {
      setValidationErrors([]);
      addLog("Validation SUCCESS: 100% Aseptic.");
    }

    return true;
  }, [moduleData, sanitizeManifest, addLog]);

  const handleOpen = useCallback(async () => {
    // @ts-ignore
    if (window.electronAPI) {
      addLog("Invoking Electron Open Dialog...");
      // @ts-ignore
      const result = await window.electronAPI.selectFile();
      if (!result) {
        addLog("Selection cancelled.");
        return;
      }
      
      const { filePath, content } = result;
      try {
        const parsed: any = yaml.load(content);
        setModuleData({
          id: parsed.id || 'unknown',
          name: parsed.name || 'Untitled',
          description: parsed.description || '',
          modelId: parsed.modelId || parsed.ModelId || 'ACE-GENERIC',
          implementationId: parsed.implementationId ?? parsed.ImplementationId ?? 0,
          engine: parsed.engine || parsed.Engine || 'WASM',
          family: parsed.family || 'OSCILLATOR',
          theme: parsed.theme || parsed.Theme || 'aseptic',
          version: parsed.version || "6.1",
          tags: parsed.tags || [],
          registry: (parsed.registry || []).map(normalizeItem),
          _user_edits: { '_root': true } // Al cargar, marcamos como editado para que no se auto-pise el ID
        });
        setCurrentFilePath(filePath);
        setSelectedId(null);
        addLog(`Loaded: ${filePath}`);
      } catch (err: any) {
        addLog(`Parse Error: ${err.message}`);
      }
    } else {
      addLog("CRITICAL: electronAPI not injected.");
    }
  }, [addLog, normalizeItem]);

  const handleSave = useCallback(async (forceNewPath: boolean = false) => {
    // Forzar validación visual antes de proceder
    const isValid = validateManifest();
    const sanitized = sanitizeManifest(moduleData);
    
    let path = currentFilePath;

    if (!isValid) {
      addLog("WARNING: Manifest is INVALID. Saving as .working draft.");
      if (!confirm("Manifest has errors. It will be saved with .working extension and will be IGNORED by OMEGA. Proceed?")) {
        addLog("Save aborted by user.");
        return;
      }
      (sanitized as any)._aseptic_draft = true;
    }

    // @ts-ignore
    if (window.electronAPI) {
      if (!path || forceNewPath) {
        // @ts-ignore
        const savePath = await window.electronAPI.saveFileDialog(`${moduleData.id}.acemm`);
        if (!savePath) {
          addLog("Save cancelled.");
          return;
        }
        path = savePath;
        setCurrentFilePath(path);
      }

      let finalPath = path;
      if (finalPath) {
        if (!isValid) {
          if (!finalPath.endsWith('.working')) finalPath += '.working';
        } else {
          if (finalPath.endsWith('.working')) {
            finalPath = finalPath.replace('.working', '');
            addLog("Manifest is now VALID. Removing .working extension.");
          }
        }
      }

      const yamlContent = yaml.dump(sanitized, { indent: 2, lineWidth: -1, noRefs: true });
      if (finalPath) {
        // @ts-ignore
        await window.electronAPI.writeFile(finalPath, yamlContent);
        addLog(`Saved successfully: ${finalPath}`);
      }
      
      if (isValid) {
        setCurrentFilePath(finalPath);
        setValidationErrors([]);
        
        // HIGIENE ASÉPTICA: Si existía un .working y acabamos de salvar el oficial, ofrecer borrar el old
        if (finalPath && finalPath.endsWith('.acemm')) {
          const workingPath = `${finalPath}.working`;
          // @ts-ignore
          const workingExists = await window.electronAPI.fileExists(workingPath);
          if (workingExists) {
            if (confirm("ASEPTIC HYGIENE: An old .working draft exists. Delete it now that manifest is official?")) {
              // @ts-ignore
              await window.electronAPI.deleteFile(workingPath);
              addLog(`Hygiene: Deleted obsolete draft ${workingPath}`);
            }
          }
        }
      }
    }
  }, [moduleData, currentFilePath, sanitizeManifest, addLog]);

  const handleNew = useCallback(() => {
    if (confirm("Reset editor?")) {
      setModuleData({
        id: 'new_module',
        name: 'New Module',
        description: '',
        modelId: 'ACE-GENERIC',
        implementationId: 0,
        engine: 'WASM',
        family: 'OSCILLATOR',
        theme: 'aseptic',
        version: '6.1',
        tags: [],
        registry: [],
        _user_edits: {}
      });
      setCurrentFilePath(null);
      setWasmStatus('none');
      setWasmDetails(null);
      addLog("State reset to Aseptic Default.");
    }
  }, [addLog]);

  return {
    moduleData, setModuleData,
    currentFilePath,
    selectedId, setSelectedId,
    validationErrors, setValidationErrors,
    wasmStatus, wasmDetails,
    idMismatch, suggestedId,
    handleAsepticHealing, applyAsepticSuggestion,
    updateModuleMetadata, updateRegistryItem,
    handleOpen, handleSave, handleNew, validateManifest,
    isDirty
  };
};
