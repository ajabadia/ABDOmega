import React, { useState } from 'react';

interface CellBlueprint {
  id: string;
  name: string;
  category: string;
  layout: {
    columns: number;
    hp: number;
    gap: number;
  };
  items: any[];
}

interface CellDesignerProps {
  addLog: (msg: string) => void;
}

const CellDesigner: React.FC<CellDesignerProps> = ({ addLog }) => {
  const [blueprint, setBlueprint] = useState<CellBlueprint>({
    id: 'new_cell',
    name: 'NEW CELL',
    category: 'packs',
    layout: { columns: 2, hp: 10, gap: 12 },
    items: []
  });

  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const handleNew = () => {
    if (confirm('Discard current cell design?')) {
      setBlueprint({
        id: 'new_cell',
        name: 'NEW CELL',
        category: 'packs',
        layout: { columns: 2, hp: 10, gap: 12 },
        items: []
      });
      setActiveTool(null);
      setSelectedElementId(null);
      addLog("[CELL] Started new empty cell design.");
    }
  };

  const handleOpen = async () => {
    // @ts-ignore
    if (!window.electronAPI) return;
    addLog("[CELL] Opening file selection dialog...");
    // @ts-ignore
    const result = await window.electronAPI.selectFile();
    if (!result) {
      addLog("[CELL] Open cancelled.");
      return;
    }

    try {
      const parsed = JSON.parse(result.content);
      // Basic validation
      if (!parsed.items || !parsed.layout) throw new Error('Invalid .acell format');
      
      setBlueprint(parsed);
      setSelectedElementId(null);
      setActiveTool(null);
      addLog(`[CELL] Successfully loaded: ${parsed.id} (${parsed.items.length} items)`);
    } catch (err: any) {
      addLog(`[CELL ERROR] Failed to load cell: ${err.message}`);
      alert(`Error loading cell: ${err.message}`);
    }
  };

  const handleSave = async () => {
    // @ts-ignore
    if (!window.electronAPI) {
      addLog("[CELL] Browser fallback: triggering download.");
      const data = JSON.stringify(blueprint, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${blueprint.id}.acell`;
      a.click();
      return;
    }

    addLog(`[CELL] Saving ${blueprint.id}.acell...`);
    // @ts-ignore
    const savePath = await window.electronAPI.saveFileDialog(`${blueprint.id}.acell`);
    if (!savePath) {
      addLog("[CELL] Save cancelled.");
      return;
    }

    const content = JSON.stringify(blueprint, null, 2);
    // @ts-ignore
    const success = await window.electronAPI.writeFile(savePath, content);
    if (success) {
      addLog(`[CELL] Saved successfully to: ${savePath}`);
      alert('Cell saved successfully.');
    } else {
      addLog(`[CELL ERROR] Failed to write file: ${savePath}`);
      alert('Failed to save cell.');
    }
  };

  const handlePlaceComponent = (row: number, col: number) => {
    if (!activeTool) return;

    // Check if cell is occupied
    if (blueprint.items.some(item => item.row === row && item.col === col)) {
      addLog(`[DESIGN] Placement rejected: cell ${row}:${col} occupied.`);
      alert('Cell occupied!');
      return;
    }

    const newItem = {
      id: `${activeTool}_${Date.now()}`,
      look: activeTool,
      label: activeTool.toUpperCase(),
      row: row,
      col: col,
      variant: 'default'
    };

    setBlueprint({
      ...blueprint,
      items: [...blueprint.items, newItem]
    });
    setSelectedElementId(newItem.id);
    addLog(`[DESIGN] Placed ${activeTool.toUpperCase()} at ${row}:${col}`);
  };

  const removeComponent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBlueprint({
      ...blueprint,
      items: blueprint.items.filter(item => item.id !== id)
    });
    if (selectedElementId === id) setSelectedElementId(null);
    addLog(`[DESIGN] Removed component: ${id}`);
  };

  return (
    <div className="cell-designer-workspace">
      {/* 1. TOP TOOLBAR */}
      <div className="designer-toolbar">
        <div className="file-actions">
          <button className="aseptic-btn" onClick={handleNew}>NEW</button>
          <button className="aseptic-btn" onClick={handleOpen}>OPEN...</button>
          <button className="aseptic-btn primary" onClick={handleSave}>SAVE AS .ACELL</button>
        </div>
        <div className="blueprint-info">
          <span className="info-label">DESIGNING:</span>
          <span className="info-value">{blueprint.name}</span>
          <span className="info-tag">({blueprint.id}.acell)</span>
        </div>
      </div>

      <div className="designer-main">
        {/* 2. COMPONENT PALETTE (LEFT) */}
        <aside className="designer-aside palette">
          <header className="aside-header">PALETTE</header>
          <div className="palette-grid">
            {['knob', 'slider_v', 'slider_h', 'switch', 'port', 'led', 'display', 'meter', 'button'].map(type => (
              <div 
                key={type} 
                className={`palette-item ${activeTool === type ? 'active' : ''}`} 
                onClick={() => setActiveTool(activeTool === type ? null : type)}
                title={`Select ${type}`}
                style={{ borderColor: activeTool === type ? 'var(--neon-cyan)' : '' }}
              >
                <div className="item-icon">
                  {type === 'knob' ? '🔘' : type === 'port' ? '🔌' : type === 'led' ? '🚨' : '🎛️'}
                </div>
                <span className="item-label">{type.toUpperCase()}</span>
              </div>
            ))}
          </div>
          {activeTool && (
            <div className="tool-hint">
              <p>TAP A GRID CELL TO PLACE: <b>{activeTool.toUpperCase()}</b></p>
            </div>
          )}
        </aside>

        {/* 3. STAGE (CENTER) */}
        <main className="designer-stage">
          <div className="stage-controls">
            <div className="control-group">
              <label>HP:</label>
              <input type="number" value={blueprint.layout.hp || 0} onChange={e => setBlueprint({...blueprint, layout: {...blueprint.layout, hp: parseInt(e.target.value) || 0}})} />
            </div>
            <div className="control-group">
              <label>COLS:</label>
              <input type="number" value={blueprint.layout.columns || 0} onChange={e => setBlueprint({...blueprint, layout: {...blueprint.layout, columns: parseInt(e.target.value) || 0}})} />
            </div>
          </div>
          
          <div className="visual-canvas">
            <div 
              className="module-grid-preview" 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: `repeat(${blueprint.layout.columns}, 1fr)`,
                gap: `${blueprint.layout.gap}px`,
                width: `${blueprint.layout.hp * 30}px` 
              }}
            >
              {/* GRID MESH */}
              {Array.from({ length: blueprint.layout.columns * 6 }).map((_, i) => {
                const row = Math.floor(i / blueprint.layout.columns);
                const col = i % blueprint.layout.columns;
                const occupant = blueprint.items.find(item => item.row === row && item.col === col);

                return (
                  <div 
                    key={i} 
                    className={`grid-drop-zone ${occupant ? 'occupied' : ''} ${selectedElementId === occupant?.id ? 'selected' : ''}`}
                    onClick={() => occupant ? setSelectedElementId(occupant.id) : handlePlaceComponent(row, col)}
                  >
                    {!occupant && <span className="zone-coord">{row}:{col}</span>}
                    {occupant && (
                      <div className={`placed-component ${occupant.look}`}>
                        <span className="comp-icon">{occupant.look === 'knob' ? '🔘' : '🎛️'}</span>
                        <button className="remove-btn" onClick={(e) => removeComponent(occupant.id, e)}>×</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        {/* 4. INSPECTOR (RIGHT) */}
        <aside className="designer-aside inspector">
          <header className="aside-header">INSPECTOR</header>
          <div className="inspector-content">
             {selectedElementId ? (
               (() => {
                 const item = blueprint.items.find(i => i.id === selectedElementId);
                 if (!item) return <div className="empty-state">Element not found.</div>;
                 return (
                   <div className="inspector-form">
                     <div className="form-title">ELEMENT PROPERTIES</div>
                     <div className="form-group">
                        <label>BINDING ID</label>
                        <input type="text" value={item.id} onChange={e => {
                          const newItems = blueprint.items.map(i => i.id === selectedElementId ? {...i, id: e.target.value} : i);
                          setBlueprint({...blueprint, items: newItems});
                          setSelectedElementId(e.target.value);
                        }} />
                     </div>
                     <div className="form-group">
                        <label>UI LABEL</label>
                        <input type="text" value={item.label} onChange={e => {
                          const newItems = blueprint.items.map(i => i.id === selectedElementId ? {...i, label: e.target.value} : i);
                          setBlueprint({...blueprint, items: newItems});
                        }} />
                     </div>
                     <div className="form-group">
                        <label>VARIANT</label>
                        <select value={item.variant} onChange={e => {
                          const newItems = blueprint.items.map(i => i.id === selectedElementId ? {...i, variant: e.target.value} : i);
                          setBlueprint({...blueprint, items: newItems});
                        }}>
                          <option value="default">Default</option>
                          <option value="A">Variant A</option>
                          <option value="B">Variant B</option>
                        </select>
                     </div>
                     <button className="aseptic-btn danger" style={{marginTop: '20px'}} onClick={(e) => removeComponent(item.id, e as any)}>DELETE ELEMENT</button>
                   </div>
                 );
               })()
             ) : (
               <div className="inspector-form">
                  <div className="form-title">CELL GLOBAL METADATA</div>
                  <div className="form-group">
                    <label>UNIQUE ID (Snake Case)</label>
                    <input type="text" value={blueprint.id} onChange={e => setBlueprint({...blueprint, id: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>DISPLAY NAME</label>
                    <input type="text" value={blueprint.name} onChange={e => setBlueprint({...blueprint, name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>CATEGORY</label>
                    <select value={blueprint.category} onChange={e => setBlueprint({...blueprint, category: e.target.value})}>
                      <option value="packs">Standard Packs</option>
                      <option value="oscillators">Oscillators</option>
                      <option value="modulators">Modulators</option>
                      <option value="fx">FX Modules</option>
                      <option value="user">User Custom</option>
                    </select>
                  </div>
                  <div className="empty-state" style={{ padding: '20px 0', borderTop: '1px solid #1a1a1f', marginTop: '20px', color: '#444', fontSize: '9px' }}>
                    Click an element on the grid to edit its specific properties.
                  </div>
               </div>
             )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CellDesigner;
