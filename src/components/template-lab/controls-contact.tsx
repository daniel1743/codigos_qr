import { Input } from "@/components/ui/input";
import type { BasicTemplateContent } from "@/types/basic-templates";

interface ContactEditorProps {
  contact: BasicTemplateContent["contact"];
  onChange: (contact: BasicTemplateContent["contact"]) => void;
  onFocusTarget?: () => void;
}

export function ContactEditor({ contact, onChange, onFocusTarget }: ContactEditorProps) {
  return (
    <div className="space-y-2">
      <Input
        value={contact.phone}
        onChange={(e) => onChange({ ...contact, phone: e.target.value })}
        onFocus={onFocusTarget}
        placeholder="Teléfono"
        className="h-9"
      />
      <Input
        value={contact.email}
        onChange={(e) => onChange({ ...contact, email: e.target.value })}
        onFocus={onFocusTarget}
        placeholder="Email"
        className="h-9"
      />
      <Input
        value={contact.whatsapp}
        onChange={(e) => onChange({ ...contact, whatsapp: e.target.value })}
        onFocus={onFocusTarget}
        placeholder="WhatsApp"
        className="h-9"
      />
    </div>
  );
}
