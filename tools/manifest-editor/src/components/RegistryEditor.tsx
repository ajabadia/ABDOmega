import React from 'react';

interface RegistryItem {
  id: string;
  label: string;
  type: 'float' | 'int' | 'bool' | 'audio' | 'midi' | 'voltage';
  roles: string[];
  default?: number;
}

interface RegistryEditorProps {
  items: RegistryItem[];
  onUpdate: (items: RegistryItem[]) => void;
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
}

const RegistryEditor: React.FC<RegistryEditorProps> = ({ items, onUpdate, selectedIndex, onSelect }) => {
  const updateItem = (index: number, field: keyof RegistryItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onUpdate(newItems);
  };

  return (
    <div style={{ padding: '0 20px 20px', overflowY: 'auto', flex: 1, position: 'relative' }}>
      <div 
        onClick={() => onSelect(null)}
        style={{ 
          margin: '20px 0 10px',
          padding: '12px 20px',
          background: selectedIndex === null ? 'rgba(0, 242, 255, 0.1)' : '#111',
          border: `1px solid ${selectedIndex === null ? 'var(--neon-cyan)' : '#333'}`,
          borderRadius: '4px',
          color: selectedIndex === null ? 'var(--neon-cyan)' : '#888',
          fontSize: '11px',
          fontWeight: 900,
          cursor: 'pointer',
          textAlign: 'center',
          letterSpacing: '1px'
        }}
      >
        {selectedIndex === null ? '▶ ' : ''}📁 CONFIGURE MODULE IDENTITY & ASSETS
      </div>
      <table className="registry-table">
        <thead>
          <tr>
            <th>ID / Binding</th>
            <th>Label (UI)</th>
            <th>Data Type</th>
            <th>Roles (Contract)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr 
              key={index} 
              onClick={() => onSelect(index)}
              style={{ 
                background: selectedIndex === index ? 'rgba(0, 242, 255, 0.05)' : 'transparent',
                borderLeft: selectedIndex === index ? '2px solid var(--neon-cyan)' : 'none',
                cursor: 'pointer'
              }}
            >
              <td>
                <input 
                  className="aseptic-input" 
                  value={item.id} 
                  onChange={(e) => updateItem(index, 'id', e.target.value)}
                  style={{ width: '120px' }}
                />
              </td>
              <td>
                <input 
                  className="aseptic-input" 
                  value={item.label} 
                  onChange={(e) => updateItem(index, 'label', e.target.value)}
                  style={{ width: '150px' }}
                />
              </td>
              <td>
                <select 
                  className="aseptic-input"
                  value={item.type}
                  onChange={(e) => updateItem(index, 'type', e.target.value)}
                >
                  <option value="float">FLOAT (0.0 - 1.0)</option>
                  <option value="int">INT (Discrete)</option>
                  <option value="audio">AUDIO (Stream)</option>
                  <option value="midi">MIDI (Events)</option>
                  <option value="voltage">V_CONTROL (CV)</option>
                </select>
              </td>
              <td>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {item.roles.map((role, ri) => (
                    <span key={ri} className="id-badge" style={{ color: 'var(--neon-amber)' }}>{role}</span>
                  ))}
                </div>
              </td>
              <td>
                <button 
                  className="aseptic-btn" 
                  style={{ color: '#ff5555' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate(items.filter((_, i) => i !== index));
                  }}
                >DEL</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RegistryEditor;
