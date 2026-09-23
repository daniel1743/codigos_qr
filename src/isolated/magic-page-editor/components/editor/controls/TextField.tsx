import React, { useEffect, useState } from 'react';

interface TextFieldProps {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  prefix?: string;
  multiline?: boolean;
}

export function TextField({ label, value, onCommit, placeholder, prefix, multiline = false }: TextFieldProps) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    if (draft !== value) onCommit(draft);
  };
  const base =
  'w-full rounded-xl border border-line bg-white px-3 text-[14px] text-ink outline-none transition-shadow duration-150 focus:border-select focus:ring-2 focus:ring-select/20';
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-mute">{label}</span>
      {multiline ?
      <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} placeholder={placeholder} rows={3} className={`${base} py-2.5`} /> :

      <span className="flex items-center">
          {prefix && <span className="flex h-11 items-center rounded-l-xl border border-r-0 border-line bg-[#F7F8FA] px-3 text-[13px] text-mute">{prefix}</span>}
          <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
          }}
          placeholder={placeholder}
          className={`${base} h-11 ${prefix ? 'rounded-l-none' : ''}`} />
        
        </span>
      }
    </label>);

}