import { useEffect, useState } from "react";
import { api } from "../utils/api";
import Button from "../components/Button";
import Card from "../components/Card";
import { useNavigate } from "react-router-dom";
import type { Conversion } from "../types";

export default function DashboardPage() {
  const [files, setFiles] = useState<Conversion[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.getFiles().then(setFiles).catch(console.error);
  }, []);

  const statusLabel: Record<string, string> = {
    pending: "Pending",
    processing: "Processing",
    completed: "Completed",
    failed: "Failed",
  };

  return (
    <div className="container">
      <h1>Conversiones recientes</h1>

      <Button onClick={() => navigate("/convert")}>
        Nueva conversión
      </Button>

      <br /><br />

      <div className="grid grid-3">
        {files.map((file) => (
          <Card key={file.conversionId} onClick={() => navigate(`/conversion/${file.conversionId}`)}>
            <h3>{file.sourceFileName}</h3>
            <p>{file.sourceFormat.toUpperCase()} → {file.targetFormat.toUpperCase()}</p>
            <p>{statusLabel[file.status] ?? file.status}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}