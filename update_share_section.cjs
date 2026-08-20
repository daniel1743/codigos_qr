const fs = require('fs');
const file = 'src/components/editor/ShareSection.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. We need to import QRCodeAdvanced and useQRAdvancedDownload
if (!code.includes('QRCodeAdvanced')) {
  code = code.replace(
    'import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";',
    'import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";\nimport { QRCodeAdvanced, useQRAdvancedDownload } from "../qr/QRCodeAdvanced";\nimport { requiresAdvancedRenderer } from "../../lib/qr-advanced-utils";'
  );
}

// 2. We need to use useQRAdvancedDownload inside ShareSection
if (!code.includes('downloadAdvancedQR')) {
  code = code.replace(
    'const [isPreparingDownload, setIsPreparingDownload] = useState(false);',
    'const [isPreparingDownload, setIsPreparingDownload] = useState(false);\n  const { download: downloadAdvancedQR } = useQRAdvancedDownload();'
  );
}

// 3. We need to update handleDownload to use advanced download if required
const handleDownloadRegex = /if \(exportFormat === "svg"\) \{\s*await downloadSVG\(publicId, "qr-preview-svg", `qr-\$\{publicId\}\.svg`\);\s*\} else \{\s*if \(logoEnabled && logoUrl\) \{\s*const img = new Image\(\);\s*img\.crossOrigin = "anonymous";\s*img\.onload = \(\) => \{\s*setIsPreparingDownload\(true\);\s*setTimeout\(\(\) => \{\s*downloadQR\(publicId, "qr-export-canvas", `qr-\$\{publicId\}-\$\{exportSize\}px\.png`\);\s*setIsPreparingDownload\(false\);\s*\}, 100\);\s*\};\s*img\.onerror = \(\) => \{\s*toast\.error\("Error al cargar el logo para la exportación\. Intenta sin logo\."\);\s*\};\s*img\.src = logoUrl;\s*\} else \{\s*setIsPreparingDownload\(true\);\s*setTimeout\(\(\) => \{\s*downloadQR\(publicId, "qr-export-canvas", `qr-\$\{publicId\}-\$\{exportSize\}px\.png`\);\s*setIsPreparingDownload\(false\);\s*\}, 100\);\s*\}\s*\}/;

const advancedDownloadBlock = `    const isAdvanced = requiresAdvancedRenderer(
      profile.qr_gradient || fgColor,
      profile.qr_dots_type || "square",
      profile.qr_effect || "none"
    );

    if (isAdvanced) {
      setIsPreparingDownload(true);
      const advOptions = {
        data: publicUrl,
        width: exportSize,
        height: exportSize,
        margin: 4,
        dotsColor: profile.qr_gradient || fgColor,
        backgroundColor: bgColor,
        dotsType: (profile.qr_dots_type as any) || "square",
        effect: (profile.qr_effect as any) || "none",
        image: logoEnabled && logoUrl ? logoUrl : undefined,
        imageOptions: logoEnabled && logoUrl ? {
          hideBackgroundDots: true,
          imageSize: 0.18,
          margin: 8,
          crossOrigin: "anonymous"
        } : undefined,
        qrOptions: { errorCorrectionLevel: "H" as const }
      };
      await downloadAdvancedQR(advOptions, \`qr-\${publicId}-\${exportSize}px.\${exportFormat}\`, exportFormat);
      setIsPreparingDownload(false);
      return;
    }

    if (exportFormat === "svg") {
      await downloadSVG(publicId, "qr-preview-svg", \`qr-\${publicId}.svg\`);
    } else {
      if (logoEnabled && logoUrl) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          setIsPreparingDownload(true);
          setTimeout(() => {
            downloadQR(publicId, "qr-export-canvas", \`qr-\${publicId}-\${exportSize}px.png\`);
            setIsPreparingDownload(false);
          }, 100);
        };
        img.onerror = () => {
          toast.error("Error al cargar el logo para la exportación. Intenta sin logo.");
        };
        img.src = logoUrl;
      } else {
        setIsPreparingDownload(true);
        setTimeout(() => {
          downloadQR(publicId, "qr-export-canvas", \`qr-\${publicId}-\${exportSize}px.png\`);
          setIsPreparingDownload(false);
        }, 100);
      }
    }`;

code = code.replace(handleDownloadRegex, advancedDownloadBlock);

