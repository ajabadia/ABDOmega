import React, { useState, useEffect } from 'react';
import yaml from 'js-yaml';
import AJV from 'ajv';
import addFormats from 'ajv-formats';
import era6Schema from '../schema.json';

const ajv = new AJV({ allErrors: true, useDefaults: true, strict: false });
addFormats(ajv);
const validator = ajv.compile(era6Schema);

interface RepoItem {
  name: string;
  path: string;
  fullPath: string;
  mtime: string;
  status: 'pending' | 'valid' | 'invalid' | 'error' | 'legacy';
  errors?: any[];
  moduleName?: string;
  version?: string;
}

const RepoDashboard: React.FC<{ addLog: (msg: string) => void }> = ({ addLog }) => {
  const [items, setItems] = useState<RepoItem[]>([]);
  const [scanning, setScanning] = useState(false);
  const [validating, setValidating] = useState(false);

  const scanRepo = async () => {
    // @ts-ignore
    if (!window.electronAPI) return;
    
    setScanning(true);
    addLog("Scanning repository for manifests...");
    // @ts-ignore
    const results = await window.electronAPI.scanRepo();
    setItems(results.map((r: any) => ({ ...r, status: 'pending' })));
    setScanning(false);
    addLog(`Found ${results.length} manifests in Resources/modules.`);
  };

  const validateAll = async () => {
    setValidating(true);
    addLog("Starting Bulk Validation...");
    
    const newItems = [...items];
    for (let i = 0; i < newItems.length; i++) {
      const item = newItems[i];
      try {
        // @ts-ignore
        const content = await window.electronAPI.readFile(item.path);
        const data = yaml.load(content) as any;
        
        item.moduleName = data?.name || 'Unknown';
        item.version = data?.version || 'Legacy';

        const valid = validator(data);
        if (valid) {
          item.status = data.version?.startsWith('6') ? 'valid' : 'legacy';
        } else {
          item.status = 'invalid';
          item.errors = validator.errors || [];
        }
      } catch (e: any) {
        item.status = 'error';
        item.errors = [{ message: e.message }];
      }
      setItems([...newItems]); // Update UI progressively
    }
    
    setValidating(false);
    addLog("Bulk Validation complete.");
  };

  const handleAutoHeal = async (item: RepoItem) => {
    try {
      // @ts-ignore
      const content = await window.electronAPI.readFile(item.path);
      const data = yaml.load(content) as any;
      
      let healed = false;
      
      // 1. Version Upgrade
      if (!data.version || !data.version.startsWith('6')) {
        data.version = "6.3";
        healed = true;
      }
      
      // 2. Registry Migrations
      if (data.registry) {
        data.registry.forEach((reg: any) => {
          // Convert direction to roles
          if (reg.direction && (!reg.roles || reg.roles.length === 0)) {
            reg.roles = reg.roles || [];
            if (reg.direction === 'input') reg.roles.push('input');
            if (reg.direction === 'output') reg.roles.push('output');
            delete reg.direction;
            healed = true;
          }
          // Default type
          if (!reg.type) {
            reg.type = 'float';
            healed = true;
          }
        });
      }
      
      if (healed) {
        const newContent = yaml.dump(data, { indent: 2, lineWidth: -1 });
        // @ts-ignore
        await window.electronAPI.writeFile(item.path, newContent);
        addLog(`[HEAL] Successfully modernized: ${item.path}`);
        validateAll(); // Re-validate to update status
      } else {
        addLog(`[HEAL] No healing needed for: ${item.path}`);
      }
    } catch (e: any) {
      addLog(`[HEAL ERROR] Failed to heal ${item.path}: ${e.message}`);
    }
  };

  useEffect(() => {
    scanRepo();
  }, []);

  return (
    <div className="repo-dashboard">
      <div className="dashboard-header">
        <h2>REPOSITORY HEALTH DASHBOARD</h2>
        <div className="dashboard-actions">
          <button className="aseptic-btn" onClick={scanRepo} disabled={scanning}>REFRESH SCAN</button>
          <button className="aseptic-btn primary" onClick={validateAll} disabled={validating || items.length === 0}>
            {validating ? 'VALIDATING...' : 'BULK VALIDATE ALL'}
          </button>
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <span className="stat-val">{items.length}</span>
          <span className="stat-label">TOTAL MODULES</span>
        </div>
        <div className="stat-card valid">
          <span className="stat-val">{items.filter(i => i.status === 'valid').length}</span>
          <span className="stat-label">INDUSTRIAL (6.3)</span>
        </div>
        <div className="stat-card legacy">
          <span className="stat-val">{items.filter(i => i.status === 'legacy').length}</span>
          <span className="stat-label">LEGACY / BETA</span>
        </div>
        <div className="stat-card invalid">
          <span className="stat-val">{items.filter(i => i.status === 'invalid').length}</span>
          <span className="stat-label">CONTRACT VIOLATIONS</span>
        </div>
      </div>

      <div className="dashboard-table-container">
        <table className="aseptic-table">
          <thead>
            <tr>
              <th>STATUS</th>
              <th>MODULE NAME</th>
              <th>VERSION</th>
              <th>RELATIVE PATH</th>
              <th>LAST MODIFIED</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <React.Fragment key={idx}>
                <tr className={`status-row-${item.status}`}>
                  <td className="col-status">
                    <span className={`status-pill ${item.status}`}>
                      {item.status.toUpperCase()}
                    </span>
                  </td>
                  <td><b>{item.moduleName || '-'}</b></td>
                  <td><span className="version-tag">{item.version || '-'}</span></td>
                  <td className="col-path"><code>{item.path}</code></td>
                  <td>{new Date(item.mtime).toLocaleString()}</td>
                  <td>
                    <div className="action-cell">
                      {item.status === 'invalid' && (
                        <button className="icon-btn active" title="Toggle Errors">⚠️</button>
                      )}
                      {(item.status === 'invalid' || item.status === 'legacy') && (
                        <button 
                          className="aseptic-btn x-small heal-btn" 
                          onClick={() => handleAutoHeal(item)}
                          title="Auto-Heal to Era 6.3"
                        >
                          ⚡ HEAL
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {item.status === 'invalid' && item.errors && (
                  <tr className="error-details-row">
                    <td colSpan={6}>
                      <div className="error-list-inline">
                        {item.errors.map((err: any, i: number) => (
                          <div key={i} className="error-item-inline">
                            <span className="error-path">[{err.instancePath || 'root'}]</span>
                            <span className="error-msg">{err.message}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {items.length === 0 && !scanning && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>
                  No manifests found in <code>Resources/modules</code>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RepoDashboard;
