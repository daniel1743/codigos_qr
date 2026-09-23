import React from 'react';
import { editingContract } from '../../data/systemContent';
import { kindIcons } from '../editor/editorAction';

export function ContractTable() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full min-w-[760px] text-left text-[13.5px]">
        <thead>
          <tr className="border-b border-line bg-[#F7F8FA] text-[12px] text-mute">
            <th className="px-5 py-3 font-medium">Elemento</th>
            <th className="px-5 py-3 font-medium">Al tocarlo</th>
            <th className="px-5 py-3 font-medium">Acciones directas (escritorio y móvil)</th>
            <th className="px-5 py-3 font-medium">Solo móvil</th>
          </tr>
        </thead>
        <tbody>
          {editingContract.map((row) => {
            const Icon = kindIcons[row.kind];
            return (
              <tr key={row.kind} className="border-b border-line last:border-0">
                <td className="whitespace-nowrap px-5 py-3.5">
                  <span className="flex items-center gap-2.5 font-medium text-ink">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-select-soft text-select">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {row.element}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-mute">{row.tap}</td>
                <td className="px-5 py-3.5">
                  <span className="flex flex-wrap gap-1.5">
                    {row.actions.map((a) =>
                    <span key={a} className={a === 'Más' ? 'rounded-md border border-line px-2 py-0.5 text-[12px] text-mute' : 'rounded-md bg-[#F2F3F5] px-2 py-0.5 text-[12px] font-medium text-ink'}>
                        {a}
                      </span>
                    )}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-[12.5px] text-mute">{row.mobileExtra ?? '—'}</td>
              </tr>);

          })}
        </tbody>
      </table>
    </div>);

}