import { useEffect, useState } from "react";

interface Field {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  helpText?: string;
  options?: { label: string; value: string }[];
}

interface Props {
  fields: Field[];
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel?: () => void;
}

export default function Form({ fields, initialData, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    setForm(initialData || {});
  }, [initialData]);

  const handleChange = (e: any) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-4"
    >
      {fields.map((field) => (
        <div key={field.name}>
          <label
            htmlFor={field.name}
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            {field.label}
          </label>

          {field.type === "select" ? (
            <select
              id={field.name}
              name={field.name}
              value={form[field.name] || ""}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="">Seleccione...</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : field.type === "checkbox-group" ? (
            <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-lg border border-gray-200 p-3">
              {field.options?.map((opt) => {
                const selected: string[] = Array.isArray(form[field.name]) ? form[field.name] : [];
                const checked = selected.includes(opt.value);

                return (
                  <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = checked
                          ? selected.filter((value) => value !== opt.value)
                          : [...selected, opt.value];

                        setForm({ ...form, [field.name]: next });
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500/30"
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>
          ) : (
            <input
              id={field.name}
              name={field.name}
              type={field.type && field.type !== "select" ? field.type : "text"}
              placeholder={field.placeholder}
              value={form[field.name] || ""}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          )}

          {field.helpText && (
            <p className="mt-1 text-xs text-gray-400">{field.helpText}</p>
          )}
        </div>
      ))}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            Cancelar
          </button>
        )}

        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
        >
          Guardar
        </button>
      </div>
    </form>
  );
}
