import React from 'react';

interface RegistryItem {
  id: string;
  label: string;
  type: string;
  roles: string[];
  front: boolean;
  back: boolean;
  unit?: string;
}

interface PatchingSanctuaryProps {
  moduleData: {
    registry: RegistryItem[];
  };
  onUpdateItem: (id: string, updates: Partial<RegistryItem>) => void;
  onAddSignal: () => void;
  onOpenGallery: () => void;
  onEditItem: (id: string) => void;
  onOpenModuleInfo: () => void;
}

const PatchingSanctuary: React.FC<PatchingSanctuaryProps> = ({ 
  moduleData, 
  onUpdateItem,
  onAddSignal,
  onOpenGallery,
  onEditItem,
  onOpenModuleInfo
}) => {
  const items = moduleData.registry;

  const isPort = (item: RegistryItem) => {
    return item.roles.includes('input') || item.roles.includes('output');
  };

  return (
    <div className="patching-sanctuary">
      <header className="sanctuary-header">
        <div className="header-info">
          <h2>I/O HUB: PATCHING SANCTUARY</h2>
          <p>Technical Audit of Signals, Ports and Trimmers.</p>
        </div>
        <div className="header-actions-hub">
           <button className="aseptic-btn-hub" onClick={onAddSignal}>➕ ADD SIGNAL</button>
           <button className="aseptic-btn-hub" onClick={onOpenGallery}>📦 INJECT CELL</button>
           <button className="aseptic-btn-hub primary" onClick={onOpenModuleInfo}>ℹ️ MODULE INFO</button>
        </div>
        <div className="stats-group">
          <div className="stat">
            <span className="stat-value">{items.filter(isPort).length}</span>
            <span className="stat-label">PORTS</span>
          </div>
          <div className="stat">
            <span className="stat-value">{items.filter(i => i.back && !isPort(i)).length}</span>
            <span className="stat-label">TRIMMERS</span>
          </div>
        </div>
      </header>

      <div className="sanctuary-table-container">
        <table className="sanctuary-table">
          <thead>
            <tr>
              <th>IDENTITY</th>
              <th>TYPE</th>
              <th>ROLES</th>
              <th className="center">FRONT</th>
              <th className="center">BACK</th>
              <th className="center">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const itemIsPort = isPort(item);

              return (
                <tr key={item.id} className={itemIsPort ? 'row-port' : 'row-param'}>
                  <td className="item-identity-cell" onClick={() => onEditItem(item.id)} style={{ cursor: 'pointer' }}>
                    <div className="item-id-group">
                      <span className="item-label" style={{ fontWeight: 800, color: 'var(--neon-cyan)' }}>{item.label}</span>
                      <span className="item-id">{item.id}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`type-badge ${item.type}`}>
                      {item.type.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div className="roles-list">
                      {item.roles.map(role => (
                        <span key={role} className={`role-tag ${role}`}>
                          {role === 'input' ? '🔌 IN' : role === 'output' ? '🔌 OUT' : role.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="center">
                    <input 
                      type="checkbox" 
                      checked={item.front || false} 
                      onChange={(e) => onUpdateItem(item.id, { front: e.target.checked })}
                    />
                  </td>
                  <td className="center">
                    <input 
                      type="checkbox" 
                      checked={item.back || false} 
                      onChange={(e) => onUpdateItem(item.id, { back: e.target.checked })}
                    />
                  </td>
                  <td className="center">
                    {itemIsPort ? (
                      <span className="status-indicator port-active" title="Recognized by OMEGA Patchbay">
                        {item.roles.includes('input') ? '📥' : '📤'}
                      </span>
                    ) : item.back ? (
                      <span className="status-indicator trimmer" title="Internal Trimmer (ROM/PCB)">
                        ⚙️
                      </span>
                    ) : (
                      <span className="status-indicator front-only" title="Front Panel Control">
                        🔘
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PatchingSanctuary;
