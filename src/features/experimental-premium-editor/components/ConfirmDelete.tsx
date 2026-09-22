import React from 'react';
import { useEditor } from '../contexts/EditorContext';
import { Modal } from './Modal';

export function ConfirmDelete() {
  const { deleteId, requestDelete, confirmDelete, products } = useEditor();
  const product = products.find((p) => p.id === deleteId) ?? null;

  return (
    <Modal
      open={!!product}
      onClose={() => requestDelete(null)}
      label="Confirmar eliminación"
      width="max-w-md">
      
      {product &&
      <div>
          <h2 className="pr-10 font-display text-[24px] leading-tight text-ink">
            ¿Eliminar este producto?
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-body">
            Se quitará «{product.title}» del catálogo. Podrás deshacerlo justo después.
          </p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
            type="button"
            onClick={() => requestDelete(null)}
            className="h-11 rounded-xl border border-hairline px-5 text-[14px] font-medium text-body transition-colors duration-150 ease-premium hover:bg-[#F5F2ED] hover:text-ink">
            
              Cancelar
            </button>
            <button
            type="button"
            onClick={confirmDelete}
            className="h-11 rounded-xl bg-danger px-5 text-[14px] font-medium text-white transition-colors duration-150 ease-premium hover:bg-[#9C1F16]">
            
              Eliminar
            </button>
          </div>
        </div>
      }
    </Modal>);

}