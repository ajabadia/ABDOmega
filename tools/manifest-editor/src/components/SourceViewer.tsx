import React from 'react';
import yaml from 'js-yaml';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface SourceViewerProps {
  moduleData: any;
}

const SourceViewer: React.FC<SourceViewerProps> = ({ moduleData }) => {
  const yamlSource = yaml.dump(moduleData, { 
    indent: 2, 
    lineWidth: -1, 
    noRefs: true,
    sortKeys: false 
  });

  const copyToClipboard = () => {
    navigator.clipboard.writeText(yamlSource);
  };

  // Tema personalizado sobre vscDarkPlus para encajar con OMEGA
  const customStyle = {
    ...vscDarkPlus,
    'pre[class*="language-"]': {
      ...vscDarkPlus['pre[class*="language-"]'],
      background: 'transparent',
      margin: 0,
      padding: '20px',
      fontSize: '11px',
      lineHeight: '1.6',
    },
    'code[class*="language-"]': {
      ...vscDarkPlus['code[class*="language-"]'],
      background: 'transparent',
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    }
  };

  return (
    <div className="source-viewer-evolution">
      <div className="source-header">
        <div className="header-info">
          <span className="file-name">{moduleData.id}.acemm</span>
          <span className="lang-tag">YAML / CONTRACT</span>
        </div>
        <button className="aseptic-btn" onClick={copyToClipboard}>
          COPY TO CLIPBOARD
        </button>
      </div>
      <div className="source-content">
        <SyntaxHighlighter 
          language="yaml" 
          style={customStyle as any}
          customStyle={{ background: 'transparent' }}
        >
          {yamlSource}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export default SourceViewer;
