/**
 * Graphite Atelier: bóveda protegida para cargar, enumerar y abrir documentos del usuario.
 * Los archivos se guardan en storage; esta página sólo opera sobre metadatos y enlaces autorizados.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { AlertCircle, ArrowUpRight, FileText, FolderLock, LoaderCircle, ShieldCheck, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function getFileType(file: File) {
  if (file.type) return file.type;
  if (file.name.toLowerCase().endsWith(".docx")) return ACCEPTED_TYPES[2];
  if (file.name.toLowerCase().endsWith(".txt")) return "text/plain";
  return "application/pdf";
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

export default function Documents() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const utils = trpc.useUtils();
  const documents = trpc.documents.list.useQuery();
  const upload = trpc.documents.upload.useMutation({
    onSuccess: async () => {
      await utils.documents.list.invalidate();
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Documento protegido y almacenado.");
    },
    onError: (error) => toast.error(error.message || "No se pudo almacenar el documento."),
  });
  const openDocument = trpc.documents.downloadUrl.useMutation({
    onSuccess: ({ url }) => window.open(url, "_blank", "noopener,noreferrer"),
    onError: (error) => toast.error(error.message || "No se pudo abrir el documento."),
  });

  const chooseFile = (candidate?: File) => {
    if (!candidate) return;
    if (!ACCEPTED_TYPES.includes(getFileType(candidate))) {
      toast.error("Elige un archivo PDF, TXT o DOCX.");
      return;
    }
    if (candidate.size > MAX_FILE_BYTES) {
      toast.error("El archivo debe pesar como máximo 10 MB.");
      return;
    }
    setFile(candidate);
  };

  const handleUpload = async () => {
    if (!file || upload.isPending) return;
    try {
      await upload.mutateAsync({
        fileName: file.name,
        mimeType: getFileType(file),
        byteSize: file.size,
        dataBase64: await readAsDataUrl(file),
      });
    } catch {
      // El mensaje se comunica mediante el callback de la mutación.
    }
  };

  return (
    <DashboardLayout>
      <div className="document-vault">
        <header className="vault-header">
          <div>
            <p className="vault-register"><span /> CRIPQER / DOCUMENTOS SEGUROS</p>
            <h1>Tu bóveda de documentos.</h1>
            <p>Sube archivos a tu espacio privado y abre cada documento mediante un acceso autorizado.</p>
          </div>
          <div className="vault-status"><ShieldCheck size={17} /><span>STORAGE CONECTADO</span></div>
        </header>

        <section className="vault-grid">
          <div className="vault-upload-card">
            <div className="vault-card-register">01 / CARGAR</div>
            <div className="upload-symbol"><UploadCloud size={27} /></div>
            <h2>Protege un nuevo archivo.</h2>
            <p>Formatos permitidos: PDF, TXT y DOCX. Máximo 10 MB por documento.</p>
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => chooseFile(event.target.files?.[0])}
            />
            <button className="vault-select-button" onClick={() => fileInputRef.current?.click()}>
              Seleccionar archivo <ArrowUpRight size={16} />
            </button>
            {file && (
              <div className="selected-file">
                <FileText size={18} />
                <div><b>{file.name}</b><span>{formatBytes(file.size)} · listo para almacenar</span></div>
                <button onClick={() => setFile(null)} aria-label="Quitar archivo">×</button>
              </div>
            )}
            <button className="vault-upload-button" disabled={!file || upload.isPending} onClick={handleUpload}>
              {upload.isPending ? <LoaderCircle className="animate-spin" size={16} /> : <FolderLock size={16} />}
              {upload.isPending ? "Almacenando…" : "Guardar en Documentos Seguros"}
            </button>
          </div>

          <aside className="vault-protocol-card">
            <div className="vault-card-register">PROTOCOLO</div>
            <h2>Propiedad y acceso.</h2>
            <div className="protocol-step"><span>01</span><p>El archivo se carga en el almacenamiento del proyecto.</p></div>
            <div className="protocol-step"><span>02</span><p>Cripqer guarda su nombre, tipo, tamaño y propietario.</p></div>
            <div className="protocol-step"><span>03</span><p>Solo tu sesión puede solicitar el enlace temporal de apertura.</p></div>
            <div className="protocol-note"><AlertCircle size={14} /> Esta primera versión no incluye contraseñas ni vencimientos por archivo.</div>
          </aside>
        </section>

        <section className="vault-documents-section">
          <div className="vault-section-title"><div><p className="vault-register"><span /> 02 / DOCUMENTOS</p><h2>Archivos de tu espacio.</h2></div><span>{documents.data?.length ?? 0} activos</span></div>
          {documents.isLoading ? (
            <div className="vault-empty"><LoaderCircle className="animate-spin" size={22} /> Cargando documentos…</div>
          ) : documents.isError ? (
            <div className="vault-empty error"><AlertCircle size={21} /> No pudimos cargar tus documentos. Inténtalo de nuevo.</div>
          ) : documents.data?.length ? (
            <div className="vault-document-list">
              {documents.data.map((document) => (
                <article className="vault-document-row" key={document.id}>
                  <div className="document-icon"><FileText size={19} /></div>
                  <div className="document-name"><b>{document.fileName}</b><span>{document.mimeType === "application/pdf" ? "PDF" : document.mimeType === "text/plain" ? "TXT" : "DOCX"} · {formatBytes(document.byteSize)} · {formatDate(document.createdAt)}</span></div>
                  <span className="document-protected"><ShieldCheck size={14} /> Protegido</span>
                  <button className="document-open" onClick={() => openDocument.mutate({ documentId: document.id })} disabled={openDocument.isPending}>
                    {openDocument.isPending ? <LoaderCircle className="animate-spin" size={14} /> : <>Abrir <ArrowUpRight size={14} /></>}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="vault-empty"><FolderLock size={24} /><div><b>Tu espacio está listo.</b><span>El primer documento que subas aparecerá aquí.</span></div></div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
