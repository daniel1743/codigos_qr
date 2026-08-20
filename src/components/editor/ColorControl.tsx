import { useState, useEffect } from "react";
import { Input } from "../ui/input";

export function ColorControl({
  value,
  onChange,
  compact = false,
}: {
  value: string;
  onChange: (validHex: string) => void;
  compact?: boolean;
}) {
  const [localVal, setLocalVal] = useState(value);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLocalVal(value);
    setError(false);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLocalVal(newVal);
    if (/^#[0-9A-Fa-f]{6}$/i.test(newVal)) {
      setError(false);
      onChange(newVal);
    } else {
      setError(true);
    }
  };

  const handleBlur = () => {
    if (!/^#[0-9A-Fa-f]{6}$/i.test(localVal)) {
      setLocalVal(value);
      setError(false);
    }
  };

  const validColorForPicker = /^#[0-9A-Fa-f]{6}$/i.test(localVal) ? localVal : value;

  const heightClass = compact ? "h-10" : "h-11";

  return (
    <div className={`flex ${compact ? "gap-2" : "gap-3"} mb-1`}>
      <Input
        type="color"
        value={validColorForPicker}
        onChange={(e) => {
          setLocalVal(e.target.value);
          onChange(e.target.value);
        }}
        className={`${heightClass} ${compact ? "w-10" : "w-11"} cursor-pointer rounded-lg p-1 shrink-0`}
      />
      <div className="flex-1 relative">
        <Input
          type="text"
          value={localVal}
          onChange={handleChange}
          onBlur={handleBlur}
          maxLength={7}
          className={`${heightClass} font-mono uppercase ${error ? "border-red-500 focus-visible:ring-red-500" : ""}`}
        />
        {error && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-red-500 font-medium">
            Inválido
          </span>
        )}
      </div>
    </div>
  );
}
