import React from 'react';
import type { WasmStatus } from '../types';

interface WasmHeartbeatProps {
  status: WasmStatus;
  details: string | null;
  onHeal?: () => void;
}

const WasmHeartbeat: React.FC<WasmHeartbeatProps> = ({ status, details, onHeal }) => {
  const getHeartIcon = () => {
    switch (status) {
      case 'sync': return '❤️'; // Corazón verde/brillante por CSS
      case 'mismatch': return '🧡'; // Corazón naranja por CSS
      case 'error': return '💔'; // Corazón roto
      case 'none': 
      default: return '🖤'; // Corazón vacío/rojo tachado
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'sync': return 'ASEPTIC SYNC';
      case 'mismatch': return 'CONTRACT MISMATCH';
      case 'error': return 'SCAN ERROR';
      case 'none': return 'NO BINARY FOUND';
      default: return 'UNKNOWN';
    }
  };

  const canHeal = status !== 'none';

  return (
    <div 
      className={`wasm-heartbeat status-${status} ${canHeal ? 'clickable' : ''}`} 
      onClick={() => canHeal && onHeal && onHeal()}
      title={canHeal ? "Click to Force Aseptic Healing (Scan WASM Exports)" : (details || getStatusLabel())}
    >
      <div className="heart-icon">{getHeartIcon()}</div>
      <div className="heart-label">
        <span className="tiny-label">WASM HEARTBEAT</span>
        <span className="heavy-label">{getStatusLabel()}</span>
        {canHeal && <span className="action-hint">CLICK TO HEAL</span>}
      </div>
    </div>
  );
};

export default WasmHeartbeat;
