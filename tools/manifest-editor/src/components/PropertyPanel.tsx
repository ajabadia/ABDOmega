import React from 'react';
import helpData from '../help_content.json';

interface RegistryItem {
  id: string;
  label: string;
  type: string;
  roles?: string[];
  range?: {
    min?: number;
    max?: number;
    default?: number;
  };
  unit?: string;
  precision?: number;    // ERA 6.3
  ui_precision?: number; // ERA 6.3
  front: boolean;
  back: boolean;
  theme?: 'aseptic' | 'industrial' | 'classic'; // Root only
  tags?: string[];       // ERA 6.3
  layout?: {             // ERA 6.3
    hp?: number;
    rack?: 'upper' | 'lower';
  };
  presentation?: {
    tab?: string;
    group?: string;
    order?: number;
    cell?: string;       // ERA 6.3
    ui?: {
      component?: string;
      variant?: string;
      size?: string;
    };
    attachments?: Array<{
      type: 'label' | 'display' | 'led';
      position: 'top' | 'bottom' | 'left' | 'right';
      role?: string;
      unit?: string;
      color?: string;    // ERA 6.3
      bind?: string;     // ERA 6.3
    }>;
  };
}

interface PropertyPanelProps {
  item: RegistryItem | null;
  isRoot: boolean;
  onUpdate: (item: RegistryItem) => void;
  onClose?: () => void;
  isModal?: boolean;
  errors: any[];
  assetStates?: {
    exists: boolean | null;
    loading: boolean;
    fullPath: string;
  };
}

const AsepticTooltip: React.FC<{ topic: string }> = ({ topic }) => {
  const content = (helpData as any)[topic];
  if (!content) return null;

  return (
    <div className="aseptic-tooltip">
      <strong>{content.title}</strong>
      <p>{content.content}</p>
    </div>
  );
};

