import { useState } from 'react';
import PropertyPanel from './components/PropertyPanel';
import LivePreview from './components/LivePreview';
import DebugConsole from './components/DebugConsole';
import WasmHeartbeat from './components/WasmHeartbeat';
import { useAsepticEditor } from './hooks/useAsepticEditor';
import { useDebugService } from './services/debugService';
import { useAssets } from './hooks/useAssets';
import AsepticOutline from './components/AsepticOutline';
import SourceViewer from './components/SourceViewer';
import PatchingSanctuary from './components/PatchingSanctuary';
import TemplateGallery from './components/TemplateGallery';
import CellDesigner from './components/CellDesigner';
import RepoDashboard from './components/RepoDashboard';
import era6Schema from './schema.json';
import './index.css';

function App() {
  const { debugLogs, addLog } = useDebugService();
  const { 
    moduleData, setModuleData, 
    selectedId, setSelectedId,
    validationErrors, validateManifest,
    currentFilePath, handleSave, handleNew, handleOpen,
    wasmStatus, wasmDetails,
    handleAsepticHealing,
    updateModuleMetadata, updateRegistryItem,
    isDirty, dirtyItems, syncContract
  } = useAsepticEditor(addLog);

  const { assetStates } = useAssets(moduleData.id);

  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const [appMode, setAppMode] = useState<'manifest' | 'cell'>('manifest');
  
  // View State (Centralized Navigation)
  const [activeView, setActiveView] = useState<'editor' | 'preview' | 'source' | 'patching_hub' | 'repo_health'>('editor');
  
  // Collapse States
  const [outlineCollapsed, setOutlineCollapsed] = useState(false);
  const [errorsMinimized, setErrorsMinimized] = useState(false);
  const [consoleMinimized, setConsoleMinimized] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [cells, setCells] = useState<any[]>([]);

  useEffect(() => {
    // Load available cells for blueprint selection
    const loadCells = async () => {
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        const availableCells = await window.electronAPI.readCells();
        setCells(availableCells);
      }
    };
    loadCells();
  }, []);

  // Partial handlers for local UI elements
  const openPropertyModal = (id: string | null) => {
    setEditingItemId(id);
    setIsPropertyModalOpen(true);
  };
  
  const handleUpdateParam = (updatedItem: any) => {
    if (editingItemId === '_module_root') {
       updateModuleMetadata(updatedItem);
       return;
    }
    updateRegistryItem(editingItemId!, updatedItem);
  };

  const handleDeleteParam = (id: string) => {
    const newRegistry = moduleData.registry.filter(p => p.id !== id);
    setModuleData({ ...moduleData, registry: newRegistry });
    setIsPropertyModalOpen(false);
    addLog(`Deleted parameter: ${id}`);
  };

  const handleDuplicateParam = (id: string) => {
    const original = moduleData.registry.find(p => p.id === id);
    if (!original) return;

    const newItem = JSON.parse(JSON.stringify(original));
    newItem.id = `${original.id}_copy`;
    newItem.label = `${original.label} (COPY)`;
    
    // Ensure uniqueness
    let counter = 1;
    while (moduleData.registry.some(p => p.id === newItem.id)) {
      newItem.id = `${original.id}_copy_${counter++}`;
    }

    const newRegistry = [...moduleData.registry, newItem];
    setModuleData({ ...moduleData, registry: newRegistry });
    setEditingItemId(newItem.id);
    addLog(`Duplicated parameter: ${newItem.id}`);
  };

  const handleAddParam = () => {
    const newItem = { 
      id: `param_${moduleData.registry.length + 1}`, 
      label: 'NEW PARAMETER', 
      type: 'float', 
      roles: ['control'],
      front: true,
      back: false
    };
    setModuleData({ ...moduleData, registry: [...moduleData.registry, newItem] });
    openPropertyModal(newItem.id);
    addLog(`Added parameter: ${newItem.id}`);
  };

  // Exponer para que el AsepticOutline pueda llamarlo (solución temporal hasta refactor de contexto)
  (window as any).handleAddParam = handleAddParam;

  const handleAddItemsFromTemplate = (templateItems: any[], autoGroup?: string) => {
    const newRegistry = [...moduleData.registry];
    
    // Resolve group name
    const groupName: string = (autoGroup as any) || 'MAIN';
    // Unique Cell ID for this pack instance
    const cellId = `cell_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Get last order in group to continue sequence
    const groupItems = newRegistry.filter(i => i.presentation?.group === groupName);
    let lastOrder = groupItems.length > 0 
      ? Math.max(...groupItems.map(i => i.presentation?.order || 0))
      : 0;

    templateItems.forEach((tplItem, idx) => {
      // Generate unique ID
      const baseId = tplItem.id || `${moduleData.id}_${tplItem.id_suffix || 'item'}`;
      let finalId = baseId;
      let counter = 1;
      while (newRegistry.some(i => i.id === finalId)) {
        finalId = `${baseId}_${counter++}`;
      }

      const newItem = {
        ...tplItem,
        id: finalId,
        presentation: {
          ...tplItem.presentation,
          group: groupName,
          order: lastOrder + idx + 1,
          cell: templateItems.length > 1 ? cellId : undefined // Only tag as cell if it's a pack
        }
      };
      
      // Remove helper fields
      delete (newItem as any).id_suffix;

      newRegistry.push(newItem);
    });

    setModuleData({ ...moduleData, registry: newRegistry });
    addLog(`Injected template pack with ${templateItems.length} items (Cell ID: ${cellId}).`);
  };

  const copyErrors = () => {
    const text = validationErrors.map(e => `${e.instancePath}: ${e.message}`).join('\n');
    navigator.clipboard.writeText(text);
    addLog("Validation errors copied to clipboard.");
  };

  const triggerSave = async (forceNewPath: boolean) => {
    const isValid = validateManifest();
    if (!isValid) {
      setErrorsMinimized(false); // AUTO-EXPAND ERRORS
    }
    await handleSave(forceNewPath);
  };

  const safeNew = () => {
    if (isDirty && !confirm("You have unsaved changes. Resetting will lose them. Continue?")) return;
    handleNew();
  };

  const safeOpen = () => {
    if (isDirty && !confirm("You have unsaved changes. Opening a new file will lose them. Continue?")) return;
    handleOpen();
  };

  // Prevent accidental close
  useState(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  });

  return (
    <div className="aseptic-app-shell">
      {/* MODE SWITCHER */}
      <nav className="mode-switcher">
        <div 
          className={`mode-tab ${appMode === 'manifest' ? 'active' : ''}`}
          onClick={() => setAppMode('manifest')}
        >📁 MANIFEST EDITOR</div>
        <div 
          className={`mode-tab cell-mode ${appMode === 'cell' ? 'active' : ''}`}
          onClick={() => setAppMode('cell')}
        >📐 CELL DESIGNER</div>
        
        <div className="spacer" style={{ flex: 1 }}></div>
        
        <button 
          className={`mode-tab console-toggle ${!consoleMinimized ? 'active' : ''}`}
          onClick={() => setConsoleMinimized(!consoleMinimized)}
        >🛠️ CONSOLE</button>
      </nav>

      <main className="app-content">
        {appMode === 'cell' ? (
          <CellDesigner addLog={addLog} />
        ) : (
        <div className="aseptic-editor-container" data-theme={moduleData.theme || 'aseptic'}>
          <header className="main-header">
            <div className="brand">
              <h1>OMEGA MANIFEST WORKBENCH</h1>
              <span className="version-tag">v{moduleData.version}</span>
            </div>
            <div className="main-actions">
              <button className="aseptic-btn" onClick={safeNew}>NEW</button>
              <button className="aseptic-btn" onClick={safeOpen}>OPEN...</button>
              <button className="aseptic-btn" onClick={validateManifest}>VALIDATE</button>
              
              <div className="save-container">
                <button className={`aseptic-btn primary ${saveMenuOpen ? 'active' : ''} ${isDirty ? 'dirty' : ''}`} onClick={() => setSaveMenuOpen(!saveMenuOpen)}>
                  SAVE ASEPTIC (.acemm) {saveMenuOpen ? '▴' : '▾'}
                </button>
                {saveMenuOpen && (
                  <div className="save-dropdown">
                    <button 
                      className={`dropdown-item primary ${!currentFilePath ? 'disabled' : ''}`} 
                      disabled={!currentFilePath}
                      onClick={() => { if(currentFilePath) { triggerSave(false); setSaveMenuOpen(false); } }}
                    >
                      💾 Save (Overwrite)
                    </button>
                    <button className="dropdown-item" onClick={() => { triggerSave(true); setSaveMenuOpen(false); }}>
                      📂 {currentFilePath ? 'Save As...' : 'Save File...'}
                    </button>
                  </div>
                )}
              </div>

              <WasmHeartbeat status={wasmStatus} details={wasmDetails} onHeal={handleAsepticHealing} />
              
              <button 
                className="aseptic-btn icon-only sync-btn" 
                onClick={syncContract} 
                title="Sync ACE Contract from Engine (↻)"
              >
                ↻
              </button>
            </div>
          </header>

          <main className="main-layout">
            {/* PANEL IZQUIERDO: NAVEGACIÓN ESTRUCTURAL */}
            <aside className={`panel outline-panel ${outlineCollapsed ? 'collapsed' : ''}`}>
              <div className="panel-header">
                {!outlineCollapsed && <h3 className="panel-title">NAVIGATOR</h3>}
                <button 
                  className={`icon-btn collapse-toggle ${outlineCollapsed ? 'collapsed' : ''}`} 
                  onClick={() => setOutlineCollapsed(!outlineCollapsed)}
                  title={outlineCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                  {outlineCollapsed ? '▶' : '◀'}
                </button>
              </div>
              <AsepticOutline 
                moduleData={moduleData}
                activeView={activeView}
                onViewChange={setActiveView}
                assetStatus={assetStates.loading ? 'loading' : (assetStates.exists ? 'exists' : 'missing')}
                collapsed={outlineCollapsed}
                onExpand={() => setOutlineCollapsed(false)}
                onSelect={(id) => {
                  setSelectedId(id);
                  if (activeView !== 'editor') setActiveView('editor');
                  openPropertyModal(id);
                }}
                selectedId={selectedId}
                dirtyItems={dirtyItems}
              />
            </aside>

            {/* CONTENEDOR CENTRAL DINÁMICO */}
            <section className="panel editor-panel workspace-central">
              
              <div className="workspace-view hub-view-container" style={{ display: activeView === 'patching_hub' ? 'flex' : 'none', flex: 1, overflow: 'hidden', background: '#0a0a0a' }}>
                 <PatchingSanctuary 
                  moduleData={moduleData} 
                  onUpdateItem={updateRegistryItem} 
                  onAddSignal={handleAddParam}
                  onOpenGallery={() => setIsGalleryOpen(true)}
                  onEditItem={openPropertyModal}
                  onOpenModuleInfo={() => openPropertyModal('_module_root')}
                 />
              </div>

              {activeView === 'preview' && (
                 <div className="workspace-view preview-view-container">
                    <LivePreview moduleData={moduleData} onUpdate={updateModuleMetadata} />
                 </div>
              )}

              {activeView === 'source' && (
                 <div className="workspace-view source-view-container">
                    <SourceViewer moduleData={moduleData} />
                 </div>
              )}

              {activeView === 'repo_health' && (
                 <div className="workspace-view repo-view-container">
                    <RepoDashboard addLog={addLog} />
                 </div>
              )}

              {/* Errores de Registro / Validación - Solo Manifest Editor */}
              {validationErrors.length > 0 && (
                <div className="terminal-stack manifest-errors">
                  <div className={`validation-panel ${errorsMinimized ? 'minimized' : ''}`}>
                    <div className="validation-header" onClick={() => setErrorsMinimized(!errorsMinimized)}>
                      <span>VALIDATION ERRORS ({validationErrors.length})</span>
                      <div className="console-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="icon-btn" onClick={copyErrors}>📋</button>
                        <button className="icon-btn" onClick={() => setErrorsMinimized(!errorsMinimized)}>{errorsMinimized ? '🔼' : '🔽'}</button>
                      </div>
                    </div>
                    {!errorsMinimized && (
                      <div className="validation-body">
                        {validationErrors.map((err, i) => {
                          let readablePath = err.instancePath;
                          // Map /registry/N/field to "Parameter Label > Field"
                          const match = err.instancePath.match(/\/registry\/(\d+)\/(.*)/);
                          if (match) {
                            const index = parseInt(match[1]);
                            const field = match[2];
                            const param = moduleData.registry[index];
                            readablePath = `${param?.label || `Item #${index}`} ➔ ${field.toUpperCase()}`;
                          } else if (err.instancePath === "") {
                            readablePath = "MODULE ROOT";
                          } else {
                            readablePath = err.instancePath.replace(/^\//, '').replace(/\//g, ' ➔ ').toUpperCase();
                          }

                          return (
                            <div key={i} className="error-log">
                              <span className="error-path-tag">{readablePath}</span>
                              <span className="error-sep">:</span>
                              <span className="error-text">{err.message}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </main>
        </div>
      )}
      </main>

      {/* GLOBAL SYSTEM CONSOLE */}
      <div className="global-terminal-container">
        <DebugConsole logs={debugLogs} minimized={consoleMinimized} onToggle={() => setConsoleMinimized(!consoleMinimized)} />
      </div>

      {/* FLOATING CELL LIBRARY */}
      {isGalleryOpen && (
        <TemplateGallery 
          onAddItems={handleAddItemsFromTemplate} 
          onClose={() => setIsGalleryOpen(false)} 
          isFloating
        />
      )}

      {/* PROPERTY MODAL (ERA 6.3 MODAL REFACTOR) */}
      {isPropertyModalOpen && (
         <PropertyPanel 
          item={editingItemId === '_module_root' ? { ...moduleData } as any : (moduleData.registry.find(p => p.id === editingItemId) || null)} 
          isRoot={editingItemId === '_module_root'}
          errors={validationErrors}
          assetStates={assetStates}
          isModal={true}
          cells={cells}
          onClose={() => setIsPropertyModalOpen(false)}
          onUpdate={handleUpdateParam}
          onDelete={handleDeleteParam}
          onDuplicate={handleDuplicateParam}
        />
      )}

          <footer className="aseptic-status-bar">
            {/* ... left part remains same ... */}
            <div className="status-left">
              <div className="status-item">
                <span className="status-label">FILE:</span>
                <b>{currentFilePath || 'NEW FILE (PENDING SAVE)'}</b>
                {currentFilePath?.endsWith('.acemm') && <span className="aseptic-badge">ASEPTIC</span>}
                {!currentFilePath && <span className="aseptic-badge" style={{background: 'rgba(255,255,255,0.1)', color: '#aaa'}}>VIRTUAL</span>}
                {currentFilePath?.endsWith('.working') && <span className="aseptic-badge" style={{background: 'rgba(255, 170, 0, 0.2)', color: 'var(--neon-amber)'}}>DRAFT (.working)</span>}
              </div>
            </div>
            <div className="status-right">
              <div className="status-item">
                <span className="status-label">CONTRACT:</span>
                <b>6.3 (Dynamic)</b>
              </div>
              <div className="status-item">
                <span className="status-label">GEN:</span>
                <b>{new Date().toLocaleTimeString()}</b>
                <span className="aseptic-badge" style={{marginLeft: '8px'}}>SYNCED</span>
              </div>
            </div>
          </footer>
    </div>
  );
}

export default App;
