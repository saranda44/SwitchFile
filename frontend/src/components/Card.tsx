type Props = {
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
};

export default function Card({ children, onClick, style }: Props) {
  return <div className="card" onClick={onClick} style={style}>{children}</div>;
}