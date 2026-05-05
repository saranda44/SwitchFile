import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../utils/api";
import type { Conversion } from "../types";

const statusLabel: Record<string, string> = {
  pending: "Pendiente",
  processing: "Procesando",
  completed: "Completado",
  failed: "Error",
};

export default function ConversionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [conversion, setConversion] = useState<Conversion | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.getFileById(id).then(setConversion).catch(() => setError("No se pudo cargar la conversión."));
  }, [id]);

  if (error) return <div className="container"><p>{error}</p></div>;
  if (!conversion) return <div className="container"><p>Cargando...</p></div>;

  return (
    <div className="container">
      <div className="card">
        <h2>Estado de conversión</h2>
        <p><strong>Archivo:</strong> {conversion.sourceFileName}</p>
        <p><strong>Formato:</strong> {conversion.sourceFormat.toUpperCase()} → {conversion.targetFormat.toUpperCase()}</p>
        <p><strong>Estado:</strong> {statusLabel[conversion.status] ?? conversion.status}</p>
        {conversion.errorMessage && <p><strong>Error:</strong> {conversion.errorMessage}</p>}
        <p><strong>Creado:</strong> {new Date(conversion.createdAt).toLocaleString()}</p>
        {conversion.isBatch && conversion.batchId && (
          <p><strong>Batch ID:</strong> {conversion.batchId}</p>
        )}
      </div>
    </div>
  );
}
