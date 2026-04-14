import React, { useState, useEffect } from 'react';

interface LivePreviewProps {
  moduleData: any;
  onUpdate?: (updates: any) => void;
}

const LivePreview: React.FC<LivePreviewProps> = ({ moduleData, onUpdate }) => {
  const currentTab = 'MAIN';
  const theme = moduleData.theme || 'default';
  const [missingRules, setMissingRules] = useState<string[]>([]);

  // CSS Reflection: Check if a combination of component and variant exists in loaded stylesheets
  useEffect(() => {
    const checkCssRules = () => {
      const missing: string[] = [];
      const registry = moduleData.registry || [];
      
      registry.forEach((item: any) => {
        const type = item.presentation?.ui?.component || 'knob';
        const variant = item.presentation?.ui?.variant || 'B';
        const selector = `.theme-${theme} .${type}.variant-${variant}`;
        
        let found = false;
        try {
          // Iterate through all stylesheets to find the selector
          for (let i = 0; i < document.styleSheets.length; i++) {
            const sheet = document.styleSheets[i];
            try {
              const rules = sheet.cssRules || sheet.rules;
              for (let j = 0; j < rules.length; j++) {
                const rule = rules[j] as CSSStyleRule;
                if (rule.selectorText && rule.selectorText.includes(selector)) {
                  found = true;
                  break;
                }
              }
            } catch (e) {
              // Ignore cross-origin stylesheet errors
            }
            if (found) break;
          }
        } catch (e) {
          console.error("CSS Reflection Error", e);
        }

        if (!found) {
          missing.push(`${type}.variant-${variant}`);
        }
      });
      setMissingRules(missing);
    };

    // Small delay to ensure CSS imports are processed
    const timer = setTimeout(checkCssRules, 500);
    return () => clearTimeout(timer);
  }, [moduleData, theme]);

  const copyCssTemplate = (missingId: string) => {
    const [type, variantPart] = missingId.split('.');
    const variant = variantPart.replace('variant-', '');
    const template = `/* MISSING DEFINITION FOR ${theme.toUpperCase()} */
.theme-${theme} .${type}.variant-${variant} {
    /* TODO: Define styles for ${type} ${variant} */
    /* width: ...; height: ...; background: ...; */
}
`;
    navigator.clipboard.writeText(template);
    alert(`CSS Template for ${missingId} copied to clipboard!\nPaste it in ui/css/themes/${theme}/${type}s.css`);
  };

  // Helper to determine pixel size based on semantic size
  const getSizePx = (size: string, component: string) => {
    switch (size) {
      case 'mini': return component === 'knob' ? 24 : 18;
      case 'small': return component === 'knob' ? 32 : 24;
      case 'large': return component === 'knob' ? 54 : 45;
      case 'xl': return component === 'knob' ? 72 : 60;
      default: return component === 'knob' ? 42 : 32; // Medium
    }
  };

  const renderAttachment = (att: any, label: string, value: number) => {
    const style: React.CSSProperties = {
      position: 'absolute',
      pointerEvents: 'none'
    };

    const side = att.position || 'bottom';
    switch (side) {
      case 'top': style.bottom = '100%'; style.left = '50%'; style.transform = 'translateX(-50%)'; style.marginBottom = '6px'; break;
      case 'bottom': style.top = '100%'; style.left = '50%'; style.transform = 'translateX(-50%)'; style.marginTop = '6px'; break;
      case 'left': style.right = '100%'; style.top = '50%'; style.transform = 'translateY(-50%)'; style.marginRight = '8px'; break;
      case 'right': style.left = '100%'; style.top = '50%'; style.transform = 'translateY(-50%)'; style.marginLeft = '8px'; break;
    }

    if (att.type === 'label') {
      return (
        <div key={`${label}-att-label`} style={{ ...style, fontSize: '7px', fontWeight: 900, color: 'var(--module-label-color)', opacity: 0.6, letterSpacing: '1px' }}>
          {label.toUpperCase()}
        </div>
      );
    }
    
    if (att.type === 'display') {
      return (
        <div key={`${label}-att-disp`} className="variant-display" style={{ 
          ...style, 
          background: 'var(--module-display-bg)', 
          color: 'var(--module-display-color)',
          padding: '1px 4px',
          fontSize: '9px',
          fontFamily: 'var(--module-font-mono)',
          border: '1px solid var(--module-border)',
          borderRadius: '2px',
          minWidth: '24px',
          textAlign: 'center',
          boxShadow: 'inset 0 0 5px rgba(0,0,0,0.8)'
        }}>
          {(value || 0).toFixed(1)}
        </div>
      );
    }

    if (att.type === 'led') {
      const variantClass = att.variant || 'B';
      return <div key={`${label}-att-led`} className={`led variant-${variantClass}`} style={style} />;
    }

    return null;
  };

  const renderComponent = (item: any) => {
    const ui = item.presentation?.ui || {};
    const type = ui.component || 'knob';
    const variant = ui.variant || 'B';
    const size = ui.size || 'medium';
    const sizePx = getSizePx(size, type);
    const isMissing = missingRules.includes(`${type}.variant-${variant}`);

    const baseClass = `${type} variant-${variant} size-${size}`;

    return (
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isMissing && (
          <div 
             onClick={() => copyCssTemplate(`${type}.variant-${variant}`)}
             title="CSS Definition Missing! Click to copy template."
             style={{
               position: 'absolute',
               top: '-5px',
               left: '-5px',
               right: '-5px',
               bottom: '-5px',
               border: '2px dashed #ff4d4d',
               borderRadius: type === 'knob' ? '50%' : '4px',
               zIndex: 10,
               cursor: 'copy',
               background: 'rgba(255, 77, 77, 0.1)',
               animation: 'pulseGlow 1.5s infinite alternate'
             }} 
          />
        )}
        
        {(() => {
          switch (type) {
            case 'knob':
              return (
                <div className={baseClass} style={{ 
                  width: sizePx, 
                  height: sizePx, 
                  borderRadius: '50%',
                  background: 'var(--module-knob-bg, #222)',
                  border: `1px solid var(--module-knob-border, #444)`,
                  position: 'relative',
                  boxShadow: 'var(--module-glow)'
                }}>
                   <div style={{
                     position: 'absolute',
                     top: '12%',
                     left: '50%',
                     width: '2px',
                     height: '25%',
                     background: 'var(--module-accent, #00f2ff)',
                     transform: 'translateX(-50%)',
                     borderRadius: '4px'
                   }} />
                </div>
              );

            case 'slider_v':
              return (
                <div className={baseClass} style={{
                  width: '12px',
                  height: sizePx * 1.5,
                  background: 'var(--module-display-bg, #000)',
                  border: '1px solid var(--module-border, #333)',
                  borderRadius: '2px',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '-4px',
                    right: '-4px',
                    height: '6px',
                    background: '#444',
                    border: '1px solid #666'
                  }} />
                </div>
              );

            case 'port':
              return (
                <div className={baseClass} style={{
                  width: sizePx * 0.8,
                  height: sizePx * 0.8,
                  borderRadius: '50%',
                  background: '#111',
                  border: '2px solid var(--module-border, #444)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{ width: '40%', height: '40%', borderRadius: '50%', background: '#000', border: '1px solid #333' }} />
                </div>
              );

            case 'led':
              return <div className={`led variant-${variant}`} style={{ width: sizePx/3, height: sizePx/3, borderRadius: '50%', background: 'var(--module-accent, #444)' }} />;

            case 'display':
              return (
                <div className={baseClass} style={{
                  background: 'var(--module-display-bg, #000)',
                  color: 'var(--module-display-color, #00f2ff)',
                  padding: '4px 8px',
                  fontFamily: 'var(--module-font-mono, monospace)',
                  fontSize: '11px',
                  border: '1px solid var(--module-border, #333)',
                  borderRadius: '3px',
                  minWidth: '60px',
                  textAlign: 'right'
                }}>
                  0.00
                </div>
              );

            default:
              return <div style={{ fontSize: '8px', color: '#444' }}>[{type.toUpperCase()}]</div>;
          }
        })()}
      </div>
    );
  };

  return (
    <div className={`preview-side-panel omega-theme-context theme-${theme}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingTop: '20px' }}>
      
      {/* THEME SELECTOR OVERLAY (Live Switching) */}
      <div style={{ 
        margin: '0 20px 20px 20px', 
        padding: '12px', 
        background: 'rgba(0,0,0,0.5)', 
        border: '1px solid var(--module-border, #333)', 
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
      }}>
        <label style={{ fontSize: '10px', fontWeight: 900, color: 'var(--module-accent, #eee)', letterSpacing: '1px' }}>
          VISUAL THEME:
        </label>
        <select 
          className="aseptic-input" 
          style={{ flex: 1, padding: '4px 8px', fontSize: '11px', height: '30px' }}
          value={theme} 
          onChange={(e) => onUpdate && onUpdate({ theme: e.target.value })}
        >
          <option value="default">DEFAULT (Aseptic Fallback)</option>
          <option value="aseptic">ASEPTIC (Cyan Neon)</option>
          <option value="industrial">INDUSTRIAL (Amber Mono)</option>
          <option value="classic">CLASSIC (Inter Blue)</option>
        </select>
      </div>

      {missingRules.length > 0 && (
         <div style={{ 
           margin: '0 20px 20px 20px', 
           padding: '10px', 
           background: 'rgba(255, 77, 77, 0.1)', 
           border: '1px solid #ff4d4d', 
           borderRadius: '4px',
           fontSize: '10px',
           color: '#ff4d4d',
           fontWeight: 800
         }}>
           ⚠️ THEME '{theme.toUpperCase()}' IS INCOMPLETE
           <div style={{ fontWeight: 400, marginTop: '4px', opacity: 0.8 }}>
             Missing definitions for: {missingRules.join(', ')}. Click components to copy CSS templates.
           </div>
         </div>
      )}

      <div style={{ 
        width: '320px', 
        minHeight: '480px', 
        background: 'var(--module-bg, #121212)', 
        border: '1px solid var(--module-border, #333)',
        borderRadius: '4px',
        padding: '30px 20px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
        margin: '0 auto',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* PHYSICAL ASSETS (Screws) */}
        <div style={{ position: 'absolute', top: '10px', left: '10px', width: '6px', height: '6px', borderRadius: '50%', background: '#333', boxShadow: 'inset 0 1px 2px #000' }} />
        <div style={{ position: 'absolute', top: '10px', right: '10px', width: '6px', height: '6px', borderRadius: '50%', background: '#333' }} />
        <div style={{ position: 'absolute', bottom: '10px', left: '10px', width: '6px', height: '6px', borderRadius: '50%', background: '#333' }} />
        <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '6px', height: '6px', borderRadius: '50%', background: '#333' }} />

        {/* HEADER */}
        <div style={{ 
          background: 'var(--module-header-bg, #1a1a1a)',
          borderBottom: '1px solid var(--module-border, #333)', 
          padding: '10px 0 15px 0',
          marginBottom: '30px',
          textAlign: 'center',
          marginTop: '-10px'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 900, color: 'var(--module-accent, #eee)', letterSpacing: '3px', textShadow: 'var(--module-glow)' }}>
            {moduleData.name?.toUpperCase() || 'NEW_MODULE'}
          </div>
          <div style={{ fontSize: '7px', color: 'var(--module-label-color, #444)', opacity: 0.4, marginTop: '5px', letterSpacing: '2px', fontWeight: 900 }}>
            {moduleData.id || 'omega.null_id'}
          </div>
        </div>

        {/* DYNAMIC REGISTRY RENDER */}
        <div style={{ 
          flex: 1, 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr',
          gap: '45px 20px',
          padding: '10px',
          alignContent: 'start'
        }}>
          {(moduleData.registry || []).filter((i: any) => (i.presentation?.tab || 'MAIN') === currentTab).map((item: any, idx: number) => (
            <div key={`${item.id}-${idx}`} style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              position: 'relative',
              minHeight: '60px'
            }}>
              {/* ATTACHMENTS (Etiquetas, LEDs, Displays asociados) */}
              {item.presentation?.attachments?.map((att: any) => renderAttachment(att, item.label, item.default))}

              {/* CORE COMPONENT */}
              {renderComponent(item)}

              {/* AUTOMATIC LABEL FALLBACK */}
              {(!item.presentation?.attachments || !item.presentation.attachments.some((a: any) => a.type === 'label')) && (
                <div style={{ fontSize: '8px', color: 'var(--module-label-color, #666)', marginTop: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7 }}>
                  {item.label}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div style={{ marginTop: 'auto', width: '100%', padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '9px', color: '#333', letterSpacing: '1.5px', fontWeight: 800 }}>
          CERTIFIED OMEGA ERA 6.1
        </div>
      </div>

      <style>{`
        @keyframes pulseGlow {
          from { box-shadow: 0 0 5px rgba(255, 77, 77, 0.2); border-color: rgba(255, 77, 77, 0.4); }
          to { box-shadow: 0 0 15px rgba(255, 77, 77, 0.6); border-color: rgba(255, 77, 77, 1); }
        }
      `}</style>
    </div>
  );
};

export default LivePreview;