const PropertyPanel: React.FC<PropertyPanelProps> = ({ 
  item, 
  isRoot, 
  onUpdate, 
  onClose,
  isModal,
  errors, 
  assetStates 
}) => {
  const [showImageModal, setShowImageModal] = React.useState(false);
  const [activeHelp, setActiveHelp] = React.useState<string | null>(null);
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({
    identity: true,
    contract: true,
    ui: true
  });

  if (!item) {
    return (
      <div className="empty-state-hint">
        Select an entity from the Outline to edit its properties.
      </div>
    );
  }

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getFieldError = (fieldName: string) => {
    return errors.find(err => err.path.includes(fieldName));
  };

  const panelContent = (
    <div className={`property-panel-evolution ${isModal ? 'as-modal' : ''}`}>
      {isModal && (
        <header className="modal-top-bar">
          <h3>
             {isRoot ? 'MODULE DNA & IDENTITY' : `PARAMETER: ${item.label}`}
          </h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </header>
      )}

      {/* SECCIÓN 1: IDENTITY & SEMANTICS */}
      <section className={`form-section ${openSections.identity ? 'open' : 'closed'}`}>
        <header className="section-divider collapsible" onClick={() => toggleSection('identity')}>
          <span className="divider-icon">🆔</span>
          <span className="divider-label">SEMANTICS & IDENTITY</span>
          <span className="section-arrow">{openSections.identity ? '▾' : '▸'}</span>
        </header>
        
        {openSections.identity && (
          <div className="section-content">
            {/* ILLUSTRATION VIEWPORT - Visible only for Root as per CAD requirement */}
            {isRoot && (
              <div className="identity-header-preview">
                <div 
                  className={`illustration-mini-viewport ${assetStates?.exists ? 'clickable' : ''}`}
                  onClick={() => assetStates?.exists && setShowImageModal(true)}
                >
                  {assetStates?.loading ? (
                    <div className="illustration-placeholder"><span>...</span></div>
                  ) : assetStates?.exists ? (
                    <img src={assetStates.fullPath} alt="Module Illustration" className="illustration-img" />
                  ) : (
                    <div className="illustration-placeholder"><span>NO SVG</span></div>
                  )}
                </div>
              </div>
            )}

            <div className="identity-title-group" style={{ marginTop: isRoot ? '15px' : '0' }}>
              <div className="label-with-badge">
                <label>🏷️ Display Label</label>
                {!isRoot && item.back && !item.front && (
                  <span className="aseptic-badge trimmer-badge">⚙️ TRIMMER</span>
                )}
                {!isRoot && item.front && item.back && (
                  <span className="aseptic-badge hybrid-badge">🔄 HYBRID</span>
                )}
              </div>
              <input 
                className={`aseptic-input ${getFieldError(isRoot ? 'name' : 'label') ? 'error-border' : ''}`} 
                value={isRoot ? (item as any).name : item.label} 
                onChange={(e) => onUpdate({ ...item, [isRoot ? 'name' : 'label']: e.target.value })}
                placeholder="Human readable name..."
              />
              {getFieldError(isRoot ? 'name' : 'label') ? (
                <span className="ace-lint-msg error">{getFieldError(isRoot ? 'name' : 'label').message}</span>
              ) : (
                <span className="field-hint">Used for UI rendering and documentation.</span>
              )}
            </div>

            <div className="control-group">
              <label>
                🔑 Technical ID
                <span 
                  className="help-trigger" 
                  onMouseEnter={() => setActiveHelp('technical_id')}
                  onMouseLeave={() => setActiveHelp(null)}
                >?</span>
                {activeHelp === 'technical_id' && <AsepticTooltip topic="technical_id" />}
              </label>
              <input 
                className={`aseptic-input id-field ${getFieldError('id') ? 'error-border' : ''}`} 
                style={{ 
                  color: (!item.front && item.back) ? 'var(--neon-amber)' : 'inherit',
                  borderColor: (!item.front && item.back) ? 'rgba(255, 170, 0, 0.3)' : ''
                }}
                value={isRoot ? (item as any).id || '' : item.id} 
                onChange={(e) => onUpdate({ ...item, id: e.target.value })}
                title="Module Canonical ID (snake_case)"
              />
              {getFieldError('id') ? (
                 <span className="ace-lint-msg error">{getFieldError('id').message}</span>
              ) : (
                <span className="field-hint">{isRoot ? "Canonical Module ID (Aseptic Authority)." : "Internal contract key. Follows snake_case."}</span>
              )}
            </div>

            {isRoot && (
               <>
                <div className="control-group">
                  <label>📝 Description</label>
                  <textarea 
                    className={`aseptic-input ${getFieldError('description') ? 'error-border' : ''}`}
                    value={(item as any).description || ''}
                    onChange={(e) => onUpdate({ ...item, description: e.target.value } as any)}
                    placeholder="Detailed purpose of the module..."
                    rows={3}
                  />
                  {getFieldError('description') ? (
                    <span className="ace-lint-msg warning">{getFieldError('description').message}</span>
                  ) : (
                    <span className="field-hint">Sound Design pedagogical context.</span>
                  )}
                </div>

                <div className="control-group">
                  <label>🏷️ Tags (Aseptic Search)</label>
                  <input 
                    className="aseptic-input" 
                    value={(item.tags || []).join(', ')} 
                    onChange={(e) => onUpdate({ ...item, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) })}
                    placeholder="e.g. LFO, Acid, FM..."
                  />
                  <span className="field-hint">Comma-separated classification tags.</span>
                </div>

                <div className="layout-horizontal-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="control-group">
                    <label>📐 HP Width</label>
                    <input 
                      type="number"
                      className="aseptic-input" 
                      value={item.layout?.hp || 0} 
                      onChange={(e) => onUpdate({ ...item, layout: { ...item.layout, hp: parseInt(e.target.value) || 0 }})}
                    />
                    <span className="field-hint">Horizontal Pitch.</span>
                  </div>
                  <div className="control-group">
                    <label>🏗️ Rack Zone</label>
                    <select 
                      className="aseptic-input"
                      value={item.layout?.rack || 'lower'}
                      onChange={(e) => onUpdate({ ...item, layout: { ...item.layout, rack: e.target.value as any }})}
                    >
                      <option value="upper">UPPER (Standard)</option>
                      <option value="lower">LOWER (Utility/IO)</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {!isRoot && (
              <div className="roles-visibility-group" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '20px', alignItems: 'end' }}>
                <div className="control-group">
                  <label>
                    🎭 Roles
                    <span 
                      className="help-trigger" 
                      onMouseEnter={() => setActiveHelp('roles')}
                      onMouseLeave={() => setActiveHelp(null)}
                    >?</span>
                    {activeHelp === 'roles' && <AsepticTooltip topic="roles" />}
                  </label>
                  <div className="roles-pill-container">
                    {['control', 'input', 'output', 'telemetry', 'stream'].map(role => (
                      <button 
                        key={role}
                        className={`role-pill ${item.roles?.includes(role) ? 'active' : ''}`}
                        onClick={() => {
                          const roles = item.roles || [];
                          const newRoles = roles.includes(role) 
                            ? roles.filter(r => r !== role)
                            : [...roles, role];
                          onUpdate({ ...item, roles: newRoles });
                        }}
                      >
                        {role.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="visibility-toggles" style={{ display: 'flex', gap: '10px', paddingBottom: '4px' }}>
                  <button 
                    className={`aseptic-toggle-btn ${item.front ? 'active' : ''}`}
                    onClick={() => onUpdate({ ...item, front: !item.front })}
                    title="Visible in Front Panel"
                  >
                    FRONT
                  </button>
                  <button 
                    className={`aseptic-toggle-btn ${item.back ? 'active' : ''}`}
                    onClick={() => onUpdate({ ...item, back: !item.back })}
                    title="Visible in Engineering View"
                  >
                    BACK
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* SECCIÓN NUEVA PARA ROOT: IDENTITY & DNA */}
      {isRoot && (
        <section className={`form-section ${openSections.contract ? 'open' : 'closed'}`}>
          <header className="section-divider collapsible" onClick={() => toggleSection('contract')}>
            <span className="divider-icon">🧬</span>
            <span className="divider-label">IDENTITY & DNA</span>
            <span className="section-arrow">{openSections.contract ? '▾' : '▸'}</span>
          </header>
          
          {openSections.contract && (
            <div className="section-content">
              <div className="grid-2-col">
                <div className="control-group">
                  <label>🆔 Model ID</label>
                  <input 
                    className="aseptic-input" 
                    value={(item as any).modelId || ''} 
                    onChange={(e) => onUpdate({ ...item, modelId: e.target.value } as any)} 
                  />
                  <span className="field-hint">Reference Hardware Code</span>
                </div>
                <div className="control-group">
                  <label>🔢 Impl ID</label>
                  <input 
                    type="number"
                    className="aseptic-input" 
                    value={(item as any).implementationId || 0} 
                    onChange={(e) => onUpdate({ ...item, implementationId: parseInt(e.target.value) } as any)} 
                  />
                  <span className="field-hint">Binding numeric ID</span>
                </div>
              </div>

              <div className="grid-2-col">
                <div className="control-group">
                  <label>📁 Family</label>
                  <select 
                    className="aseptic-input" 
                    value={(item as any).family} 
                    onChange={(e) => onUpdate({ ...item, family: e.target.value } as any)}
                  >
                    <option value="OSCILLATOR">〰️ OSCILLATOR</option>
                    <option value="FILTER">📐 FILTER</option>
                    <option value="ENVELOPE">📈 ENVELOPE</option>
                    <option value="IO">🔌 IO</option>
                    <option value="FX">✨ FX</option>
                    <option value="UTILITY">🛠️ UTILITY</option>
                  </select>
                </div>
                <div className="control-group">
                  <label>🧥 Visual Theme</label>
                  <select 
                    className="aseptic-input" 
                    value={(item as any).theme || 'aseptic'} 
                    onChange={(e) => onUpdate({ ...item, theme: e.target.value } as any)}
                  >
                    <option value="aseptic">🎨 ASEPTIC (Neon/Glass)</option>
                    <option value="industrial">🏗️ INDUSTRIAL (Solid/Dark)</option>
                    <option value="classic">🎹 CLASSIC (Vintage)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* SECCIÓN NUEVA PARA ROOT: TECHNICAL SPEC (Consolidated) */}
      {isRoot && (
        <section className="form-section">
          <header className="section-divider">
             <span className="divider-label">EXECUTION ENGINE</span>
          </header>
          <div className="grid-2-col">
            <div className="control-group">
              <label>Engine</label>
              <select 
                className="aseptic-input" 
                value={(item as any).engine} 
                onChange={(e) => onUpdate({ ...item, engine: e.target.value } as any)}
              >
                <option value="WASM">WASM (Ultra Performance)</option>
                <option value="Modular">Modular (Legacy/SubGraph)</option>
              </select>
            </div>
            <div className="control-group">
              <label>Version</label>
              <input 
                className="aseptic-input" 
                value={(item as any).version || '6.3'} 
                onChange={(e) => onUpdate({ ...item, version: e.target.value } as any)} 
              />
            </div>
          </div>
        </section>
      )}

      {/* SECCIÓN 2: CONTRACT DEFINITION (Range, Types) */}
      {!isRoot && (
        <section className={`form-section ${openSections.contract ? 'open' : 'closed'}`}>
          <header className="section-divider collapsible" onClick={() => toggleSection('contract')}>
            <span className="divider-icon">📜</span>
            <span className="divider-label">TECHNICAL CONTRACT</span>
            <span className="section-arrow">{openSections.contract ? '▾' : '▸'}</span>
          </header>
          
          {openSections.contract && (
            <div className="section-content">
              <div className="grid-2-col">
                <div className="control-group">
                  <label>
                    💾 Data Type
                    <span 
                      className="help-trigger" 
                      onMouseEnter={() => setActiveHelp('data_type')}
                      onMouseLeave={() => setActiveHelp(null)}
                    >?</span>
                    {activeHelp === 'data_type' && <AsepticTooltip topic="data_type" />}
                  </label>
                  <select className="aseptic-input" value={item.type} onChange={(e) => onUpdate({...item, type: e.target.value})}>
                    <option value="float">FLOAT (0..1)</option>
                    <option value="int">INT (Discrete)</option>
                    <option value="bool">BOOL</option>
                    <option value="list">LIST / LOOKUP</option>
                    <option value="text">TEXT / STRING</option>
                    <option value="audio">AUDIO STREAM</option>
                    <option value="cv">CV / VOLTAGE</option>
                    <option value="midi">MIDI BRIDGE</option>
                    <option value="gate">GATE / TRIGGER</option>
                  </select>
                </div>
                <div className="control-group">
                  <label>📏 Unit</label>
                  <input className="aseptic-input" value={item.unit ?? ''} onChange={(e) => onUpdate({...item, unit: e.target.value})} placeholder="Hz, dB..." />
                </div>
              </div>

              <div className="grid-2-col" style={{ marginTop: '10px' }}>
                <div className="control-group">
                  <label>🎯 DSP Precision</label>
                  <input 
                    type="number"
                    className="aseptic-input" 
                    value={item.precision ?? 0} 
                    onChange={(e) => onUpdate({...item, precision: parseFloat(e.target.value) || 0})} 
                  />
                  <span className="field-hint">Decimal places for processing.</span>
                </div>
                <div className="control-group">
                  <label>👁️ UI Precision</label>
                  <input 
                    type="number"
                    className="aseptic-input" 
                    value={item.ui_precision ?? 0} 
                    onChange={(e) => onUpdate({...item, ui_precision: parseFloat(e.target.value) || 0})} 
                  />
                  <span className="field-hint">Display formatting.</span>
                </div>
              </div>

              <div className="grid-2-col" style={{ marginTop: '15px' }}>
                <div className="control-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={item.front || false} 
                      onChange={(e) => onUpdate({...item, front: e.target.checked})} 
                    />
                    <span>FRONT PANEL (UI)</span>
                  </label>
                  <span className="field-hint">Visible as Knob/Fader in Rack.</span>
                </div>
                <div className="control-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={item.back || false} 
                      onChange={(e) => onUpdate({...item, back: e.target.checked})} 
                    />
                    <span>BACK PANEL (TRIMMER)</span>
                  </label>
                  <span className="field-hint">Fine adjustment (PCB/ROM level).</span>
                </div>
              </div>

              {(item.type === 'float' || item.type === 'int') && (
                <div className="grid-3-col" style={{ marginTop: '15px' }}>
                  <div className="control-group">
                    <label>📉 Min</label>
                    <input 
                      type="number" 
                      className="aseptic-input" 
                      value={item.range?.min ?? 0} 
                      onChange={(e) => {
                        const range = item.range || {};
                        onUpdate({ ...item, range: { ...range, min: parseFloat(e.target.value) } });
                      }} 
                    />
                  </div>
                  <div className="control-group">
                    <label>📈 Max</label>
                    <input 
                      type="number" 
                      className="aseptic-input" 
                      value={item.range?.max ?? 1} 
                      onChange={(e) => {
                        const range = item.range || {};
                        onUpdate({ ...item, range: { ...range, max: parseFloat(e.target.value) } });
                      }} 
                    />
                  </div>
                  <div className="control-group">
                    <label>🏠 Default</label>
                    <input 
                      type="number" 
                      className="aseptic-input" 
                      value={item.range?.default ?? 0} 
                      onChange={(e) => {
                        const range = item.range || {};
                        onUpdate({ ...item, range: { ...range, default: parseFloat(e.target.value) } });
                      }} 
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* SECCIÓN 3: PRESENTATION (UI component) */}
      {!isRoot && (
        <section className={`form-section ${openSections.ui ? 'open' : 'closed'}`}>
          <header className="section-divider collapsible" onClick={() => toggleSection('ui')}>
            <span className="divider-icon">🎨</span>
            <span className="divider-label">UI PRESENTATION</span>
            <span className="section-arrow">{openSections.ui ? '▾' : '▸'}</span>
          </header>

          {openSections.ui && (
            <div className="section-content">
              <div className="grid-2-col">
                <div className="control-group">
                  <label>
                    🧩 UI Component
                    <span 
                      className="help-trigger" 
                      onMouseEnter={() => setActiveHelp('ui_component')}
                      onMouseLeave={() => setActiveHelp(null)}
                    >?</span>
                    {activeHelp === 'ui_component' && <AsepticTooltip topic="ui_component" />}
                  </label>
                  <select 
                    className="aseptic-input" 
                    value={item.presentation?.ui?.component ?? 'knob'} 
                    onChange={(e) => {
                      const presentation = item.presentation || {};
                      const ui = presentation.ui || {};
                      onUpdate({ ...item, presentation: { ...presentation, ui: { ...ui, component: e.target.value } } });
                    }}
                  >
                    <option value="knob">🔘 KNOB (Rotating)</option>
                    <option value="slider_v">🎚️ FADER (Vertical)</option>
                    <option value="slider_h">↔️ FADER (Horizontal)</option>
                    <option value="switch">⏻ SWITCH (Toggle)</option>
                    <option value="port">🔌 PORT (Jack)</option>
                    <option value="button">🔘 BUTTON (Trigger)</option>
                    <option value="led">🚨 LED (Status)</option>
                    <option value="display">📊 DISPLAY (Value)</option>
                  </select>
                </div>
                <div className="control-group">
                  <label>📑 Visibility Tab</label>
                  <select 
                    className="aseptic-input" 
                    value={item.presentation?.tab ?? 'MAIN'} 
                    onChange={(e) => {
                      const presentation = item.presentation || {};
                      onUpdate({ ...item, presentation: { ...presentation, tab: e.target.value } });
                    }}
                  >
                    <option value="MAIN">MAIN PANEL</option>
                    <option value="PATCHING">PATCHING MATRIX</option>
                    <option value="SETUP">SETUP / REAR</option>
                    <option value="MIDI">MIDI / EXTERNAL</option>
                  </select>
                </div>
              </div>

              <div className="grid-3-col" style={{ marginTop: '15px' }}>
                <div className="control-group">
                  <label>📦 Group</label>
                  <input 
                    className="aseptic-input" 
                    value={item.presentation?.group || ''} 
                    onChange={(e) => {
                      const presentation = item.presentation || {};
                      onUpdate({ ...item, presentation: { ...presentation, group: e.target.value } });
                    }}
                    placeholder="e.g. FILTER"
                  />
                  <span className="field-hint">Semantic Cluster.</span>
                </div>
                <div className="control-group">
                  <label>🔢 Order</label>
                  <input 
                    type="number"
                    className="aseptic-input" 
                    value={item.presentation?.order || 0} 
                    onChange={(e) => {
                      const presentation = item.presentation || {};
                      onUpdate({ ...item, presentation: { ...presentation, order: parseInt(e.target.value) || 0 } });
                    }}
                  />
                  <span className="field-hint">Placement weight.</span>
                </div>
                <div className="control-group">
                  <label>🔲 Cell Jack</label>
                  <input 
                    className="aseptic-input" 
                    value={item.presentation?.cell || ''} 
                    onChange={(e) => {
                      const presentation = item.presentation || {};
                      onUpdate({ ...item, presentation: { ...presentation, cell: e.target.value } });
                    }}
                    placeholder="e.g. J1, J2"
                  />
                  <span className="field-hint">Physical binding.</span>
                </div>
              </div>

              <div className="grid-2-col" style={{ marginTop: '15px' }}>
                <div className="control-group">
                  <label>
                    🎭 Semantic Variant
                    <span 
                      className="help-trigger" 
                      onMouseEnter={() => setActiveHelp('semantic_variant')}
                      onMouseLeave={() => setActiveHelp(null)}
                    >?</span>
                    {activeHelp === 'semantic_variant' && <AsepticTooltip topic="semantic_variant" />}
                  </label>
                  <input 
                    className="aseptic-input" 
                    value={item.presentation?.ui?.variant ?? 'B'} 
                    onChange={(e) => {
                       const presentation = item.presentation || {};
                       const ui = presentation.ui || {};
                       onUpdate({ ...item, presentation: { ...presentation, ui: { ...ui, variant: e.target.value.toUpperCase() } } });
                    }}
                    placeholder="A, B, C, X..."
                  />
                  <span className="field-hint">Theme-specific style key.</span>
                </div>
                <div className="control-group">
                  <label>📏 Layout Size</label>
                  <select 
                    className="aseptic-input" 
                    value={item.presentation?.ui?.size ?? 'medium'} 
                    onChange={(e) => {
                      const presentation = item.presentation || {};
                      const ui = presentation.ui || {};
                      onUpdate({ ...item, presentation: { ...presentation, ui: { ...ui, size: e.target.value } } });
                    }}
                  >
                    <option value="mini">MINI (Compact)</option>
                    <option value="small">SMALL</option>
                    <option value="medium">MEDIUM (Standard)</option>
                    <option value="large">LARGE</option>
                    <option value="xl">XL (Master/Main)</option>
                  </select>
                </div>
              </div>

              {/* ATTACHMENTS EDITOR (VEM-493) */}
              <div className="attachments-editor-section" style={{ marginTop: '20px', borderTop: '1px border rgba(255,255,255,0.05)', paddingTop: '15px' }}>
                <div className="label-with-badge">
                  <label>📎 Attachments (Cell Accessories)</label>
                  <button 
                    className="aseptic-button mini" 
                    onClick={() => {
                       const presentation = item.presentation || {};
                       const attachments = presentation.attachments || [];
                       onUpdate({ 
                         ...item, 
                         presentation: { 
                           ...presentation, 
                           attachments: [...attachments, { type: 'label', position: 'bottom', role: 'description' }] 
                         } 
                       });
                    }}
                  >+ ADD</button>
                </div>
                <div className="attachments-list">
                  {(item.presentation?.attachments || []).map((att, idx) => (
                    <div key={idx} className="attachment-row">
                      <select 
                        value={att.type} 
                        onChange={(e) => {
                          const atts = [...(item.presentation!.attachments!)];
                          atts[idx] = { ...atts[idx], type: e.target.value as any };
                          onUpdate({ ...item, presentation: { ...item.presentation!, attachments: atts } });
                        }}
                      >
                        <option value="label">LABEL</option>
                        <option value="led">LED</option>
                        <option value="display">DISP</option>
                      </select>
                      <select 
                        value={att.position} 
                        onChange={(e) => {
                          const atts = [...(item.presentation!.attachments!)];
                          atts[idx] = { ...atts[idx], position: e.target.value as any };
                          onUpdate({ ...item, presentation: { ...item.presentation!, attachments: atts } });
                        }}
                      >
                        <option value="top">TOP</option>
                        <option value="bottom">BTM</option>
                        <option value="left">LFT</option>
                        <option value="right">RGT</option>
                      </select>
                      <input 
                        placeholder="Role/Unit"
                        style={{ width: '80px' }}
                        value={att.role || att.unit || ''} 
                        onChange={(e) => {
                          const atts = [...(item.presentation!.attachments!)];
                          atts[idx] = { ...atts[idx], role: e.target.value };
                          onUpdate({ ...item, presentation: { ...item.presentation!, attachments: atts } });
                        }}
                      />
                      <input 
                        placeholder="Color"
                        style={{ width: '60px' }}
                        value={att.color || ''} 
                        onChange={(e) => {
                          const atts = [...(item.presentation!.attachments!)];
                          atts[idx] = { ...atts[idx], color: e.target.value };
                          onUpdate({ ...item, presentation: { ...item.presentation!, attachments: atts } });
                        }}
                      />
                      <input 
                        placeholder="Bind"
                        style={{ width: '60px' }}
                        value={att.bind || ''} 
                        onChange={(e) => {
                          const atts = [...(item.presentation!.attachments!)];
                          atts[idx] = { ...atts[idx], bind: e.target.value };
                          onUpdate({ ...item, presentation: { ...item.presentation!, attachments: atts } });
                        }}
                      />
                      <button className="del-btn" onClick={() => {
                         const atts = item.presentation!.attachments!.filter((_, i) => i !== idx);
                         onUpdate({ ...item, presentation: { ...item.presentation!, attachments: atts } });
                      }}>×</button>
                    </div>
                  ))}
                  {(!item.presentation?.attachments || item.presentation.attachments.length === 0) && (
                    <div className="attachment-empty-hint">No attachments in this cell.</div>
                  )}
                </div>
              </div>

              {/* CELL PROTOTYPE VIEW (VEM-368) */}
              <div className="cell-prototype-container" style={{ marginTop: '25px' }}>
                <label className="prototype-label">👁️ CELL PROTOTYPE (ASEPTIC VIEW)</label>
                <div className={`cell-visualizer size-${item.presentation?.ui?.size || 'medium'}`}>
                  {/* ZONE TOP */}
                  <div className="cell-zone zone-top">
                    {item.presentation?.attachments?.filter(a => a.position === 'top').map((a, i) => (
                      <div key={i} className={`mini-att att-${a.type}`}>{a.type === 'label' ? (a.role || 'LABEL') : a.type.toUpperCase()}</div>
                    ))}
                  </div>
                  
                  <div className="cell-middle-row">
                    {/* ZONE LEFT */}
                    <div className="cell-zone zone-left">
                       {item.presentation?.attachments?.filter(a => a.position === 'left').map((a, i) => (
                         <div key={i} className={`mini-att att-${a.type}`}>{a.type[0].toUpperCase()}</div>
                       ))}
                    </div>

                    {/* CORE COMPONENT */}
                    <div className={`cell-core component-${item.presentation?.ui?.component || 'knob'}`}>
                      <div className="core-symbol"></div>
                    </div>

                    {/* ZONE RIGHT */}
                    <div className="cell-zone zone-right">
                       {item.presentation?.attachments?.filter(a => a.position === 'right').map((a, i) => (
                         <div key={i} className={`mini-att att-${a.type}`}>{a.type[0].toUpperCase()}</div>
                       ))}
                    </div>
                  </div>

                  {/* ZONE BOTTOM */}
                  <div className="cell-zone zone-bottom">
                    {item.presentation?.attachments?.filter(a => a.position === 'bottom').map((a, i) => (
                      <div key={i} className={`mini-att att-${a.type}`}>{a.type === 'label' ? (a.role || 'LABEL') : a.type.toUpperCase()}</div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}
        </section>
      )}

      {/* IMAGE MODAL POPUP */}
      {showImageModal && assetStates?.fullPath && (
        <div className="aseptic-modal-overlay" onClick={() => setShowImageModal(false)}>
          <div className="aseptic-modal-content image-preview-modal" onClick={e => e.stopPropagation()}>
            <header className="modal-header">
              <h3>ILLUSTRATION PREVIEW</h3>
              <button className="close-btn" onClick={() => setShowImageModal(false)}>×</button>
            </header>
            <div className="modal-body illustration-full-view">
              <img src={assetStates.fullPath} alt="Module Illustration Full" />
            </div>
            <footer className="modal-footer">
              <span className="asset-path-label">{assetStates.fullPath}</span>
            </footer>
          </div>
        </div>
      )}

    </div>
  );

  return isModal ? (
    <div className="aseptic-modal-overlay property-modal-shell" onClick={onClose}>
      <div className="aseptic-modal-content property-editor-modal" onClick={e => e.stopPropagation()}>
        {panelContent}
      </div>
    </div>
  ) : panelContent;
};

export default PropertyPanel;