// 4. Update the visual renderer block
const qrPreviewBlockOld = `<div className="flex aspect-square w-full max-w-[240px] items-center justify-center rounded-2xl border bg-white p-4 shadow-sm">
                {exportFormat === "svg" ? (
                  <QRCodeSVG
                    key={\`svg-\${publicUrl}-\${qrVersion}-\${fgColor}-\${bgColor}-\${logoEnabled}\`}
                    id="qr-preview-svg"
                    value={publicUrl}
                    size={240}
                    level="H"
                    marginSize={4}
                    bgColor={bgColor}
                    fgColor={fgColor}
                    {...(imageSettings ? { imageSettings } : {})}
                    style={{ width: "100%", height: "100%" }}
                  />
                ) : (
                  <QRCodeCanvas
                    key={\`png-\${publicUrl}-\${qrVersion}-\${fgColor}-\${bgColor}-\${logoEnabled}\`}
                    id="qr-preview-canvas"
                    value={publicUrl}
                    size={240}
                    level="H"
                    marginSize={4}
                    bgColor={bgColor}
                    fgColor={fgColor}
                    {...(imageSettings ? { imageSettings } : {})}
                    style={{ width: "100%", height: "100%" }}
                  />
                )}
              </div>`;

const qrPreviewBlockNew = `<div className="flex aspect-square w-full max-w-[240px] items-center justify-center rounded-2xl border bg-white p-4 shadow-sm overflow-hidden relative">
                {(() => {
                  const isAdvanced = requiresAdvancedRenderer(
                    profile.qr_gradient || fgColor,
                    profile.qr_dots_type || "square",
                    profile.qr_effect || "none"
                  );
                  if (isAdvanced) {
                    return (
                      <QRCodeAdvanced
                        key={\`adv-\${publicUrl}-\${qrVersion}-\${JSON.stringify(profile.qr_gradient)}-\${fgColor}-\${bgColor}-\${logoEnabled}-\${profile.qr_effect}\`}
                        options={{
                          data: publicUrl,
                          width: 240,
                          height: 240,
                          margin: 4,
                          dotsColor: profile.qr_gradient || fgColor,
                          backgroundColor: bgColor,
                          dotsType: (profile.qr_dots_type as any) || "square",
                          effect: (profile.qr_effect as any) || "none",
                          image: logoEnabled && logoUrl ? logoUrl : undefined,
                          imageOptions: logoEnabled && logoUrl ? {
                            hideBackgroundDots: true,
                            imageSize: 0.18,
                            margin: 8,
                            crossOrigin: "anonymous"
                          } : undefined,
                          qrOptions: { errorCorrectionLevel: "H" }
                        }}
                        className="w-full h-full flex items-center justify-center"
                      />
                    );
                  }
                  
                  return exportFormat === "svg" ? (
                    <QRCodeSVG
                      key={\`svg-\${publicUrl}-\${qrVersion}-\${fgColor}-\${bgColor}-\${logoEnabled}\`}
                      id="qr-preview-svg"
                      value={publicUrl}
                      size={240}
                      level="H"
                      marginSize={4}
                      bgColor={bgColor}
                      fgColor={fgColor}
                      {...(imageSettings ? { imageSettings } : {})}
                      style={{ width: "100%", height: "100%" }}
                    />
                  ) : (
                    <QRCodeCanvas
                      key={\`png-\${publicUrl}-\${qrVersion}-\${fgColor}-\${bgColor}-\${logoEnabled}\`}
                      id="qr-preview-canvas"
                      value={publicUrl}
                      size={240}
                      level="H"
                      marginSize={4}
                      bgColor={bgColor}
                      fgColor={fgColor}
                      {...(imageSettings ? { imageSettings } : {})}
                      style={{ width: "100%", height: "100%" }}
                    />
                  );
                })()}
              </div>`;

code = code.replace(qrPreviewBlockOld, qrPreviewBlockNew);

// 5. Replace the "Funcionalidad Premium próximamente" with actual selectors
const premiumEffectsOld = `{/* EFECTOS AVANZADOS PREMIUM */}
              <div className="space-y-4 rounded-2xl border bg-gradient-to-br from-amber-500/10 to-yellow-500/5 p-4 shadow-sm border-amber-200/50">
                <h4 className="font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Efectos Avanzados
                  <Crown className="w-3 h-3 text-amber-500 fill-amber-500" />
                </h4>
                <p className="text-xs text-muted-foreground">
                  Degradados, neón y estilos personalizados. Solo Premium.
                </p>
                <Button
                  onClick={() => alert("Funcionalidad Premium próximamente")}
                  className="w-full h-11 rounded-xl justify-start bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Explorar Efectos Premium
                </Button>
              </div>`;

