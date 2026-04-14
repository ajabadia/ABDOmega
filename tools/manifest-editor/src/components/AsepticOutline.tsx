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
  activeView, 
  onViewChange, 
  assetStatus,
  collapsed,
  onExpand
}) => {
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
