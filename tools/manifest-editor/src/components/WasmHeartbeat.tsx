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
      className={`wasm-heartbeat-card status-${status}`} 
      onClick={() => canHeal && onHeal && onHeal()}
      title={details || getStatusLabel()}
      style={{ cursor: canHeal ? 'pointer' : 'default' }}
    >
      <div className={`heart-icon ${status === 'sync' ? 'pulse' : ''}`}>
        {getHeartIcon()}
      </div>
      <div className="heart-info">
        <span className="heart-label">WASM HEARTBEAT</span>
        <span className="heart-status">{getStatusLabel()}</span>
        {status === 'mismatch' && <span className="heart-label" style={{ color: 'var(--neon-amber)' }}>CLICK TO HEAL</span>}
      </div>
    </div>
  );
};

export default WasmHeartbeat;
