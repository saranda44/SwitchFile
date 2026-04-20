import { useEffect, useState } from "react";
import { api } from "../utils/api";
import Button from "../components/Button";
import Card from "../components/Card";
import { useNavigate } from "react-router-dom";

export default function DashboardPage() {
  const [files, setFiles] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.getFiles()
      .then(setFiles)
      .catch(() => {
        setFiles([
          { id: "1", fileName: "video.mp4", status: "processing" },
          { id: "2", fileName: "imagen.png", status: "completed" },
        ]);
      });
  }, []);

  const getStatus = (status: string) => {
    return {
      pending: "Pending",
      processing: "Processing",
      completed: "Completed",
      failed: "Failed",
    }[status] || "Desconocido";
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
          <Card key={file.id}>
            <h3>{file.fileName}</h3>
            <p>{getStatus(file.status)}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}