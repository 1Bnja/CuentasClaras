import { useMemo, useState } from "react";

const initialForm = {
  title: "",
  amount: "",
  paid_by_user_id: "",
  participant_user_ids: []
};

export default function AddExpenseForm({ participants, open, onClose, onSubmit }) {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    return (
      form.title.trim().length >= 2 &&
      Number(form.amount) > 0 &&
      Number(form.paid_by_user_id) > 0 &&
      form.participant_user_ids.length > 0
    );
  }, [form]);

  const handleConsumerToggle = (userId) => {
    setForm((prev) => {
      const exists = prev.participant_user_ids.includes(userId);
      return {
        ...prev,
        participant_user_ids: exists
          ? prev.participant_user_ids.filter((id) => id !== userId)
          : [...prev.participant_user_ids, userId]
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError("");

    try {
      await onSubmit({
        title: form.title.trim(),
        amount: Number(form.amount),
        paid_by_user_id: Number(form.paid_by_user_id),
        participant_user_ids: form.participant_user_ids
      });

      setForm(initialForm);
      onClose();
    } catch (err) {
      setError(err.message || "No se pudo guardar el gasto");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/35 md:items-center md:justify-center">
      <div className="w-full rounded-t-3xl bg-sand p-5 shadow-xl md:max-w-lg md:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-2xl">Nuevo gasto</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-fog px-3 py-1 text-sm font-semibold"
          >
            Cerrar
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Concepto</span>
            <input
              className="w-full rounded-xl border border-fog bg-white px-3 py-2"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Ej: Asado"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Monto</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-xl border border-fog bg-white px-3 py-2"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              placeholder="30000"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Pagado por</span>
            <select
              className="w-full rounded-xl border border-fog bg-white px-3 py-2"
              value={form.paid_by_user_id}
              onChange={(e) => setForm((prev) => ({ ...prev, paid_by_user_id: e.target.value }))}
            >
              <option value="">Selecciona un participante</option>
              {participants.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>

          <div>
            <p className="mb-2 text-sm font-semibold">Participaron en este gasto</p>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-fog bg-white p-3">
              {participants.map((person) => {
                const checked = form.participant_user_ids.includes(person.id);
                return (
                  <label key={person.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleConsumerToggle(person.id)}
                    />
                    <span>{person.name}</span>
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-ink/70">
              Si alguien no consumio (ej: Maria no comio carne), solo desmarcalo.
            </p>
          </div>

          {error && <p className="text-sm font-medium text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="w-full rounded-xl bg-clay px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar gasto"}
          </button>
        </form>
      </div>
    </div>
  );
}