const premiumEffectsNew = `{/* EFECTOS AVANZADOS PREMIUM */}
              <div className="space-y-4 rounded-2xl border bg-gradient-to-br from-amber-500/10 to-yellow-500/5 p-4 shadow-sm border-amber-200/50">
                <h4 className="font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Efectos Premium
                  <Crown className="w-3 h-3 text-amber-500 fill-amber-500" />
                </h4>
                <p className="text-xs text-muted-foreground">
                  Selecciona degradados dinámicos o efecto neón.
                </p>
                
                <div className="grid grid-cols-2 min-[400px]:grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    className={\`h-16 flex flex-col gap-1 rounded-xl border-2 \${!profile.qr_gradient && !profile.qr_effect ? 'border-amber-400 bg-amber-50' : 'border-transparent'}\`}
                    onClick={() => onChange({ qr_gradient: null, qr_effect: null })}
                  >
                    <div className="w-5 h-5 rounded-full bg-black"></div>
                    <span className="text-[10px]">Clásico</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className={\`h-16 flex flex-col gap-1 rounded-xl border-2 \${profile.qr_effect === 'neon' && profile.qr_foreground_color === '#ec4899' ? 'border-amber-400 bg-amber-50' : 'border-transparent'}\`}
                    onClick={() => onChange({ 
                      qr_gradient: null, 
                      qr_effect: 'neon', 
                      qr_foreground_color: '#ec4899', 
                      qr_background_color: '#000000',
                      qr_dots_type: 'classy'
                    })}
                  >
                    <div className="w-5 h-5 rounded-full shadow-[0_0_8px_#ec4899] bg-[#ec4899]"></div>
                    <span className="text-[10px]">Neón Pink</span>
                  </Button>

                  <Button
                    variant="outline"
                    className={\`h-16 flex flex-col gap-1 rounded-xl border-2 \${profile.qr_effect === 'neon' && profile.qr_foreground_color === '#06b6d4' ? 'border-amber-400 bg-amber-50' : 'border-transparent'}\`}
                    onClick={() => onChange({ 
                      qr_gradient: null, 
                      qr_effect: 'neon', 
                      qr_foreground_color: '#06b6d4', 
                      qr_background_color: '#000000',
                      qr_dots_type: 'classy'
                    })}
                  >
                    <div className="w-5 h-5 rounded-full shadow-[0_0_8px_#06b6d4] bg-[#06b6d4]"></div>
                    <span className="text-[10px]">Neón Cyan</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className={\`h-16 flex flex-col gap-1 rounded-xl border-2 \${profile.qr_gradient?.colorStops?.[0]?.color === '#f59e0b' ? 'border-amber-400 bg-amber-50' : 'border-transparent'}\`}
                    onClick={() => onChange({ 
                      qr_effect: null,
                      qr_foreground_color: '#f59e0b',
                      qr_background_color: '#ffffff',
                      qr_dots_type: 'rounded',
                      qr_gradient: {
                        type: 'linear',
                        rotation: 45,
                        colorStops: [
                          { offset: 0, color: '#f59e0b' },
                          { offset: 1, color: '#ef4444' }
                        ]
                      }
                    })}
                  >
                    <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-red-500"></div>
                    <span className="text-[10px]">Sunset</span>
                  </Button>

                  <Button
                    variant="outline"
                    className={\`h-16 flex flex-col gap-1 rounded-xl border-2 \${profile.qr_gradient?.colorStops?.[0]?.color === '#8b5cf6' ? 'border-amber-400 bg-amber-50' : 'border-transparent'}\`}
                    onClick={() => onChange({ 
                      qr_effect: null,
                      qr_foreground_color: '#8b5cf6',
                      qr_background_color: '#ffffff',
                      qr_dots_type: 'rounded',
                      qr_gradient: {
                        type: 'linear',
                        rotation: 135,
                        colorStops: [
                          { offset: 0, color: '#8b5cf6' },
                          { offset: 1, color: '#3b82f6' }
                        ]
                      }
                    })}
                  >
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-blue-500"></div>
                    <span className="text-[10px]">Galaxy</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className={\`h-16 flex flex-col gap-1 rounded-xl border-2 \${profile.qr_gradient?.type === 'radial' ? 'border-amber-400 bg-amber-50' : 'border-transparent'}\`}
                    onClick={() => onChange({ 
                      qr_effect: null,
                      qr_foreground_color: '#10b981',
                      qr_background_color: '#ffffff',
                      qr_dots_type: 'dots',
                      qr_gradient: {
                        type: 'radial',
                        colorStops: [
                          { offset: 0, color: '#10b981' },
                          { offset: 1, color: '#047857' }
                        ]
                      }
                    })}
                  >
                    <div className="w-5 h-5 rounded-full bg-[radial-gradient(circle_at_center,_#10b981_0%,_#047857_100%)]"></div>
                    <span className="text-[10px]">Emerald</span>
                  </Button>
                </div>
              </div>`;

code = code.replace(premiumEffectsOld, premiumEffectsNew);

fs.writeFileSync(file, code);
console.log("Updated ShareSection.tsx successfully.");
