interface Props {
  text: string;
  onClick: () => void;
  type?: "primary" | "danger" | "success";
}

export default function Button({ text, onClick, type = "primary" }: Props) {
  const styles = {
    primary: "bg-blue-500",
    danger: "bg-red-500",
    success: "bg-green-500",
  };

  return (
    <button
      onClick={onClick}
      className={`${styles[type]} text-white px-4 py-2 rounded`}
    >
      {text}
    </button>
  );
}