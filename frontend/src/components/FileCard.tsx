import Card from "./Card";

type Props = {
  file: any;
};

export default function FileCard({ file }: Props) {
  const getStatus = () => {
    switch (file.status) {
      case "pending":
        return "Pendiente";
      case "processing":
        return "Procesando";
      case "completed":
        return "Completado";
      case "failed":
        return "Error";
      default:
        return "Desconocido";
    }
  };

  return (
    <Card>
      <h3>{file.fileName}</h3>
      <p>{getStatus()}</p>
    </Card>
  );
}