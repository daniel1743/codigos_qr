import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { PLATFORMS_CATALOG, CATEGORY_LABELS, PlatformCategory } from "../../constants/platforms";

export interface PlatformPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function PlatformPicker({ value, onChange, className }: PlatformPickerProps) {
  const [open, setOpen] = React.useState(false);

  const currentPlatform =
    PLATFORMS_CATALOG.find((p) => p.id === value) ||
    PLATFORMS_CATALOG.find((p) => p.id === "other");
  const CurrentIcon = currentPlatform?.icon;

  const categories: PlatformCategory[] = [
    "populares",
    "mensajeria_comunidades",
    "profesional_creadores",
    "musica_streaming",
    "descubrimiento_comercio",
    "contacto",
    "otros",
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-10 px-3 py-2", className)}
        >
          <div className="flex items-center gap-2 truncate">
            {CurrentIcon && <CurrentIcon className="w-4 h-4 shrink-0 opacity-70" />}
            <span className="truncate">
              {currentPlatform?.label || "Seleccionar plataforma..."}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 sm:w-[350px] max-w-[90vw]" align="start">
        <Command
          filter={(value, search) => {
            if (value.toLowerCase().includes(search.toLowerCase())) return 1;
            return 0;
          }}
        >
          <CommandInput placeholder="Buscar red o servicio..." />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>No se encontraron resultados.</CommandEmpty>
            {categories.map((category) => {
              const items = PLATFORMS_CATALOG.filter((p) => p.category === category);
              if (items.length === 0) return null;

              return (
                <CommandGroup key={category} heading={CATEGORY_LABELS[category]}>
                  {items.map((platform) => {
                    const Icon = platform.icon;
                    return (
                      <CommandItem
                        key={platform.id}
                        value={platform.label} // search by label
                        onSelect={() => {
                          onChange(platform.id);
                          setOpen(false);
                        }}
                        className="flex items-center gap-2 cursor-pointer h-10"
                      >
                        <Icon
                          className={cn(
                            "w-4 h-4 mr-1",
                            value === platform.id ? "opacity-100 text-primary" : "opacity-70",
                          )}
                        />
                        {platform.label}
                        {value === platform.id && (
                          <Check className="ml-auto h-4 w-4 text-primary" />
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
