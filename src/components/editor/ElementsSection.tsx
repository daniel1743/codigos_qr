export function ElementsSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Elementos</h2>
        <p className="text-sm text-muted-foreground">Añade elementos decorativos a tu página.</p>
      </div>

      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-xl text-center space-y-3">
        <div className="bg-primary/10 p-3 rounded-full">
          <svg
            className="w-6 h-6 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Próximamente</p>
          <p className="text-xs text-muted-foreground">Los elementos decorativos estarán disponibles en futuras actualizaciones.</p>
        </div>
      </div>
    </div>
  );
}
