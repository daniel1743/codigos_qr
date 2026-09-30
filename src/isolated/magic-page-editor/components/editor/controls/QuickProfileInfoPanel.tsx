import React, { useEffect, useState } from 'react';
import { InfoIcon, MailIcon, MapPinIcon, PhoneIcon, BriefcaseBusinessIcon } from 'lucide-react';
import { useEditor } from '../../../contexts/EditorContext';
import { PanelSection } from './PanelSection';
import { QUICK_PROFILE_INFO_KEY, readQuickProfileInfo, type QuickProfileInfoValues } from '../../profile/QuickProfileInfo';

const initialValues: QuickProfileInfoValues = {};

function Field({ label, placeholder, value, onChange, multiline = false, maxLength, type = 'text', icon: Icon }: { label: string; placeholder: string; value: string; onChange: (value: string) => void; multiline?: boolean; maxLength: number; type?: string; icon: typeof InfoIcon }) {
  const common = { value, placeholder, maxLength, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value), className: 'w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-select focus:ring-2 focus:ring-select/15' };
  return <label className="block space-y-1.5"><span className="flex items-center gap-1.5 text-[12px] font-medium text-ink"><Icon className="h-3.5 w-3.5 text-mute" />{label}</span>{multiline ? <textarea {...common} rows={3} /> : <input {...common} type={type} />}</label>;
}

export function QuickProfileInfoPanel() {
  const ed = useEditor();
  const stored = readQuickProfileInfo(ed.doc.props);
  const [draft, setDraft] = useState<QuickProfileInfoValues>(stored);
  const [emailError, setEmailError] = useState('');

  useEffect(() => setDraft(readQuickProfileInfo(ed.doc.props)), [ed.doc.props]);

  const update = (key: keyof QuickProfileInfoValues, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    if (key === 'email') setEmailError('');
  };

  const save = () => {
    const email = draft.email?.trim() ?? '';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Introduce un correo válido.');
      return;
    }
    const next = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value?.trim() ?? ''])) as Record<string, string>;
    ed.updateDoc((doc) => ({ ...doc, props: { ...doc.props, [QUICK_PROFILE_INFO_KEY]: next } }));
    setEmailError('');
  };

  const clear = () => setDraft(initialValues);

  return <div className="space-y-4" data-testid="quick-profile-info-panel">
    <div><h3 className="text-[15px] font-semibold text-ink">Información de tu página</h3><p className="mt-1 text-[12px] leading-4 text-mute">Completa solo los datos que quieras mostrar.</p></div>
    <PanelSection title="Descripción"><Field label="Descripción" placeholder="Agrega la descripción de tu negocio o tu marca aquí" value={draft.description ?? ''} onChange={(v) => update('description', v)} multiline maxLength={220} icon={InfoIcon} /><p className="mt-1 text-[11px] leading-4 text-mute">(Se puede editar en Información.)</p></PanelSection>
    <PanelSection title="Datos de contacto"><div className="space-y-3">
      <Field label="Teléfono" placeholder="+56 9 1234 5678" value={draft.phone ?? ''} onChange={(v) => update('phone', v)} maxLength={40} icon={PhoneIcon} />
      <Field label="Correo" placeholder="contacto@negocio.cl" value={draft.email ?? ''} onChange={(v) => update('email', v)} maxLength={160} type="email" icon={MailIcon} />
      {emailError && <p className="text-[11px] text-red-600" role="alert">{emailError}</p>}
      <Field label="Dirección" placeholder="Av. Providencia 1234, Santiago" value={draft.address ?? ''} onChange={(v) => update('address', v)} maxLength={160} icon={MapPinIcon} />
      <Field label="Rubro / profesión" placeholder="Barbería, dentista, fotógrafo..." value={draft.profession ?? ''} onChange={(v) => update('profession', v)} maxLength={80} icon={BriefcaseBusinessIcon} />
    </div></PanelSection>
    <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
      <button type="button" onClick={clear} className="rounded-lg px-2.5 py-2 text-[12px] font-medium text-mute hover:bg-[#F2F3F5]">Limpiar</button>
      <div className="flex gap-2"><button type="button" onClick={() => setDraft(stored)} className="rounded-lg border border-line px-3 py-2 text-[12px] font-medium text-ink hover:bg-[#F2F3F5]">Cancelar</button><button type="button" onClick={save} className="rounded-lg bg-ink px-3 py-2 text-[12px] font-medium text-white hover:opacity-90">Guardar</button></div>
    </div>
  </div>;
}
