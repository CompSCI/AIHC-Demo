const BASE = "/api";

async function handleResponse(res) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

// ------- Patients -------

export async function getPatients() {
  const res = await fetch(`${BASE}/patients`);
  return handleResponse(res);
}

export async function getPatient(id) {
  const res = await fetch(`${BASE}/patients/${id}`);
  return handleResponse(res);
}

export async function createPatient(data) {
  const res = await fetch(`${BASE}/patients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updatePatient(id, data) {
  const res = await fetch(`${BASE}/patients/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deletePatient(id) {
  const res = await fetch(`${BASE}/patients/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
}

// ------- Doctors -------

export async function getDoctors() {
  const res = await fetch(`${BASE}/doctors`);
  return handleResponse(res);
}

export async function getDoctor(id) {
  const res = await fetch(`${BASE}/doctors/${id}`);
  return handleResponse(res);
}

export async function createDoctor(data) {
  const res = await fetch(`${BASE}/doctors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateDoctor(id, data) {
  const res = await fetch(`${BASE}/doctors/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteDoctor(id) {
  const res = await fetch(`${BASE}/doctors/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
}

// ------- Appointments -------

export async function getAppointments(patientId, doctorId) {
  const params = new URLSearchParams();
  if (patientId != null) params.set("patientId", String(patientId));
  if (doctorId != null) params.set("doctorId", String(doctorId));

  const query = params.toString();
  const res = await fetch(`${BASE}/appointments${query ? `?${query}` : ""}`);
  return handleResponse(res);
}

export async function getAppointment(id) {
  const res = await fetch(`${BASE}/appointments/${id}`);
  return handleResponse(res);
}

export async function createAppointment(data) {
  const res = await fetch(`${BASE}/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateAppointment(id, data) {
  const res = await fetch(`${BASE}/appointments/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteAppointment(id) {
  const res = await fetch(`${BASE}/appointments/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
}
