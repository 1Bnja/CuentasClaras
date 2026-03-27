import { useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";

import { createEvent } from "./api";
import EventView from "./pages/EventView";

function HomePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateEvent = async (event) => {
    event.preventDefault();
    setError("");

    if (title.trim().length < 2 || creator.trim().length < 1) {
      setError("Completa nombre del evento y creador");
      return;
    }

    try {
      setLoading(true);
      const response = await createEvent({ title: title.trim(), creator_name: creator.trim() });
      navigate(`/event/${response.event_id}`);
    } catch (err) {
      setError(err.message || "No se pudo crear el evento");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = (event) => {
    event.preventDefault();
    if (!joinCode.trim()) return;
    navigate(`/event/${joinCode.trim()}`);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-8">
      <section className="w-full rounded-3xl bg-white/80 p-6 shadow-lg backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Cuentas Claras</p>
        <h1 className="mt-1 font-display text-4xl leading-tight md:text-5xl">Dividan gastos sin discusiones</h1>
        <p className="mt-3 text-sm text-ink/80">
          Carga quien pago cada gasto y exactamente quienes consumieron. La app liquida de forma asimetrica.
        </p>

        <form onSubmit={handleCreateEvent} className="mt-6 space-y-3">
          <input
            className="w-full rounded-xl border border-fog bg-white px-4 py-3"
            placeholder="Nombre del evento (ej: Asado sabado)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-fog bg-white px-4 py-3"
            placeholder="Tu nombre"
            value={creator}
            onChange={(e) => setCreator(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-clay px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Creando..." : "Crear evento"}
          </button>
        </form>

        <form onSubmit={handleJoin} className="mt-6 border-t border-fog pt-5">
          <p className="mb-2 text-sm font-semibold">Ya tienes un link?</p>
          <div className="flex gap-2">
            <input
              className="w-full rounded-xl border border-fog bg-white px-4 py-3"
              placeholder="Pega el ID del evento"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
            />
            <button className="rounded-xl bg-pine px-4 py-3 font-semibold text-white">Entrar</button>
          </div>
        </form>

        {error && <p className="mt-4 text-sm font-medium text-red-700">{error}</p>}
      </section>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/event/:eventId" element={<EventView />} />
    </Routes>
  );
}
