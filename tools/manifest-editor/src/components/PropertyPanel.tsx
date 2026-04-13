import React from 'react';

interface RegistryItem {
  id: string;
  label: string;
  type: string;
  roles: string[];
  min?: number;
  max?: number;
  default?: number;
  unit?: string;
  import?: string;
  lookup?: {
    id?: string;
    items: Array<{ value: any; label: string }>;
  };
  presentation?: {
    tab?: string;
    group?: string;
    order?: number;
    ui?: {
      component?: string;
      variant?: string;
    };
    attachments?: Array<{
      type: 'label' | 'display' | 'led';
      position: 'top' | 'bottom' | 'left' | 'right';
      role?: string;
      format?: {
        decimals?: number;
        prefix?: string;
        suffix?: string;
      };
    }>;
  };
}

interface PropertyPanelProps {
  item: RegistryItem | null;
  onUpdate: (item: RegistryItem) => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({ item, onUpdate }) => {
  if (!item) {
    return (
      <div style={{ width: '350px', padding: '20px', borderLeft: '1px solid #333', color: '#666', fontStyle: 'italic' }}>
        Select a parameter to edit properties...
      </div>
    );
  }

  const updateNested = (path: string, value: any) => {
    const newItem = { ...item };
    const parts = path.split('.');
    let current: any = newItem;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
    onUpdate(newItem);
  };

  return (
    <div style={{ width: '350px', padding: '20px', borderLeft: '1px solid #333', overflowY: 'auto', background: '#0a0a0a' }}>
      <h3 className="panel-title" style={{ marginBottom: '20px', color: 'var(--neon-cyan)' }}>ENTITY PROPERTIES</h3>

      {/* VEM-061: TECHNICAL ATTRIBUTES */}
      <section style={{ marginBottom: '30px' }}>
        <h4 style={{ fontSize: '11px', color: '#666', letterSpacing: '1px', borderBottom: '1px solid #222', paddingBottom: '5px' }}>TECHNICAL ATTRIBUTES</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
          <div className="control-group">
            <label>Type</label>
            <select className="aseptic-input" value={item.type} onChange={(e) => onUpdate({...item, type: e.target.value})}>
              <option value="float">FLOAT (0.0 - 1.0)</option>
              <option value="int">INT (Discrete)</option>
              <option value="bool">BOOL (Active/Off)</option>
              <option value="list">LIST (Menu)</option>
              <option value="audio">AUDIO (Stream)</option>
              <option value="cv">CV (Control V)</option>
              <option value="midi">MIDI (Data)</option>
            </select>
          </div>
          <div className="control-group">
            <label>Unit</label>
            <input className="aseptic-input" value={item.unit ?? ''} onChange={(e) => onUpdate({...item, unit: e.target.value})} placeholder="Hz, dB, etc." />
          </div>
          <div className="control-group">
            <label>Min</label>
            <input type="number" className="aseptic-input" value={item.min ?? 0} onChange={(e) => onUpdate({...item, min: parseFloat(e.target.value)})} />
          </div>
          <div className="control-group">
            <label>Max</label>
            <input type="number" className="aseptic-input" value={item.max ?? 1} onChange={(e) => onUpdate({...item, max: parseFloat(e.target.value)})} />
          </div>
          <div className="control-group">
            <label>Default</label>
            <input type="number" className="aseptic-input" value={item.default ?? 0} onChange={(e) => onUpdate({...item, default: parseFloat(e.target.value)})} />
          </div>
        </div>
      </section>

      {/* VEM-398: INTELLIGENT LOOKUPS */}
      <section style={{ marginBottom: '30px' }}>
        <h4 style={{ fontSize: '11px', color: '#666', letterSpacing: '1px', borderBottom: '1px solid #222', paddingBottom: '5px' }}>INTELLIGENT LOOKUP</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
          <div className="control-group" style={{ alignItems: 'flex-start' }}>
            <label>Lookup Source</label>
            <select 
              className="aseptic-input" 
              style={{ width: '100%' }} 
              value={item.import ? 'import' : 'manual'} 
              onChange={(e) => {
                if (e.target.value === 'manual') {
                  onUpdate({...item, import: undefined, lookup: { items: [{ value: '0', label: 'Item 1' }] }});
                } else {
                  onUpdate({...item, import: 'core.midi.channels', lookup: undefined});
                }
              }}
            >
              <option value="manual">MANUAL LIST (Local)</option>
              <option value="import">GLOBAL CATALOG (Import)</option>
            </select>
          </div>

          {item.import ? (
            <div className="control-group">
              <label>Catalog Path</label>
              <input 
                className="aseptic-input" 
                value={item.import} 
                onChange={(e) => onUpdate({...item, import: e.target.value})} 
                placeholder="e.g. core.midi.channels"
              />
              <span style={{ fontSize: '9px', color: 'var(--neon-cyan)', opacity: 0.6 }}>Reference from OMEGA global catalog.</span>
            </div>
          ) : (
            <div className="lookup-editor">
              <label style={{ fontSize: '10px', color: '#444' }}>MANUAL ITEMS</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ fontSize: '8px', textAlign: 'left', color: '#333' }}>VALUE</th>
                      <th style={{ fontSize: '8px', textAlign: 'left', color: '#333' }}>LABEL (UI)</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(item.lookup?.items || []).map((li, idx) => (
                      <tr key={idx}>
                        <td>
                          <input className="aseptic-input" style={{ width: '50px' }} value={li.value} onChange={(e) => {
                            const newItems = [...(item.lookup?.items || [])];
                            newItems[idx] = { ...li, value: e.target.value };
                            updateNested('lookup.items', newItems);
                          }} />
                        </td>
                        <td>
                          <input className="aseptic-input" style={{ width: '100%' }} value={li.label} onChange={(e) => {
                            const newItems = [...(item.lookup?.items || [])];
                            newItems[idx] = { ...li, label: e.target.value };
                            updateNested('lookup.items', newItems);
                          }} />
                        </td>
                        <td>
                          <button className="del-btn-small" onClick={() => {
                            const newItems = item.lookup?.items.filter((_, i) => i !== idx);
                            updateNested('lookup.items', newItems);
                          }}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button className="add-btn-small" onClick={() => {
                  const newItems = [...(item.lookup?.items || []), { value: '', label: 'New Item' }];
                  updateNested('lookup.items', newItems);
                }}>+ ADD ITEM</button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* VEM-063: PRESENTATION & LAYOUT */}
      <section style={{ marginBottom: '30px' }}>
        <h4 style={{ fontSize: '11px', color: '#666', letterSpacing: '1px', borderBottom: '1px solid #222', paddingBottom: '5px' }}>LAYOUT & COMPONENT</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
          <div className="control-group">
            <label>Target Tab</label>
            <select className="aseptic-input" value={item.presentation?.tab ?? 'MAIN'} onChange={(e) => updateNested('presentation.tab', e.target.value)}>
              <option value="MAIN">MAIN (Primary Rack)</option>
              <option value="PATCHING">PATCHING (I/O Matrix)</option>
              <option value="SETUP">SETUP (Advanced)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="control-group">
              <label>Component</label>
              <select className="aseptic-input" value={item.presentation?.ui?.component ?? 'knob'} onChange={(e) => updateNested('presentation.ui.component', e.target.value)}>
                <option value="knob">KNOB</option>
                <option value="slider_v">FADER V</option>
                <option value="slider_h">FADER H</option>
                <option value="switch">SWITCH</option>
                <option value="port">PORT</option>
              </select>
            </div>
            <div className="control-group">
              <label>Variant</label>
              <select className="aseptic-input" value={item.presentation?.ui?.variant ?? 'B'} onChange={(e) => updateNested('presentation.ui.variant', e.target.value)}>
                <option value="A">HERO</option>
                <option value="B">STD</option>
                <option value="C">COMP</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* VEM-522: ATTACHMENTS EDITOR */}
      <section>
        <h4 style={{ fontSize: '11px', color: '#666', letterSpacing: '1px', borderBottom: '1px solid #222', paddingBottom: '5px' }}>UI ATTACHMENTS</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
          {(item.presentation?.attachments || []).map((att, idx) => (
            <div key={idx} style={{ padding: '15px', border: '1px solid #222', borderRadius: '4px', background: '#0e0e0e' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div className="control-group">
                  <label>Type</label>
                  <select className="aseptic-input" value={att.type} onChange={(e) => {
                    const newAtts = [...(item.presentation?.attachments || [])];
                    newAtts[idx] = { ...att, type: e.target.value as any };
                    updateNested('presentation.attachments', newAtts);
                  }}>
                    <option value="label">LABEL</option>
                    <option value="display">DISPLAY</option>
                    <option value="led">LED</option>
                  </select>
                </div>
                <div className="control-group">
                  <label>Pos</label>
                  <select className="aseptic-input" value={att.position} onChange={(e) => {
                    const newAtts = [...(item.presentation?.attachments || [])];
                    newAtts[idx] = { ...att, position: e.target.value as any };
                    updateNested('presentation.attachments', newAtts);
                  }}>
                    <option value="top">TOP</option>
                    <option value="bottom">BTM</option>
                    <option value="left">LFT</option>
                    <option value="right">RGT</option>
                  </select>
                </div>
              </div>

              {att.type === 'display' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div className="control-group">
                    <label>Decimals</label>
                    <input type="number" className="aseptic-input" value={att.format?.decimals ?? 2} onChange={(e) => {
                      const newAtts = [...(item.presentation?.attachments || [])];
                      newAtts[idx] = { ...att, format: { ...(att.format || {}), decimals: parseInt(e.target.value) } };
                      updateNested('presentation.attachments', newAtts);
                    }} />
                  </div>
                  <div className="control-group">
                    <label>Suffix</label>
                    <input className="aseptic-input" value={att.format?.suffix ?? ''} onChange={(e) => {
                      const newAtts = [...(item.presentation?.attachments || [])];
                      newAtts[idx] = { ...att, format: { ...(att.format || {}), suffix: e.target.value } };
                      updateNested('presentation.attachments', newAtts);
                    }} placeholder="e.g. Hz" />
                  </div>
                </div>
              )}

              <button className="del-btn-small" style={{ width: '100%', padding: '5px' }} onClick={() => {
                const newAtts = item.presentation?.attachments?.filter((_, i) => i !== idx);
                updateNested('presentation.attachments', newAtts);
              }}>REMOVE ATTACHMENT</button>
            </div>
          ))}
          <button className="add-btn-small" style={{ margin: '0' }} onClick={() => {
            const newAtts = [...(item.presentation?.attachments || []), { type: 'display', position: 'bottom', format: { decimals: 2, suffix: '' } }];
            updateNested('presentation.attachments', newAtts);
          }}>+ ADD ATTACHMENT</button>
        </div>
      </section>
    </div>
  );
};

export default PropertyPanel;
