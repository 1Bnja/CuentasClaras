import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { addExpense, addParticipant, getEvent, getSettlements } from "../api";
import AddExpenseForm from "../components/AddExpenseForm";

export default function EventView() {
  const { eventId } = useParams();
  const [eventData, setEventData] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [newParticipant, setNewParticipant] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const shareLink = useMemo(() => `${window.location.origin}/event/${eventId}`, [eventId]);

  const refreshData = async () => {
    const [eventResult, settlementResult] = await Promise.all([getEvent(eventId), getSettlements(eventId)]);
    setEventData(eventResult);
    setSettlements(settlementResult.settlements);
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const [eventResult, settlementResult] = await Promise.all([getEvent(eventId), getSettlements(eventId)]);
        if (!mounted) return;
        setEventData(eventResult);
        setSettlements(settlementResult.settlements);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "No se pudo cargar el evento");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [eventId]);

  const handleAddParticipant = async (event) => {
    event.preventDefault();
    if (newParticipant.trim().length < 1) return;

    await addParticipant(eventId, { name: newParticipant.trim() });
    setNewParticipant("");
    await refreshData();
  };

  const handleAddExpense = async (payload) => {
    await addExpense(eventId, payload);
    await refreshData();
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareLink);
    alert("Link copiado");
  };

  if (loading) {
    return <div className="p-6 text-center font-medium">Cargando evento...</div>;
  }

  if (error) {
    return <div className="p-6 text-center font-medium text-red-700">{error}</div>;
  }

  if (!eventData) {
    return <div className="p-6 text-center">Evento no encontrado</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-5 pb-24 md:px-8">
      <header className="rounded-3xl bg-white/80 p-5 shadow-sm backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-wide text-pine">Evento</p>
        <h1 className="font-display text-4xl leading-tight">{eventData.title}</h1>
        <div className="mt-3 flex flex-col gap-2 text-sm md:flex-row md:items-center">
          <button onClick={copyLink} className="rounded-lg bg-pine px-3 py-2 font-semibold text-white">
            Copiar link del evento
          </button>
          <span className="truncate text-ink/70">{shareLink}</span>
        </div>
      </header>

      <section className="mt-5 rounded-3xl bg-white/80 p-5 shadow-sm backdrop-blur">
        <h2 className="font-display text-2xl">Participantes</h2>
        <form onSubmit={handleAddParticipant} className="mt-3 flex gap-2">
          <input
            className="w-full rounded-xl border border-fog bg-white px-3 py-2"
            placeholder="Nombre"
            value={newParticipant}
            onChange={(e) => setNewParticipant(e.target.value)}
          />
          <button className="rounded-xl bg-clay px-4 py-2 font-semibold text-white">Agregar</button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {eventData.participants.map((person) => (
            <span key={person.id} className="rounded-full bg-accent-soft px-3 py-1 text-sm font-medium">
              {person.name}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-3xl bg-white/80 p-5 shadow-sm backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-2xl">Gastos</h2>
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-xl bg-clay px-4 py-2 text-sm font-semibold text-white"
          >
            + Nuevo gasto
          </button>
        </div>

        <div className="space-y-2">
          {eventData.expenses.length === 0 && (
            <p className="text-sm text-ink/70">Aun no hay gastos cargados.</p>
          )}

          {eventData.expenses.map((expense) => {
            const payerName =
              eventData.participants.find((p) => p.id === expense.paid_by_user_id)?.name || "Desconocido";
            return (
              <article key={expense.id} className="rounded-xl border border-fog bg-white p-3">
                <h3 className="font-semibold">{expense.title}</h3>
                <p className="text-sm text-ink/80">
                  ${expense.amount.toLocaleString("es-AR")} pagado por {payerName}
                </p>
                <p className="text-xs text-ink/60">
                  Participaron: {expense.participant_user_ids.length} persona(s)
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-5 rounded-3xl bg-white/80 p-5 shadow-sm backdrop-blur">
        <h2 className="font-display text-2xl">Liquidacion final</h2>
        <div className="mt-3 space-y-2">
          {settlements.length === 0 && <p className="text-sm text-ink/70">No hay deudas pendientes.</p>}
          {settlements.map((row, index) => (
            <div key={`${row.from_user_id}-${row.to_user_id}-${index}`} className="rounded-xl bg-fog px-3 py-2 text-sm">
              <span className="font-semibold">{row.from_user_name}</span> le paga{" "}
              <span className="font-semibold">${row.amount.toLocaleString("es-AR")}</span> a{" "}
              <span className="font-semibold">{row.to_user_name}</span>
            </div>
          ))}
        </div>
      </section>

      <AddExpenseForm
        participants={eventData.participants}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddExpense}
      />
    </div>
  );
}
