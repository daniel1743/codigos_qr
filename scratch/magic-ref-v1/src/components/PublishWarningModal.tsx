import React from "react";
import { ImageOffIcon } from "lucide-react";
import { useEditor } from "../contexts/EditorContext";
import { Modal } from "./Modal";

export function PublishWarningModal() {
  const { publishWarning, setPublishWarning, reviewReferenceImages, products } = useEditor();
  const referenceCount = products.filter((p) => p.imageOrigin === "reference" && p.image).length;

  return (
    <Modal
      open={publishWarning}
      onClose={() => setPublishWarning(false)}
      label="Reemplaza las imágenes de referencia"
      width="max-w-md"
    >
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#FDF6EC]">
        <ImageOffIcon className="h-5 w-5 text-[#8A5A24]" strokeWidth={1.7} />
      </div>
      <h2 className="mt-4 pr-10 font-display text-[24px] leading-tight text-ink">
        Reemplaza las imágenes de referencia
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-body">
        Esta página contiene imágenes de referencia. Sustitúyelas por imágenes propias o que tengas
        autorización para utilizar antes de publicar.
      </p>
      <p className="mt-3 text-[13px] text-muted">
        {referenceCount === 1
          ? "1 producto usa una imagen de referencia."
          : `${referenceCount} productos usan imágenes de referencia.`}
      </p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => setPublishWarning(false)}
          className="h-11 rounded-xl border border-hairline px-5 text-[14px] font-medium text-body transition-colors duration-150 ease-premium hover:bg-[#F5F2ED] hover:text-ink"
        >
          Más tarde
        </button>
        <button
          type="button"
          onClick={reviewReferenceImages}
          className="h-11 rounded-xl bg-ink px-5 text-[14px] font-medium text-white transition-colors duration-150 ease-premium hover:bg-black"
        >
          Revisar imágenes
        </button>
      </div>
    </Modal>
  );
}
