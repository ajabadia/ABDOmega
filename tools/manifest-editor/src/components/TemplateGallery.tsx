import React, { useState, useEffect } from 'react';
import templatesData from '../data/cell_templates.json';

interface TemplateItem {
  id?: string;
  id_suffix?: string;
  label: string;
  type: string;
  front?: boolean;
  back?: boolean;
  roles: string[];
  range?: { min: number; max: number; default: number };
  presentation: {
    tab?: string;
    group?: string;
    order?: number;
    ui: { component: string; variant?: string; size?: string };
    attachments?: any[];
  };
}

interface Template {
  id: string;
  name: string;
  description: string;
  autoGroup?: string;
  items: TemplateItem[];
}

interface TemplateGalleryProps {
  onAddItems: (items: any[], groupName?: string) => void;
  onClose?: () => void;
  isFloating?: boolean;
}

const TemplateGallery: React.FC<TemplateGalleryProps> = ({ onAddItems, onClose, isFloating }) => {
  const [selectedCategory, setSelectedCategory] = useState(templatesData.categories[0].id);
  const [userCells, setUserCells] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedCategory === 'user_library') {
      loadUserCells();
    }
  }, [selectedCategory]);

  const loadUserCells = async () => {
    // @ts-ignore
    if (!window.electronAPI) return;
    setLoading(true);
    // @ts-ignore
    const cells = await window.electronAPI.readCells();
    setUserCells(cells.map((c: any) => ({
      id: c.id,
      name: c.name || c.id,
      description: c.category || 'User Component',
      items: c.items,
      autoGroup: c.autoGroup
    })));
    setLoading(false);
  };

  const categories = [
    ...templatesData.categories,
    { id: 'user_library', name: 'User Library', icon: '👤' }
  ];

  const activeCategory = categories.find(c => c.id === selectedCategory);
  
  // Decide which templates to show
  const displayTemplates = selectedCategory === 'user_library' 
    ? userCells 
    : (templatesData.categories.find(c => c.id === selectedCategory)?.templates || []);

  const galleryContent = (
    <div className={`template-gallery-evolution ${isFloating ? 'floating-modal' : ''}`}>
      <header className="gallery-header">
        <span className="header-icon">📦</span>
        <h3>VIRTUAL CELL LIBRARY</h3>
        <div className="header-actions">
          {selectedCategory === 'user_library' && (
             <button className="icon-btn refresh-btn" onClick={loadUserCells} title="Refresh Library">🔄</button>
          )}
          {isFloating && (
            <button className="icon-btn close-btn" onClick={onClose} title="Close Library">×</button>
          )}
        </div>
      </header>
      
      <nav className="category-nav">
        {categories.map(cat => (
          <button 
            key={cat.id} 
            className={`cat-btn ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
            title={cat.name}
          >
            {cat.icon}
          </button>
        ))}
      </nav>

      <div className="templates-list">
        {loading && <div className="gallery-status">Scanning Resources/Cells...</div>}
        {!loading && displayTemplates.length === 0 && (
           <div className="gallery-status empty">No cells found in this category.</div>
        )}
        {displayTemplates.map(tpl => (
          <div key={tpl.id} className="template-card">
            <div className="template-info">
              <strong>{tpl.name}</strong>
              <p>{tpl.description}</p>
            </div>
            <button 
              className="add-tpl-btn"
              onClick={() => onAddItems(tpl.items, tpl.autoGroup)}
            >
              ADD
            </button>
          </div>
        ))}
      </div>

      <style>{`
        .template-gallery-evolution {
          display: flex;
          flex-direction: column;
          height: 100%;
          border-left: 1px solid var(--border-dim);
          background: #050505;
        }

        .template-gallery-evolution.floating-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 400px;
          height: 600px;
          z-index: 1000;
          border: 1px solid rgba(0, 242, 255, 0.3);
          box-shadow: 0 0 50px rgba(0,0,0,0.8), 0 0 20px rgba(0, 242, 255, 0.1);
          border-radius: 12px;
          background: rgba(10, 10, 12, 0.85);
          backdrop-filter: blur(20px);
        }

        .gallery-header {
          padding: 15px;
          display: flex;
          align-items: center;
          gap: 10px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .gallery-header h3 {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 2px;
          color: #888;
          margin: 0;
          flex: 1;
        }
        .header-actions { display: flex; gap: 10px; }
        .close-btn { font-size: 20px; color: #555; }
        .close-btn:hover { color: var(--neon-red); }

        .refresh-btn { font-size: 10px; opacity: 0.5; }
        .refresh-btn:hover { opacity: 1; color: var(--neon-cyan); }

        .category-nav {
          display: flex;
          padding: 10px;
          gap: 5px;
          background: rgba(0,0,0,0.2);
        }
        .cat-btn {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          padding: 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          flex: 1;
          transition: all 0.2s;
        }
        .cat-btn.active {
          border-color: var(--neon-cyan);
          background: rgba(0, 242, 255, 0.1);
          box-shadow: 0 0 15px rgba(0, 242, 255, 0.1);
        }
        .templates-list {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
        }
        .gallery-status {
          padding: 40px;
          text-align: center;
          font-size: 10px;
          color: #444;
          font-family: 'JetBrains Mono', monospace;
        }
        .template-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          backdrop-filter: blur(5px);
        }
        .template-info strong {
          display: block;
          font-size: 13px;
          color: #eee;
          margin-bottom: 4px;
          font-weight: 800;
        }
        .template-info p {
          font-size: 10px;
          color: #666;
          margin: 0;
        }
        .add-tpl-btn {
          background: var(--neon-cyan);
          color: #000;
          border: none;
          padding: 8px 15px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(0, 242, 255, 0.2);
        }
        .add-tpl-btn:hover {
          background: #fff;
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.4);
        }
      `}</style>
    </div>
  );

  return isFloating ? (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.4)', zIndex: 999
    }}>
      <div onClick={e => e.stopPropagation()}>{galleryContent}</div>
    </div>
  ) : galleryContent;
};

export default TemplateGallery;
