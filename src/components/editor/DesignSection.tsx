import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { Profile } from "../../types/database";

interface DesignSectionProps {
  profile: Partial<Profile>;
  onChange: (updates: Partial<Profile>) => void;
}

export function DesignSection({ profile, onChange }: DesignSectionProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Diseño</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="background_color">Color de Fondo</Label>
          <div className="flex gap-2">
            <Input
              id="background_color"
              type="color"
              value={profile.background_color || "#ffffff"}
              onChange={(e) => onChange({ background_color: e.target.value })}
              className="w-12 h-10 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={profile.background_color || "#ffffff"}
              onChange={(e) => onChange({ background_color: e.target.value })}
              className="flex-1 uppercase font-mono"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="button_color">Color de Botones</Label>
          <div className="flex gap-2">
            <Input
              id="button_color"
              type="color"
              value={profile.button_color || "#111111"}
              onChange={(e) => onChange({ button_color: e.target.value })}
              className="w-12 h-10 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={profile.button_color || "#111111"}
              onChange={(e) => onChange({ button_color: e.target.value })}
              className="flex-1 uppercase font-mono"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="button_text_color">Texto de Botones</Label>
          <div className="flex gap-2">
            <Input
              id="button_text_color"
              type="color"
              value={profile.button_text_color || "#ffffff"}
              onChange={(e) => onChange({ button_text_color: e.target.value })}
              className="w-12 h-10 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={profile.button_text_color || "#ffffff"}
              onChange={(e) => onChange({ button_text_color: e.target.value })}
              className="flex-1 uppercase font-mono"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Tipografía</Label>
          <Select
            value={profile.font_family || "Inter"}
            onValueChange={(val) => onChange({ font_family: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una fuente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Inter">Inter</SelectItem>
              <SelectItem value="Manrope">Manrope</SelectItem>
              <SelectItem value="DM Sans">DM Sans</SelectItem>
              <SelectItem value="Poppins">Poppins</SelectItem>
              <SelectItem value="System">System Default</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
