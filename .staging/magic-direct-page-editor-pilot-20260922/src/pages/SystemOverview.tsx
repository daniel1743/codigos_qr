import React from 'react';
import { TopBar } from '../components/editor/TopBar';
import { SystemSection } from '../components/system/SystemSection';
import { EditingModelDiagram } from '../components/system/EditingModelDiagram';
import { ContractTable } from '../components/system/ContractTable';
import { DirectionsGrid } from '../components/system/DirectionsGrid';
import { InventorySection } from '../components/system/InventorySection';
import { SelectionStates } from '../components/system/SelectionStates';
import { consistencyRules, mobileRules } from '../data/systemContent';

const toc = [
{ id: 'modelo', label: 'Modelo de edición' },
{ id: 'contrato', label: 'Contrato universal' },
{ id: 'direcciones', label: '3 direcciones' },
{ id: 'estados', label: 'Estados de selección' },
{ id: 'movil', label: 'Reglas móviles' },
{ id: 'inventario', label: 'Inventario' },
{ id: 'consistencia', label: 'Por qué es consistente' }];


const flow = [
{ title: 'Tocar', body: 'Cualquier cosa visible: texto, foto, botón, card, fondo.' },
{ title: 'Seleccionar', body: 'Un anillo fino marca el objeto. Solo uno a la vez.' },
{ title: 'Editar al instante', body: 'Barra flotante (escritorio) o sheet (móvil) con 3–5 acciones.' },
{ title: 'Más, si hace falta', body: 'Lo avanzado espera en el mismo sitio para todo.' }];


export function SystemOverview() {
  return (
    <div className="flex h-full w-full flex-col bg-[#F7F8FA]">
      <TopBar />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-12 lg:grid-cols-[200px_1fr] lg:px-10">
          <nav className="hidden lg:block" aria-label="Contenido">
            <ul className="sticky top-8 space-y-1 text-[13px]">
              {toc.map((t) =>
              <li key={t.id}>
                  <a href={`#${t.id}`} className="block rounded-lg px-3 py-1.5 text-mute transition-colors duration-150 hover:bg-white hover:text-ink">
                    {t.label}
                  </a>
                </li>
              )}
            </ul>
          </nav>

          <main className="min-w-0 space-y-16">
            <header>
              <p className="text-[13px] font-medium text-select">Direct Page Editor · Sistema visual v1</p>
              <h1 className="mt-4 max-w-[860px] text-[40px] font-semibold leading-[1.08] tracking-[-0.02em] text-ink md:text-[52px]">
                Cripqer no le muestra un editor al usuario. Le muestra su página, y la página se deja editar.
              </h1>
              <p className="mt-5 max-w-[640px] text-[16px] leading-relaxed text-mute">
                Una sola gramática de edición directa —tocar, seleccionar, editar— aplicada a tres plantillas muy distintas. Si el usuario lo ve, puede tocarlo.
              </p>
              <ol className="mt-10 grid gap-6 border-t border-line pt-6 sm:grid-cols-2 lg:grid-cols-4">
                {flow.map((f, i) =>
                <li key={f.title}>
                    <span className="text-[13px] font-semibold tabular-nums text-select">{i + 1}</span>
                    <p className="mt-1 text-[15px] font-semibold text-ink">{f.title}</p>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-mute">{f.body}</p>
                  </li>
                )}
              </ol>
            </header>

            <SystemSection id="modelo" title="Modelo de edición" intro="El mismo contrato de texto, en las dos superficies. La barra flotante sigue la referencia canónica: compacta, junto al objeto, con «Más» para lo avanzado.">
              <EditingModelDiagram />
            </SystemSection>

            <SystemSection id="contrato" title="Contrato universal de edición" intro="Qué ocurre al tocar cada tipo de elemento. Idéntico en las tres plantillas y en escritorio y móvil.">
              <ContractTable />
            </SystemSection>

            <SystemSection id="direcciones" title="Tres direcciones, un editor" intro="Visualmente opuestas —crema editorial, clínica en petróleo y arena, portfolio negro— y editables exactamente igual. Abre cualquiera y usa la barra «Estados» para recorrer cada estado requerido.">
              <DirectionsGrid />
            </SystemSection>

            <SystemSection id="estados" title="Estados de selección" intro="Sutiles pero obvios. La selección se dibuja por encima de la página, así que nunca mueve ni ensucia el diseño.">
              <SelectionStates />
            </SystemSection>

            <SystemSection id="movil" title="Reglas móviles" intro="En móvil nada flota sobre contenido diminuto: el objeto queda seleccionado y visible, y las acciones suben en un sheet.">
              <ul className="grid gap-x-10 sm:grid-cols-2">
                {mobileRules.map((r) =>
                <li key={r} className="border-t border-line py-3.5 text-[14px] text-ink">
                    {r}
                  </li>
                )}
              </ul>
            </SystemSection>

            <SystemSection id="inventario" title="Inventario de componentes">
              <InventorySection />
            </SystemSection>

            <SystemSection id="consistencia" title="Por qué el modelo flotante se mantiene idéntico">
              <div className="grid gap-x-12 gap-y-8 md:grid-cols-2">
                {consistencyRules.map((r) =>
                <div key={r.title}>
                    <h3 className="text-[15px] font-semibold text-ink">{r.title}</h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-mute">{r.body}</p>
                  </div>
                )}
              </div>
            </SystemSection>
          </main>
        </div>
      </div>
    </div>);

}