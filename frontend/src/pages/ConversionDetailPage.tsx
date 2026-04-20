import { useEffect, useState } from "react";

type Status = "pending" | "processing" | "completed" | "failed";

export default function ConversionDetailPage() {
  const [status, setStatus] = useState<Status>("pending");

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus((prev) => {
        if (prev === "pending") return "processing";
        if (prev === "processing") return "completed";
        return prev;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const statusText: Record<Status, string> = {
    pending: "Pendiente",
    processing: "Procesando",
    completed: "Completado",
    failed: "Error",
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Estado de conversión</h2>
        <p>{statusText[status]}</p>
      </div>
    </div>
  );
}