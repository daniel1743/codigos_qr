/**
 * Graphite Atelier: espacio de prueba público, aislado y exclusivo de desarrollo.
 * Nunca utiliza la identidad ni los archivos de una persona real.
 */
import { trpc } from "@/lib/trpc";
import { AlertCircle, ArrowLeft, ArrowUpRight, FileText, FolderLock, LoaderCircle, ShieldCheck, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["application/pdf", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

function fileType(file: File) {
  if (file.type) return file.type;
  if (file.name.toLowerCase().endsWith(".docx")) return ACCEPTED_TYPES[2];
  if (file.name.toLowerCase().endsWith(".txt")) return "text/plain";
  return "application/pdf";
}

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

export default function DocumentsDemo() {
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const utils = trpc.useUtils();
  const documents = trpc.demoDocuments.list.useQuery();
  const upload = trpc.demoDocuments.upload.useMutation({
    onSuccess: async () => {
      await utils.demoDocuments.list.invalidate();
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Archivo almacenado en la bóveda de demostración.");
    },
    onError: (error) => toast.error(error.message || "No se pudo almacenar el archivo."),
  });
  const openDocument = trpc.demoDocuments.downloadUrl.useMutation({
    onSuccess: ({ url }) => window.open(url, "_blank", "noopener,noreferrer"),
    onError: (error) => toast.error(error.message || "No se pudo abrir el archivo."),
  });

  const chooseFile = (candidate?: File) => {
    if (!candidate) return;
    if (!ACCEPTED_TYPES.includes(fileType(candidate))) return toast.error("Elige un archivo PDF, TXT o DOCX.");
    if (candidate.size > MAX_FILE_BYTES) return toast.error("El archivo debe pesar como máximo 10 MB.");
    setFile(candidate);
  };

  const handleUpload = async () => {
    if (!file || upload.isPending) return;
    try {
      await upload.mutateAsync({ fileName: file.name, mimeType: fileType(file), byteSize: file.size, dataBase64: await readAsDataUrl(file) });
    } catch {
      // El callback de error comunica el motivo de la carga fallida.
    }
  };

  return (
    <main className="demo-vault-shell">
      <header className="demo-vault-bar">
        <button onClick={() => setLocation("/")}><ArrowLeft size={15} /> Volver a Cripqer</button>
        <span><i /> MODO DEMOSTRACIÓN / PÚBLICO / SOLO DESARROLLO</span>
      </header>
      <div className="document-vault">
        <header className="vault-header">
          <div>
            <p className="vault-register"><span /> CRIPQER / DOCUMENTOS SEGUROS</p>
            <h1>Prueba la bóveda.</h1>
            <p>Esta ruta pública de desarrollo usa un propietario técnico aislado para comprobar carga, persistencia y apertura. No cargues información sensible.</p>
          </div>
          <div className="vault-status"><ShieldCheck size={17} /><span>STORAGE CONECTADO</span></div>
        </header>
        <section className="vault-grid">
          <div className="vault-upload-card">
            <div className="vault-card-register">01 / CARGAR PRUEBA</div>
            <div className="upload-symbol"><UploadCloud size={27} /></div>
            <h2>Sube un archivo de prueba.</h2>
            <p>Admite PDF, TXT y DOCX. El límite es de 10 MB y los archivos quedan aislados del espacio de usuarios.</p>
            <input ref={fileInputRef} className="demo-file-input" aria-label="Seleccionar archivo de prueba" type="file" accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => chooseFile(event.target.files?.[0])} />
            {file && <div className="selected-file"><FileText size={18} /><div><b>{file.name}</b><span>{formatBytes(file.size)} · listo para probar</span></div><button onClick={() => setFile(null)} aria-label="Quitar archivo">×</button></div>}
            <button className="vault-upload-button" disabled={!file || upload.isPending} onClick={handleUpload}>
              {upload.isPending ? <LoaderCircle className="animate-spin" size={16} /> : <FolderLock size={16} />}
              {upload.isPending ? "Almacenando…" : "Guardar archivo de prueba"}
            </button>
          </div>
          <aside className="vault-protocol-card">
            <div className="vault-card-register">ALCANCE PÚBLICO</div>
            <h2>Ruta pública de prueba.</h2>
            <div className="protocol-step"><span>01</span><p>El archivo se guarda con el usuario técnico de demostración.</p></div>
            <div className="protocol-step"><span>02</span><p>Sus metadatos se persisten en la misma tabla de documentos.</p></div>
            <div className="protocol-step"><span>03</span><p>El modo se deshabilita automáticamente en producción.</p></div>
            <div className="protocol-note"><AlertCircle size={14} /> Esta ruta no exige autenticación; no cargues información sensible.</div>
          </aside>
        </section>
        <section className="vault-documents-section">
          <div className="vault-section-title"><div><p className="vault-register"><span /> 02 / ARCHIVOS DE PRUEBA</p><h2>Documentos almacenados.</h2></div><span>{documents.data?.length ?? 0} activos</span></div>
          {documents.isLoading ? <div className="vault-empty"><LoaderCircle className="animate-spin" size={22} /> Cargando archivos…</div> : documents.isError ? <div className="vault-empty error"><AlertCircle size={21} /> No pudimos cargar los archivos de prueba.</div> : documents.data?.length ? <div className="vault-document-list">{documents.data.map((document) => <article className="vault-document-row" key={document.id}><div className="document-icon"><FileText size={19} /></div><div className="document-name"><b>{document.fileName}</b><span>{document.mimeType === "application/pdf" ? "PDF" : document.mimeType === "text/plain" ? "TXT" : "DOCX"} · {formatBytes(document.byteSize)}</span></div><span className="document-protected"><ShieldCheck size={14} /> Aislado</span><button className="document-open" onClick={() => openDocument.mutate({ documentId: document.id })} disabled={openDocument.isPending}>{openDocument.isPending ? <LoaderCircle className="animate-spin" size={14} /> : <>Abrir <ArrowUpRight size={14} /></>}</button></article>)}</div> : <div className="vault-empty"><FolderLock size={24} /><div><b>La bóveda de prueba está preparada.</b><span>Sube un archivo para validar el almacenamiento.</span></div></div>}
        </section>
      </div>
    </main>
  );
}
