//  Botón reutilizable

type Props = {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties; 
};

export default function Button({ children, onClick, disabled, style }: Props) {
  return (
    <button
      className="button"
      onClick={onClick}
      disabled={disabled}
      style={style} 
    >
      {children}
    </button>
  );
}