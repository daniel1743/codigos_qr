import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { ChevronDown, Wand2, PaintBucket, Palette, Type, Sparkles, ImageIcon, Crown } from "lucide-react";
import { useState } from "react";
import type { Profile, ProfileLink } from "../../types/database";
import { TemplatePicker } from "./TemplatePicker";
import { PremiumMaxProPicker } from "./PremiumMaxProPicker";

// Importamos las subsecciones que crearemos
import { FondoSection } from "./appearance/FondoSection";
import { BotonesSection } from "./appearance/BotonesSection";
import { TipografiaSection } from "./appearance/TipografiaSection";
import { DecoracionSection } from "./appearance/DecoracionSection";
import { SocialCoversSection } from "./appearance/SocialCoversSection";
import { PortadaAvatarSection } from "./appearance/PortadaAvatarSection";

interface AppearanceSectionProps {
  profile: Partial<Profile>;
  onChange: (updates: Partial<Profile>) => void;
  userId: string;
  links?: Partial<ProfileLink>[];
  onManageLinkImages?: () => void;
}

export function AppearanceSection({
  profile,
  onChange,
  userId,
  links = [],
  onManageLinkImages,
}: AppearanceSectionProps) {
  const [manualCustomizationOpen, setManualCustomizationOpen] = useState(false);

  return (
    <div className="space-y-6 pb-4">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Apariencia</h2>
        <p className="text-sm text-muted-foreground">
          Elige un diseño completo o personaliza cada detalle.
        </p>
      </div>

      {/* 1. PLANTILLAS PRIMERO */}
      <TemplatePicker profile={profile} onChange={onChange} />

      {/* 1.5 PREMIUM MAX PRO TEMPLATES (Collapsible) */}
      <Collapsible defaultOpen={false}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border-2 border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-600/10 p-4 hover:from-amber-500/20 hover:to-amber-600/20 transition-all shadow-sm hover:shadow-md">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-600" />
            <span className="font-bold text-sm bg-gradient-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent">
              Premium Max Pro Templates
            </span>
            <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold">
              ELITE
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-amber-600 transition-transform data-[state=open]:rotate-180`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <PremiumMaxProPicker profile={profile} onChange={onChange} />
        </CollapsibleContent>
      </Collapsible>

      {/* 2. PERSONALIZACIÓN MANUAL (Collapsible) */}
      <Collapsible open={manualCustomizationOpen} onOpenChange={setManualCustomizationOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border bg-card p-4 hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Personalizar manualmente</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${manualCustomizationOpen ? "rotate-180" : ""}`}
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-6 pt-6">
          {/* Fondo */}
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border bg-card p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                <PaintBucket className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Fondo</span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <FondoSection profile={profile} onChange={onChange} />
            </CollapsibleContent>
          </Collapsible>

          {/* Botones */}
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border bg-card p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Botones</span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <BotonesSection profile={profile} onChange={onChange} />
            </CollapsibleContent>
          </Collapsible>

          {/* Tipografía */}
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border bg-card p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Tipografía</span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <TipografiaSection profile={profile} onChange={onChange} />
            </CollapsibleContent>
          </Collapsible>

          {/* Decoración */}
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border bg-card p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Decoración</span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <DecoracionSection profile={profile} onChange={onChange} />
            </CollapsibleContent>
          </Collapsible>

          {/* Portada y Avatar */}
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border bg-card p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Portada y Avatar</span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <PortadaAvatarSection profile={profile} onChange={onChange} userId={userId} />
            </CollapsibleContent>
          </Collapsible>

          {/* Social Covers (Premium) */}
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border bg-card p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="font-semibold text-sm">Social Covers (Premium)</span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <SocialCoversSection
                profile={profile}
                onChange={onChange}
                links={links}
                onManageLinkImages={onManageLinkImages}
              />
            </CollapsibleContent>
          </Collapsible>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
