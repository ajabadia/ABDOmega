import React from 'react';

interface LivePreviewProps {
  moduleData: any;
}

const LivePreview: React.FC<LivePreviewProps> = ({ moduleData }) => {
  const currentTab = 'MAIN'; // Could be tracked in state later

  const renderAttachment = (att: any, label: string, defaultValue: number) => {
    const style: React.CSSProperties = {
      position: 'absolute',
      fontSize: '8px',
      fontWeight: 900,
      whiteSpace: 'nowrap',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      pointerEvents: 'none'
    };

    switch (att.position) {
      case 'top': style.bottom = '100%'; style.left = '50%'; style.transform = 'translateX(-50%)'; style.marginBottom = '4px'; break;
      case 'bottom': style.top = '100%'; style.left = '50%'; style.transform = 'translateX(-50%)'; style.marginTop = '4px'; break;
      case 'left': style.right = '100%'; style.top = '50%'; style.transform = 'translateY(-50%)'; style.marginRight = '8px'; break;
      case 'right': style.left = '100%'; style.top = '50%'; style.transform = 'translateY(-50%)'; style.marginLeft = '8px'; break;
    }

    if (att.type === 'label') {
      return <div key={`${label}-att`} style={{ ...style, color: '#666' }}>{label}</div>;
    }
    if (att.type === 'display') {
      const formatted = (defaultValue || 0).toFixed(att.format?.decimals ?? 1);
      return (
        <div key={`${label}-display`} style={{ 
          ...style, 
          background: '#000', 
          color: 'var(--neon-cyan)', 
          padding: '2px 4px', 
          border: '1px solid #222',
          fontFamily: 'monospace',
          fontSize: '9px',
          boxShadow: '0 0 5px rgba(0,242,255,0.2)'
        }}>
          {formatted}{att.format?.suffix || ''}
        </div>
      );
    }
    if (att.type === 'led') {
      return (
        <div key={`${label}-led`} style={{ 
          ...style, 
          width: '4px', 
          height: '4px', 
          borderRadius: '50%', 
          background: 'var(--neon-amber)',
          boxShadow: '0 0 8px var(--neon-amber)'
        }} />
      );
    }
    return null;
  };

  return (
    <div className="preview-side-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingTop: '20px' }}>
      
      <div style={{ 
        width: '320px', 
        minHeight: '480px', 
        background: 'linear-gradient(180deg, #121212, #080808)', 
        border: '1px solid #333',
        borderRadius: '4px',
        padding: '30px 20px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
        margin: '0 auto',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* SCREWS */}
        <div style={{ position: 'absolute', top: '10px', left: '10px', width: '6px', height: '6px', borderRadius: '50%', background: '#333' }} />
        <div style={{ position: 'absolute', top: '10px', right: '10px', width: '6px', height: '6px', borderRadius: '50%', background: '#333' }} />
        <div style={{ position: 'absolute', bottom: '10px', left: '10px', width: '6px', height: '6px', borderRadius: '50%', background: '#333' }} />
        <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '6px', height: '6px', borderRadius: '50%', background: '#333' }} />

        <div style={{ 
          borderBottom: '1px solid #222', 
          paddingBottom: '15px', 
          marginBottom: '30px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 900, color: '#fff', letterSpacing: '3px', textShadow: '0 0 10px rgba(255,255,255,0.2)' }}>
            {moduleData.name?.toUpperCase() || 'NEW_MODULE'}
          </div>
          <div style={{ fontSize: '8px', color: '#444', marginTop: '5px', letterSpacing: '1px' }}>
            {moduleData.id || 'omega.null_id'} // ERA 6.1 ASEPTIC
          </div>
        </div>

        <div style={{ 
          flex: 1, 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr',
          gap: '40px 20px',
          padding: '10px',
          alignContent: 'start'
        }}>
          {moduleData.registry.filter((i: any) => (i.presentation?.tab || 'MAIN') === currentTab).map((item: any, idx: number) => {
            const componentType = item.presentation?.ui?.component || 'knob';
            const variant = item.presentation?.ui?.variant || 'B';
            const size = variant === 'A' ? 60 : variant === 'C' ? 30 : 45;
            
            return (
              <div key={idx} style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                position: 'relative',
                minHeight: '80px'
              }}>
                {/* RENDER ATTACHMENTS */}
                {item.presentation?.attachments?.map((att: any) => renderAttachment(att, item.label, item.default))}

                {/* MAIN COMPONENT BODY */}
                {componentType === 'knob' && (
                  <div style={{ 
                    width: `${size}px`, 
                    height: `${size}px`,
                    borderRadius: '50%', 
                    background: 'linear-gradient(145deg, #1a1a1a, #0a0a0a)',
                    border: '1px solid #333',
                    position: 'relative',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.5), inset 0 2px 5px rgba(255,255,255,0.05)'
                  }}>
                    <div style={{ 
                      position: 'absolute', 
                      top: '15%', 
                      left: '50%', 
                      width: '2px', 
                      height: '25%', 
                      background: 'var(--neon-cyan)', 
                      transform: 'translateX(-50%)',
                      boxShadow: '0 0 8px var(--neon-cyan)',
                      borderRadius: '1px'
                    }} />
                  </div>
                )}

                {componentType === 'slider_v' && (
                  <div style={{ 
                    width: '12px', 
                    height: '60px',
                    background: '#000',
                    border: '1px solid #222',
                    borderRadius: '2px',
                    position: 'relative'
                  }}>
                    <div style={{ 
                      position: 'absolute',
                      top: '40%',
                      left: '-4px',
                      right: '-4px',
                      height: '4px',
                      background: '#444',
                      border: '1px solid #666',
                      borderRadius: '1px'
                    }} />
                  </div>
                )}

                {componentType === 'port' && (
                  <div style={{ 
                    width: '30px', 
                    height: '30px',
                    borderRadius: '50%',
                    background: '#050505',
                    border: '2px solid #222',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'inset 0 2px 10px rgba(0,0,0,1)'
                  }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#000', border: '1px solid #333' }} />
                  </div>
                )}

                {/* FALLBACK LABEL IF NO ATTACHMENTS */}
                {(!item.presentation?.attachments || item.presentation.attachments.length === 0) && (
                  <div style={{ fontSize: '8px', color: '#444', marginTop: '8px', fontWeight: 900, textTransform: 'uppercase' }}>
                    {item.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      <div style={{ marginTop: 'auto', width: '100%', padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '9px', color: '#333', letterSpacing: '1px', fontWeight: 700 }}>
          CERTIFIED FOR OMEGA RUNTIME v6.1.4
        </div>
      </div>
    </div>
  );
};

export default LivePreview;
