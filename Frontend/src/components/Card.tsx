interface Props {
  title: string;
  value: number | string;
  icon: string;
}

export default function Card({title, value,}: 
  {
  title: string;
  value?: number;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-5 hover:shadow-lg transition">
      <h2 className="text-gray-500 text-sm">{title}</h2>
      <p className="text-3xl font-bold mt-2">
        {value ?? 0}
      </p>
    </div>
  );
}