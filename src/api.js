const API_BASE = "/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || "Error inesperado en la API");
  }

  return response.json();
}

export function createEvent(data) {
  return request("/events", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function getEvent(eventId) {
  return request(`/events/${eventId}`);
}

export function addParticipant(eventId, data) {
  return request(`/events/${eventId}/participants`, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function addExpense(eventId, data) {
  return request(`/events/${eventId}/expenses`, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function getSettlements(eventId) {
  return request(`/events/${eventId}/settlements`);
}
