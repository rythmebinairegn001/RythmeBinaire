import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';

interface Props {
  value: string;
  onChange: (value: string) => void;
  language: string;
  themeMode?: 'light' | 'dark';
  readOnly?: boolean;
}

export const CodeEditor: React.FC<Props> = ({
  value,
  onChange,
  language,
  themeMode = 'light',
  readOnly = false,
}) => {
  // Determine extensions based on language
  const extensions = React.useMemo(() => {
    const langLower = language.toLowerCase();
    if (langLower.includes('python') || langLower === 'py') {
      return [python()];
    }
    if (
      langLower.includes('javascript') ||
      langLower.includes('js') ||
      langLower.includes('html') ||
      langLower.includes('css')
    ) {
      return [javascript({ jsx: true })];
    }
    return [python()];
  }, [language]);

  return (
    <div
      id="code-editor-container"
      className={`relative w-full h-full min-h-[360px] rounded-2xl overflow-hidden border transition font-mono text-sm shadow-inner ${
        themeMode === 'dark'
          ? 'bg-[#0B1526] border-slate-700/80 text-slate-100'
          : 'bg-[#1E293B] border-slate-800 text-slate-100'
      }`}
    >
      <CodeMirror
        value={value}
        height="100%"
        minHeight="360px"
        extensions={extensions}
        onChange={onChange}
        theme="dark"
        readOnly={readOnly}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightSpecialChars: true,
          history: true,
          foldGutter: true,
          drawSelection: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          syntaxHighlighting: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: true,
          crosshairCursor: true,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          closeBracketsKeymap: true,
          defaultKeymap: true,
          searchKeymap: true,
          historyKeymap: true,
          foldKeymap: true,
          completionKeymap: true,
          lintKeymap: true,
        }}
        className="text-[13px] sm:text-sm font-mono leading-relaxed h-full"
      />
    </div>
  );
};
