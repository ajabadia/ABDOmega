import React, { useEffect, useRef } from 'react';

interface DebugConsoleProps {
  logs: string[];
  minimized: boolean;
  onToggle: () => void;
}

const DebugConsole: React.FC<DebugConsoleProps> = ({ logs, minimized, onToggle }) => {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current && !minimized) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [logs, minimized]);

  const copyToClipboard = async () => {
    try {
      // Asegurar el foco para Electron
      window.focus();
      await navigator.clipboard.writeText(logs.join('\n'));
    } catch (err) {
      console.error("Clipboard fail, fallback to legacy:", err);
      const textArea = document.createElement("textarea");
      textArea.value = logs.join('\n');
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className={`aseptic-debug-console ${minimized ? 'minimized' : ''}`} style={{ position: 'relative', height: minimized ? '28px' : '180px', transform: 'none' }}>
      <div className="console-header" onClick={onToggle}>
        <span>OMEGA ASEPTIC DEBUG CONSOLE</span>
        <div className="console-actions" onClick={(e) => e.stopPropagation()}>
          <button className="icon-btn" title="Copy Logs" onClick={copyToClipboard}>
            📋
          </button>
          <button className="icon-btn" title={minimized ? "Maximize" : "Minimize"} onClick={onToggle}>
            {minimized ? '🔼' : '🔽'}
          </button>
        </div>
      </div>
      {!minimized && (
        <div className="console-body" ref={bodyRef}>
          {logs.map((log, i) => (
            <div key={i} className="log-entry">{log}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DebugConsole;
