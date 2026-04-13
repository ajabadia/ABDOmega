import React, { useState } from 'react';
import RegistryEditor from './components/RegistryEditor';
import PropertyPanel from './components/PropertyPanel';
import LivePreview from './components/LivePreview';
import DebugConsole from './components/DebugConsole';
import WasmHeartbeat from './components/WasmHeartbeat';
import { useAsepticEditor } from './hooks/useAsepticEditor';
import { useDebugService } from './services/debugService';
import era6Schema from './schema.json';
import './index.css';

function App() {
  const { debugLogs, addLog } = useDebugService();
  const {
    moduleData, setModuleData,
    currentFilePath,
    selectedId, setSelectedId,
    validationErrors,
    wasmStatus, wasmDetails,
    idMismatch, suggestedId,
    handleOpen, handleSave, handleNew, validateManifest,
    handleAsepticHealing, applyAsepticSuggestion,
    setValidationErrors
  } = useAsepticEditor(addLog);

  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  
  // Collapse States
  const [propCollapsed, setPropCollapsed] = useState(false);
  const [viewCollapsed, setViewCollapsed] = useState(false);
  const [errorsMinimized, setErrorsMinimized] = useState(false);
  const [consoleMinimized, setConsoleMinimized] = useState(false);

  // Partial handlers for local UI elements
  const handleUpdateParam = (updatedItem: any) => {
    const newRegistry = moduleData.registry.map(item => 
      item.id === selectedId ? updatedItem : item
    );
    setModuleData({ ...moduleData, registry: newRegistry });
  };

  const handleAddParam = () => {
    const newItem = { 
      id: `param_${moduleData.registry.length + 1}`, 
      label: 'NEW PARAMETER', 
      type: 'float', 
      roles: ['control'] 
    };
    setModuleData({ ...moduleData, registry: [...moduleData.registry, newItem] });
    setSelectedId(newItem.id);
    addLog(`Added parameter: ${newItem.id}`);
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

  return (
    <div className="aseptic-editor-container">
      <header className="main-header">
        <div className="brand">
          <h1>OMEGA MANIFEST EDITOR</h1>
          <span className="version-tag">v{moduleData.version}</span>
        </div>
        <div className="main-actions">
          <button className="aseptic-btn" onClick={handleNew}>NEW</button>
          <button className="aseptic-btn" onClick={handleOpen}>OPEN...</button>
          <button className="aseptic-btn" onClick={validateManifest}>VALIDATE</button>
          
          <div className="save-container">
            <button className={`aseptic-btn primary ${saveMenuOpen ? 'active' : ''}`} onClick={() => setSaveMenuOpen(!saveMenuOpen)}>
              SAVE ASEPTIC (.acemm) {saveMenuOpen ? '▴' : '▾'}
            </button>
            {saveMenuOpen && (
              <div className="save-dropdown">
                <button 
                  className={`dropdown-item primary ${!currentFilePath ? 'disabled' : ''}`} 
                  disabled={!currentFilePath}
                  onClick={() => { if(currentFilePath) { triggerSave(false); setSaveMenuOpen(false); } }}
                  style={{ opacity: !currentFilePath ? 0.5 : 1, cursor: !currentFilePath ? 'not-allowed' : 'pointer' }}
                >
                  💾 Save (Overwrite) {!currentFilePath && '(N/A)'}
                </button>
                <button className="dropdown-item" onClick={() => { triggerSave(true); setSaveMenuOpen(false); }}>
                  📂 {currentFilePath ? 'Save As...' : 'Save File...'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="metadata-bar">
        <div className="control-group">
          <label>Internal ID</label>
          <div className="suggestion-anchor">
            {idMismatch && (
              <div 
                className="aseptic-suggestion-popup" 
                onClick={applyAsepticSuggestion}
                title="Click to align with WASM binary name"
              >
                ASEPTIC SUGGESTION: <span className="id-highlight">{suggestedId}</span>?
              </div>
            )}
            <input 
              className={`aseptic-input ${idMismatch ? 'aseptic-error' : ''}`} 
              value={moduleData.id} 
              onChange={(e) => setModuleData({...moduleData, id: e.target.value})} 
            />
          </div>
        </div>
        <div className="control-group" style={{ flex: 1.5 }}>
          <label>Display Name</label>
          <input className="aseptic-input" value={moduleData.name} onChange={(e) => setModuleData({...moduleData, name: e.target.value})} />
        </div>
        <div className="control-group" style={{ flex: 2 }}>
          <label>Description (Identity)</label>
          <textarea 
            className="aseptic-input description-area" 
            value={moduleData.description} 
            onChange={(e) => setModuleData({...moduleData, description: e.target.value})}
            placeholder="Describe the module's aseptic purpose..."
          />
        </div>
        <div className="control-group">
          <label>Family</label>
          <select className="aseptic-input" value={moduleData.family} onChange={(e) => setModuleData({...moduleData, family: e.target.value})}>
            <option value="OSCILLATOR">〰️ OSCILLATOR</option>
            <option value="FILTER">📐 FILTER</option>
            <option value="ENVELOPE">📈 ENVELOPE</option>
            <option value="IO">🔌 IO (INPUT/OUTPUT)</option>
            <option value="FX">✨ FX (EFFECTS)</option>
            <option value="UTILITY">🛠️ UTILITY</option>
          </select>
        </div>

        <div className="control-group" style={{ flex: 1 }}>
          <label>Model ID</label>
          <input 
            className="aseptic-input" 
            value={moduleData.modelId} 
            onChange={(e) => setModuleData({...moduleData, modelId: e.target.value})}
            placeholder="ACE-..."
          />
        </div>

        <div className="control-group" style={{ flex: 0.5 }}>
          <label>Impl. ID</label>
          <input 
            type="number"
            className="aseptic-input" 
            value={moduleData.implementationId} 
            onChange={(e) => setModuleData({...moduleData, implementationId: parseInt(e.target.value) || 0})}
          />
        </div>

        <div className="control-group">
          <label>Engine</label>
          <select className="aseptic-input" value={moduleData.engine} onChange={(e) => setModuleData({...moduleData, engine: e.target.value})}>
            <option value="WASM">WASM (Aseptic)</option>
            <option value="Modular">Modular (Legacy)</option>
          </select>
        </div>

        <div className="control-group">
          <label>Theme</label>
          <select className="aseptic-input" value={moduleData.theme} onChange={(e) => setModuleData({...moduleData, theme: e.target.value})}>
            <option value="aseptic">Aseptic (Neon)</option>
            <option value="industrial">Industrial (Rust)</option>
            <option value="classic">Classic (Gray)</option>
          </select>
        </div>
        
        <div className="image-preview-group">
           <label>Module Face</label>
           <div className="face-preview" title="Assets: assets/[id].png">
             {moduleData.assets?.image ? '🖼️' : (moduleData.family === 'OSCILLATOR' ? '〰️' : (moduleData.family === 'FILTER' ? '📐' : (moduleData.family === 'ENVELOPE' ? '📈' : (moduleData.family === 'IO' ? '🔌' : '✨'))))}
           </div>
        </div>

        <div style={{ marginLeft: 'auto', paddingRight: '15px' }}>
          <WasmHeartbeat status={wasmStatus} details={wasmDetails} onHeal={handleAsepticHealing} />
        </div>
      </section>

      <main className="main-layout" style={{ position: 'relative' }}>
        <div className="panel left-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="panel-title" style={{ paddingBottom: '0', borderBottom: 'none' }}>ECOSISTEMA DE REGISTROS</h3>
            <button className="aseptic-btn-icon-plus" onClick={handleAddParam} title="Add Parameter / Port">
              <span>+</span> ADD PARAMETER
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <RegistryEditor 
              items={moduleData.registry} 
              selectedIndex={moduleData.registry.findIndex(p => p.id === selectedId) === -1 ? null : moduleData.registry.findIndex(p => p.id === selectedId)}
              onUpdate={(newItems) => setModuleData({...moduleData, registry: newItems})}
              onSelect={(index) => setSelectedId(moduleData.registry[index].id)}
            />
          </div>

          <div className="bottom-stack-container" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1100, display: 'flex', flexDirection: 'column' }}>
            {validationErrors.length > 0 && (
              <div className={`validation-panel ${(typeof errorsMinimized !== 'undefined' && errorsMinimized) ? 'minimized' : ''}`} style={{ position: 'relative', height: errorsMinimized ? '28px' : '180px' }}>
                <div className="validation-header" onClick={() => setErrorsMinimized(!errorsMinimized)}>
                  <span>VALIDATION ERRORS ({validationErrors.length})</span>
                  <div className="console-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="icon-btn" title="Copy Errors" onClick={copyErrors}>📋</button>
                    <button className="icon-btn" onClick={() => setErrorsMinimized(!errorsMinimized)}>
                      {errorsMinimized ? '🔼' : '🔽'}
                    </button>
                  </div>
                </div>
                {!errorsMinimized && (
                  <div className="validation-body">
                    <ul>
                      {validationErrors.map((err, i) => (
                        <li key={i}><b>{err.instancePath || 'root'}</b>: {err.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <DebugConsole logs={debugLogs} minimized={consoleMinimized} onToggle={() => setConsoleMinimized(!consoleMinimized)} />
          </div>
        </div>

        <div className={`panel center-panel ${propCollapsed ? 'collapsed' : ''}`} onClick={() => propCollapsed && setPropCollapsed(false)}>
          {propCollapsed ? (
            <div className="collapsed-title">
              <div className="icon">🔧</div>
              <span>ENTITY PROPERTIES</span>
              <button className="icon-btn" style={{marginTop: 'auto', paddingBottom: '20px'}} onClick={(e) => { e.stopPropagation(); setPropCollapsed(false); }}>◀</button>
            </div>
          ) : (
            <>
              <div className="panel-header">
                <h3 className="panel-title">ENTITY PROPERTIES</h3>
                <button className="icon-btn" onClick={() => setPropCollapsed(true)}>▶</button>
              </div>
              <PropertyPanel 
                item={moduleData.registry.find(p => p.id === selectedId) || null} 
                onUpdate={handleUpdateParam}
              />
            </>
          )}
        </div>

        <div className={`panel right-panel ${viewCollapsed ? 'collapsed' : ''}`} onClick={() => viewCollapsed && setViewCollapsed(false)}>
          {viewCollapsed ? (
            <div className="collapsed-title">
              <div className="icon">👁️</div>
              <span>ASEPTIC VERIFICATION</span>
              <button className="icon-btn" style={{marginTop: 'auto', paddingBottom: '20px'}} onClick={(e) => { e.stopPropagation(); setViewCollapsed(false); }}>◀</button>
            </div>
          ) : (
            <>
              <div className="panel-header">
                <h3 className="panel-title">ASEPTIC VERIFICATION</h3>
                <button className="icon-btn" onClick={() => setViewCollapsed(true)}>▶</button>
              </div>
              <LivePreview moduleData={moduleData} />
            </>
          )}
        </div>
      </main>

      <footer className="aseptic-status-bar">
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
            <span className="status-label">SCHEMA:</span>
            <b>Era 6.1</b>
          </div>
          <div className="status-item">
            <span className="status-label">BUILD:</span>
            <b>{(era6Schema as any)._metadata?.build_id || 'unknown'}</b>
          </div>
          <div className="status-item">
            <span className="status-label">GEN:</span>
            <b>{new Date((era6Schema as any)._metadata?.generated_at).toLocaleString() || 'unknown'}</b>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
