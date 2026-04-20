//  Botón reutilizable

type Props = {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
};

export default function Button({ children, onClick }: Props) {
  return (
    <button className="button" onClick={onClick}>
      {children}
    </button>
  );
}