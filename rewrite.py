with open('src/components/editor/TextSection.tsx', 'w', encoding='utf-8') as f:
    f.write('''import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Search, Check, AlignLeft, AlignCenter, AlignRight, Type, PanelTop, PanelBottom, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "../ui/scroll-area";
import type { Profile } from "../../types/database";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { Alert, AlertDescription } from "../ui/alert";
import { evaluateContrast, getRecommendedTextColor } from "../../lib/color-utils";
import { AlertTriangle } from "lucide-react";

interface TextSectionProps {
  profile: Partial<Profile>;
  onChange: (updates: Partial<Profile>) => void;
}

const FONT_CATEGORIES = [
  "Todas",
  "Sans Modern",
  "Clean",
  "Serif",
  "Rounded",
  "Display",
  "Manuscrita",
] as const;

const FONTS = [
  { name: "Inter", category: "Sans Modern" },
  { name: "Manrope", category: "Sans Modern" },
  { name: "DM Sans", category: "Sans Modern" },
  { name: "Poppins", category: "Sans Modern" },
  { name: "Montserrat", category: "Sans Modern" },
  { name: "Plus Jakarta Sans", category: "Sans Modern" },
  { name: "Outfit", category: "Sans Modern" },
  { name: "Rubik", category: "Sans Modern" },
  { name: "Source Sans 3", category: "Clean" },
  { name: "Work Sans", category: "Clean" },
  { name: "Nunito Sans", category: "Clean" },
  { name: "Public Sans", category: "Clean" },
  { name: "Playfair Display", category: "Serif" },
  { name: "Lora", category: "Serif" },
  { name: "Cormorant Garamond", category: "Serif" },
  { name: "Libre Baskerville", category: "Serif" },
  { name: "Merriweather", category: "Serif" },
  { name: "Nunito", category: "Rounded" },
  { name: "Quicksand", category: "Rounded" },
  { name: "Bebas Neue", category: "Display" },
  { name: "Oswald", category: "Display" },
  { name: "Archivo Black", category: "Display" },
  { name: "Caveat", category: "Manuscrita" },
  { name: "Dancing Script", category: "Manuscrita" },
  { name: "Pacifico", category: "Manuscrita" },
] as const;

function SegmentControl({ options, value, onChange }: { options: any[], value: string, onChange: (v: string) => void }) {
  return (
    <div className="flex bg-muted/50 p-1 rounded-lg w-full">
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={lex-1 flex items-center justify-center py-1.5 px-2 text-xs font-medium rounded-md transition-colors }
        >
          {opt.icon ? <opt.icon className="w-4 h-4"/> : opt.label}
        </button>
      ))}
    </div>
  )
}

function SectionGroup({ title, icon: Icon, children, defaultOpen = false }: { title: string, icon: any, children: React.ReactNode, defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border rounded-xl bg-card overflow-hidden">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold text-sm">{title}</span>
        </div>
        <ChevronDown className={w-4 h-4 text-muted-foreground transition-transform } />
      </CollapsibleTrigger>
      <CollapsibleContent className="p-4 pt-0 space-y-5 border-t mt-4">
        <div className="pt-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function TextSection({ profile, onChange }: TextSectionProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Todas");
  
  const currentFont = profile.font_family || "Inter";
  
  const filteredFonts = FONTS.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "Todas" || f.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const checkContrast = (color: string | undefined | null) => {
    if (!color) return null;
    const bg = profile.background_color || "#FFFFFF";
    const contrast = evaluateContrast(color, bg);
    if (contrast === 'POOR') {
      return getRecommendedTextColor(bg);
    }
    return null;
  }

  const titleContrastFix = checkContrast(profile.title_color);
  const bioContrastFix = checkContrast(profile.bio_color);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Texto</h2>
        <p className="text-sm text-muted-foreground">Configura la tipografía de tu página.</p>
      </div>

      <SectionGroup title="Fuente principal" icon={Type} defaultOpen={true}>
        <div className="space-y-4">
          <div className="p-3 border rounded-xl bg-muted/30 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-medium text-sm">{currentFont}</span>
            </div>
            <div className="px-2 py-0.5 bg-background border rounded-full text-[10px] shadow-sm font-medium">Activa</div>
          </div>
          
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar fuente..."
                className="pl-9 bg-background h-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <ScrollArea className="w-full whitespace-nowrap pb-2 -mx-1 px-1">
              <div className="flex gap-2">
                {FONT_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={px-3 py-1 rounded-full text-[11px] font-medium transition-colors }
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </ScrollArea>
            <div className="grid grid-cols-1 gap-2 mt-2 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin">
              {filteredFonts.map((font) => {
                const isActive = currentFont === font.name;
                return (
                  <button
                    key={font.name}
                    onClick={() => onChange({ font_family: font.name })}
                    className={lex items-center justify-between p-2.5 rounded-lg border text-left transition-all }
                  >
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium truncate">{font.name}</span>
                        <span className="text-[9px] text-muted-foreground bg-muted px-1.5 rounded">{font.category}</span>
                      </div>
                      <span className="text-base truncate opacity-80" style={{ fontFamily: font.name }}>AgX</span>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </SectionGroup>

      <SectionGroup title="Nombre" icon={PanelTop}>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Color</Label>
            <SegmentControl 
              options={[{id: 'auto', label: 'Automático'}, {id: 'custom', label: 'Personalizado'}]}
              value={profile.title_color ? 'custom' : 'auto'}
              onChange={(v) => onChange({ title_color: v === 'auto' ? null : '#000000' })}
            />
          </div>
          {profile.title_color && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Input type="color" value={profile.title_color} onChange={e => onChange({ title_color: e.target.value })} className="w-10 h-10 p-1" />
                <Input type="text" value={profile.title_color} onChange={e => onChange({ title_color: e.target.value })} className="flex-1 font-mono uppercase h-10" />
              </div>
              {titleContrastFix && (
                <Alert variant="destructive" className="py-2 px-3">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs flex items-center justify-between ml-2">
                    <span>Contraste insuficiente</span>
                    <button onClick={() => onChange({title_color: titleContrastFix})} className="underline font-semibold ml-2">Corregir</button>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-xs">Tamaño</Label>
            <SegmentControl 
              options={[{id: 'sm', label: 'S'}, {id: 'md', label: 'M'}, {id: 'lg', label: 'L'}, {id: 'xl', label: 'XL'}]}
              value={profile.title_size || 'lg'}
              onChange={(v) => onChange({ title_size: v })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Peso</Label>
            <SegmentControl 
              options={[{id: 'light', label: 'Light'}, {id: 'normal', label: 'Regular'}, {id: 'semibold', label: 'Semi'}, {id: 'bold', label: 'Bold'}]}
              value={profile.title_weight || 'bold'}
              onChange={(v) => onChange({ title_weight: v })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Alineación</Label>
            <SegmentControl 
              options={[{id: 'left', icon: AlignLeft}, {id: 'center', icon: AlignCenter}, {id: 'right', icon: AlignRight}]}
              value={profile.title_align || 'center'}
              onChange={(v) => onChange({ title_align: v })}
            />
          </div>
        </div>
      </SectionGroup>

      <SectionGroup title="Descripción" icon={Type}>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Color</Label>
            <SegmentControl 
              options={[{id: 'auto', label: 'Automático'}, {id: 'custom', label: 'Personalizado'}]}
              value={profile.bio_color ? 'custom' : 'auto'}
              onChange={(v) => onChange({ bio_color: v === 'auto' ? null : '#000000' })}
            />
          </div>
          {profile.bio_color && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Input type="color" value={profile.bio_color} onChange={e => onChange({ bio_color: e.target.value })} className="w-10 h-10 p-1" />
                <Input type="text" value={profile.bio_color} onChange={e => onChange({ bio_color: e.target.value })} className="flex-1 font-mono uppercase h-10" />
              </div>
              {bioContrastFix && (
                <Alert variant="destructive" className="py-2 px-3">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs flex items-center justify-between ml-2">
                    <span>Contraste insuficiente</span>
                    <button onClick={() => onChange({bio_color: bioContrastFix})} className="underline font-semibold ml-2">Corregir</button>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-xs">Tamaño</Label>
            <SegmentControl 
              options={[{id: 'sm', label: 'S'}, {id: 'md', label: 'M'}, {id: 'lg', label: 'L'}]}
              value={profile.bio_size || 'md'}
              onChange={(v) => onChange({ bio_size: v })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Peso</Label>
            <SegmentControl 
              options={[{id: 'light', label: 'Light'}, {id: 'normal', label: 'Regular'}, {id: 'semibold', label: 'Semi'}]}
              value={profile.bio_weight || 'normal'}
              onChange={(v) => onChange({ bio_weight: v })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Alineación</Label>
            <SegmentControl 
              options={[{id: 'left', icon: AlignLeft}, {id: 'center', icon: AlignCenter}, {id: 'right', icon: AlignRight}]}
              value={profile.bio_align || 'center'}
              onChange={(v) => onChange({ bio_align: v })}
            />
          </div>
        </div>
      </SectionGroup>

      <SectionGroup title="Botones" icon={PanelBottom}>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Tamaño de texto</Label>
            <SegmentControl 
              options={[{id: 'sm', label: 'Pequeño'}, {id: 'md', label: 'Medio'}, {id: 'lg', label: 'Grande'}]}
              value={profile.button_text_size || 'md'}
              onChange={(v) => onChange({ button_text_size: v })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Peso</Label>
            <SegmentControl 
              options={[{id: 'normal', label: 'Regular'}, {id: 'semibold', label: 'Semibold'}, {id: 'bold', label: 'Bold'}]}
              value={profile.button_text_weight || 'semibold'}
              onChange={(v) => onChange({ button_text_weight: v })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Alineación del contenido</Label>
            <SegmentControl 
              options={[{id: 'left', icon: AlignLeft}, {id: 'center', icon: AlignCenter}, {id: 'right', icon: AlignRight}]}
              value={profile.button_content_align || 'left'}
              onChange={(v) => onChange({ button_content_align: v })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Posición del icono</Label>
            <SegmentControl 
              options={[{id: 'left', label: 'Izquierda'}, {id: 'right', label: 'Derecha'}]}
              value={profile.button_icon_position || 'left'}
              onChange={(v) => onChange({ button_icon_position: v })}
            />
          </div>
        </div>
      </SectionGroup>
    </div>
  );
}
''')
