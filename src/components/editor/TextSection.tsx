import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Search, Check } from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "../ui/scroll-area";
import type { Profile } from "../../types/database";

interface TextSectionProps {
  profile: Partial<Profile>;
  onChange: (updates: Partial<Profile>) => void;
}

const FONT_CATEGORIES = ["Todas", "Sans", "Serif", "Elegante", "Rounded", "Display", "Manuscrita"] as const;

const FONTS = [
  { name: "Inter", category: "Sans" },
  { name: "Manrope", category: "Sans" },
  { name: "DM Sans", category: "Sans" },
  { name: "Poppins", category: "Sans" },
  { name: "Playfair Display", category: "Serif" },
  { name: "Lora", category: "Serif" },
  { name: "Cormorant Garamond", category: "Elegante" },
  { name: "Nunito", category: "Rounded" },
  { name: "Montserrat", category: "Display" },
  { name: "Caveat", category: "Manuscrita" },
] as const;

export function TextSection({ profile, onChange }: TextSectionProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Todas");
  
  const currentFont = profile.font_family || "Inter";

  const filteredFonts = FONTS.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "Todas" || f.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Texto</h2>
        <p className="text-sm text-muted-foreground">Configura la tipografía de tu página.</p>
      </div>

      <div className="space-y-3">
        <Label>Fuente actual</Label>
        <div className="p-4 border rounded-xl bg-muted/30 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-medium">{currentFont}</span>
            <span className="text-xs text-muted-foreground" style={{ fontFamily: currentFont }}>
              Tu página, tu estilo
            </span>
          </div>
          <div className="px-3 py-1 bg-background border rounded-full text-xs shadow-sm font-medium">
            Activa
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <Label>Explorar fuentes</Label>
        
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar fuente..." 
            className="pl-9 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <ScrollArea className="w-full whitespace-nowrap pb-2 -mx-1 px-1">
          <div className="flex gap-2">
            {FONT_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeCategory === cat 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </ScrollArea>

        <div className="grid grid-cols-1 gap-2 mt-2 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
          {filteredFonts.map((font) => {
            const isActive = currentFont === font.name;
            return (
              <button
                key={font.name}
                onClick={() => onChange({ font_family: font.name })}
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  isActive 
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                    : "border-border bg-card hover:border-primary/30 hover:bg-accent/50"
                }`}
              >
                <div className="flex flex-col gap-1 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{font.name}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 rounded">
                      {font.category}
                    </span>
                  </div>
                  <span 
                    className="text-lg truncate opacity-80" 
                    style={{ fontFamily: font.name }}
                  >
                    Tu página, tu estilo
                  </span>
                </div>
                {isActive && <Check className="w-5 h-5 text-primary shrink-0 ml-2" />}
              </button>
            );
          })}
          
          {filteredFonts.length === 0 && (
            <div className="text-center p-6 text-sm text-muted-foreground border border-dashed rounded-xl">
              No se encontraron fuentes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
