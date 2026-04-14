import React from 'react';

interface RegistryItem {
  id: string;
  label: string;
  type: string;
  roles: string[];
  front: boolean;
  back: boolean;
  presentation?: {
    tab?: string;
    group?: string;
    cell?: string;
    ui?: {
      component?: string;
    };
  };
}

interface AsepticOutlineProps {
  moduleData: any;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  activeView: 'editor' | 'preview' | 'source' | 'patching_hub';
  onViewChange: (view: 'editor' | 'preview' | 'source' | 'patching_hub') => void;
  assetStatus: 'loading' | 'missing' | 'exists';
  collapsed?: boolean;
  onExpand?: () => void;
}

const AsepticOutline: React.FC<AsepticOutlineProps> = ({ 
  moduleData,
  activeView, 
  onViewChange, 
  assetStatus,
  collapsed,
  onSelect,
  selectedId
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const registry = moduleData?.registry || [];
  
  // 1. Check if DNA root matches (Semantic Discovery)
  const dnaMatches = React.useMemo(() => {
    if (!searchTerm || !moduleData) return false;
    const term = searchTerm.toLowerCase();
    return (
      moduleData.id?.toLowerCase().includes(term) ||
      moduleData.name?.toLowerCase().includes(term) ||
      moduleData.tags?.some((t: string) => t.toLowerCase().includes(term))
    );
  }, [searchTerm, moduleData]);

  // 2. Filter Registry (Only if searchTerm exists)
  const filteredRegistry = React.useMemo(() => {
    if (!searchTerm) return []; // EMPTY BY DEFAULT as per USER VISION
    const term = searchTerm.toLowerCase();
    return registry.filter((item: RegistryItem) => {
      return (
        item.id.toLowerCase().includes(term) || 
        item.label.toLowerCase().includes(term) ||
        item.type.toLowerCase().includes(term) ||
        (item as any).description?.toLowerCase().includes(term) ||
        (item as any).modelId?.toLowerCase().includes(term) ||
        item.roles.some(r => r.toLowerCase().includes(term)) ||
        item.presentation?.group?.toLowerCase().includes(term) ||
        (item as any).tags?.some((t: string) => t.toLowerCase().includes(term))
      );
    });
  }, [searchTerm, registry]);

  const getComponentIcon = (comp?: string) => {
    switch(comp) {
      case 'knob': return '🔘';
      case 'slider_v':
      case 'slider_h': return '🎚️';
      case 'switch':
      case 'button': return '⏻';
      case 'port': return '🔌';
      case 'led': return '🚨';
      case 'display': return '📊';
      default: return '📦';
    }
  };

  return (
    <div className={`aseptic-outline ${collapsed ? 'mini-mode' : ''}`}>
      {/* 1. VIEW NAVIGATION */}
      <div className="outline-section">
        {!collapsed && (
          <header className="section-header">
            <span className="section-icon">🔭</span>
            <span className="section-title">VIEWS</span>
          </header>
        )}
        
        <div 
          className={`outline-item ${activeView === 'patching_hub' ? 'active' : ''}`}
          onClick={() => onViewChange('patching_hub')}
          title={collapsed ? "I/O Hub (Sanctuary)" : ""}
        >
          <span className="item-icon">🔌</span>
          {!collapsed && <span className="item-label">I/O Hub (Sanctuary)</span>}
          {activeView === 'patching_hub' && <span className="active-dot" />}
        </div>

        <div 
          className={`outline-item ${activeView === 'preview' ? 'active' : ''}`}
          onClick={() => onViewChange('preview')}
          title={collapsed ? "Live Viewport" : ""}
        >
          <span className="item-icon">👁️</span>
          {!collapsed && <span className="item-label">Live Viewport</span>}
          {!collapsed && <span className={`status-dot ${assetStatus}`}></span>}
          {activeView === 'preview' && <span className="active-dot" />}
        </div>

        <div 
          className={`outline-item ${activeView === 'source' ? 'active' : ''}`}
          onClick={() => onViewChange('source')}
          title={collapsed ? "Raw YAML Source" : ""}
        >
          <span className="item-icon">{'< >'}</span>
          {!collapsed && <span className="item-label">Raw YAML Source</span>}
          {activeView === 'source' && <span className="active-dot" />}
        </div>
      </div>

      {/* 2. ASEPTIC SEARCH & STRUCTURE */}
      {!collapsed && (
        <div className="outline-section structure-section">
          <header className="section-header" style={{ marginBottom: '5px' }}>
            <span className="section-icon">🔍</span>
            <span className="section-title">ASEPTIC SEARCH</span>
          </header>
          
          <div className="search-box-container">
            <div className="aseptic-search-wrapper">
              <input 
                type="text" 
                className="aseptic-search-input"
                placeholder="Search Registry..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  className="clear-search-btn"
                  onClick={() => setSearchTerm('')}
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <header className="section-header" style={{ marginTop: '15px' }}>
            <span className="section-icon">🧬</span>
            <span className="section-title">DISCOVERY RESULTS</span>
          </header>

          <div className="structure-list">
            {dnaMatches && (
              <div 
                className={`outline-item structure-item dna-match ${selectedId === '_module_root' ? 'active' : ''}`}
                onClick={() => {
                  if (typeof (onSelect as any) === 'function') {
                    (onSelect as any)('_module_root');
                  }
                }}
              >
                <span className="item-icon">🏠</span>
                <span className="item-label" style={{ color: 'var(--neon-cyan)', fontWeight: 800 }}>MODULE DNA</span>
                <span className="item-id-hint">Identity</span>
              </div>
            )}

            {filteredRegistry.map((item: RegistryItem) => (
              <div 
                key={item.id}
                className={`outline-item structure-item ${selectedId === item.id ? 'active' : ''}`}
                onClick={() => {
                  if (typeof onSelect === 'function') {
                    onSelect(item.id);
                  }
                }}
              >
                <span className="item-icon">{getComponentIcon(item.presentation?.ui?.component)}</span>
                <span className="item-label">{item.label}</span>
                <span className="item-id-hint">{item.id}</span>
                {selectedId === item.id && <span className="active-dot" />}
              </div>
            ))}
            
            {filteredRegistry.length === 0 && searchTerm && (
              <div className="empty-search-hint">No matches for "{searchTerm}"</div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .aseptic-outline {
          padding: 15px 0;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .outline-section {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .section-header {
          padding: 0 15px 10px 15px;
          display: flex;
          align-items: center;
          gap: 8px;
          opacity: 0.4;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.5px;
          color: #fff;
        }
        .outline-item {
          margin: 0 8px;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-radius: 6px;
          cursor: pointer;
          color: #888;
          font-size: 11px;
          font-weight: 600;
          transition: all 0.2s;
          position: relative;
        }
        .outline-item:hover {
          background: rgba(255, 255, 255, 0.03);
          color: #ccc;
        }
        .outline-item.active {
          background: rgba(0, 242, 255, 0.08);
          color: var(--neon-cyan);
          box-shadow: inset 0 0 15px rgba(0, 242, 255, 0.05);
        }
        .active-dot {
          width: 4px;
          height: 4px;
          background: var(--neon-cyan);
          border-radius: 50%;
          box-shadow: 0 0 8px var(--neon-cyan);
          position: absolute;
          right: 12px;
        }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #333;
        }
        .status-dot.exists { background: var(--neon-cyan); box-shadow: 0 0 5px var(--neon-cyan); }
        .status-dot.loading { background: var(--neon-amber); animation: pulse 1s infinite; }

        .search-box-container {
          padding: 0 15px;
          margin-bottom: 15px;
        }
        .aseptic-search-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .aseptic-search-input {
          width: 100%;
          background: rgba(255,255,255,0.03);
          border: none;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding: 8px 30px 8px 10px;
          color: #fff;
          font-size: 11px;
          outline: none;
          transition: border-color 0.3s;
        }
        .aseptic-search-input:focus {
          border-color: var(--neon-cyan);
          background: rgba(0, 242, 255, 0.03);
        }
        .clear-search-btn {
          position: absolute;
          right: 5px;
          background: none;
          border: none;
          color: #555;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          transition: color 0.2s;
        }
        .clear-search-btn:hover {
          color: var(--neon-cyan);
        }
        .structure-list {
          overflow-y: auto;
          max-height: calc(100vh - 400px);
          margin-top: 10px;
          padding-bottom: 20px;
        }
        .structure-item {
          padding: 6px 15px;
          gap: 10px;
          margin: 1px 8px;
        }
        .dna-match {
          border-left: 2px solid var(--neon-cyan);
          background: rgba(0, 242, 255, 0.03);
          margin-bottom: 10px;
        }
        .item-id-hint {
          font-size: 9px;
          opacity: 0.3;
          margin-left: auto;
          font-family: monospace;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 60px;
        }
        .empty-search-hint {
          padding: 15px;
          font-size: 10px;
          color: var(--neon-amber);
          opacity: 0.6;
          text-align: center;
        }

        .mini-mode .item-label, 
        .mini-mode .section-title,
        .mini-mode .active-dot,
        .mini-mode .status-dot {
          display: none;
        }
        .mini-mode .outline-item {
          justify-content: center;
          padding: 12px 0;
        }
        .mini-mode .item-icon {
          font-size: 16px;
          margin: 0;
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.3; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default AsepticOutline;
