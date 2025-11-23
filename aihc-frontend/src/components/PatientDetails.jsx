import { Show, For, createSignal, createEffect, createMemo } from "solid-js";
import { sanitizeText } from "../utils/sanitizeText";

const PatientDetails = (props) => {
  const [isEditing, setIsEditing] = createSignal(false);

  // Local edit form state
  const [name, setName] = createSignal("");
  const [age, setAge] = createSignal("");
  const [gender, setGender] = createSignal("");
  const [history, setHistory] = createSignal("");

  // Per-field validation error state (edit patient form – all required)
  const [nameError, setNameError] = createSignal(false);
  const [ageError, setAgeError] = createSignal(false);
  const [genderError, setGenderError] = createSignal(false);
  const [historyError, setHistoryError] = createSignal(false);
  const [highlightPatientForm, setHighlightPatientForm] = createSignal(false);

  // Appointment form
  const [doctorId, setDoctorId] = createSignal("");
  const [dateTime, setDateTime] = createSignal("");
  const [reason, setReason] = createSignal("");

  const [highlightAppointmentForm, setHighlightAppointmentForm] =
    createSignal(false);

  // Appointment: filter doctors by specialty
  const [selectedSpecialty, setSelectedSpecialty] = createSignal("");

  const specialtyOptions = createMemo(() => {
    const list = props.doctors || [];
    const set = new Set();
    for (const d of list) {
      if (d.specialty) set.add(d.specialty);
    }
    return Array.from(set).sort();
  });

  const filteredDoctorsForAppt = createMemo(() => {
    const list = props.doctors || [];
    const spec = selectedSpecialty();
    const currentIdNum = Number(doctorId() || 0);

    // Base list (by specialty if chosen, otherwise all)
    let base;
    if (!spec) {
      base = list;
    } else {
      base = list.filter((d) => d.specialty === spec);
    }

    // If we have a selected doctor (especially while editing),
    // make absolutely sure they're in the list
    if (currentIdNum) {
      const current = list.find((d) => Number(d.id) === currentIdNum);
      if (current && !base.some((d) => Number(d.id) === currentIdNum)) {
        base = [...base, current];
      }
    }

    return base;
  });

  const sortedFilteredDoctors = createMemo(() => {
    const arr = [...filteredDoctorsForAppt()];

    const normalizeName = (raw) => {
      if (!raw) return { first: "", last: "" };

      // Remove common prefixes/titles
      const cleaned = raw
        .replace(/^dr\.?\s+/i, "")
        .replace(/^doctor\s+/i, "")
        .trim();

      const parts = cleaned.split(/\s+/);

      if (parts.length === 1) {
        return { first: parts[0], last: parts[0] }; // single-word fallback
      }

      const last = parts[parts.length - 1];
      const first = parts[parts.length - 2]; // second-to-last word

      return { first, last };
    };

    return arr.sort((a, b) => {
      const A = normalizeName(a.name);
      const B = normalizeName(b.name);

      // Sort by last name
      const lastCmp = A.last.localeCompare(B.last);
      if (lastCmp !== 0) return lastCmp;

      // Then by first name
      return A.first.localeCompare(B.first);
    });
  });

  // Appointment validation error state (required fields)
  const [apptDoctorError, setApptDoctorError] = createSignal(false);
  const [apptDateError, setApptDateError] = createSignal(false);
  const [apptTimeError, setApptTimeError] = createSignal(false);
  const [apptReasonError, setApptReasonError] = createSignal(false);

  // NEW: track editing appointment (null = creating a new one)
  const [editingAppointmentId, setEditingAppointmentId] = createSignal(null);

  // Date/time pieces for 15-min slots
  const [datePart, setDatePart] = createSignal("");
  const [timePart, setTimePart] = createSignal("");

  // Conflict warning state (double-booking)
  const [hasConflictWarning, setHasConflictWarning] = createSignal(false);
  const [pendingApptId, setPendingApptId] = createSignal(null);
  const [pendingApptPayload, setPendingApptPayload] = createSignal(null);

  // Delete confirmation state for appointments
  const [pendingDeleteApptId, setPendingDeleteApptId] = createSignal(null);

  // Pre-generate 15-minute time slots
  const timeSlots = Array.from({ length: 24 * 4 }, (_, i) => {
    const h = Math.floor(i / 4);
    const m = (i % 4) * 15;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  });

  const to15MinSlot = (d) => {
    if (!(d instanceof Date) || isNaN(d.getTime())) return null;

    let hours = d.getHours();
    let minutes = d.getMinutes();
    let totalMinutes = hours * 60 + minutes;

    let snappedTotal = Math.ceil(totalMinutes / 15) * 15;
    const maxTotal = 23 * 60 + 45;
    if (snappedTotal > maxTotal) snappedTotal = maxTotal;

    hours = Math.floor(snappedTotal / 60);
    minutes = snappedTotal % 60;

    const hh = String(hours).padStart(2, "0");
    const mi = String(minutes).padStart(2, "0");
    return `${hh}:${mi}`;
  };

  const updateDateTime = () => {
    if (!datePart() || !timePart()) return;
    setDateTime(`${datePart()}T${timePart()}`);
  };

  // --- compute unavailable time slots for selected doctor on selected day ---
  const unavailableSlots = createMemo(() => {
    const all = props.allAppointments || [];
    const docId = Number(doctorId());
    const dPart = datePart();

    if (!docId || !dPart) return new Set();

    const set = new Set();

    for (const appt of all) {
      if (Number(appt.doctorId) !== docId) continue;

      // Skip the appointment we’re currently editing (its slot stays usable)
      if (editingAppointmentId() && appt.id === editingAppointmentId()) {
        continue;
      }

      const dt = new Date(appt.dateTime);
      if (Number.isNaN(dt.getTime())) continue;

      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, "0");
      const dd = String(dt.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      if (dateStr !== dPart) continue;

      const hh = String(dt.getHours()).padStart(2, "0");
      const mi = String(dt.getMinutes()).padStart(2, "0");
      const timeStr = `${hh}:${mi}`;
      set.add(timeStr);
    }

    return set;
  });

  // Labels for fields currently missing/invalid in the edit form
  const missingFields = createMemo(() => {
    const list = [];
    if (nameError()) list.push("Name");
    if (ageError()) list.push("Age");
    if (genderError()) list.push("Gender");
    if (historyError()) list.push("Medical history / notes");
    return list;
  });

  // Labels for missing fields in appointment form
  const missingApptFields = createMemo(() => {
    const list = [];
    if (apptDoctorError()) list.push("Doctor");
    if (apptDateError()) list.push("Date");
    if (apptTimeError()) list.push("Time");
    if (apptReasonError()) list.push("Reason");
    return list;
  });

  // Sync form with patient when patient changes
  createEffect(() => {
    const p = props.patient;

    if (!p) {
      setName("");
      setAge("");
      setGender("");
      setHistory("");

      // clear validation errors
      setNameError(false);
      setAgeError(false);
      setGenderError(false);
      setHistoryError(false);

      // clear appointment + validation state
      setDoctorId("");
      setDatePart("");
      setTimePart("");
      setDateTime("");
      setReason("");
      setSelectedSpecialty("");
      setApptDoctorError(false);
      setApptDateError(false);
      setApptTimeError(false);
      setApptReasonError(false);

      // clear delete + conflict state when no patient is selected
      setPendingDeleteApptId(null);
      setHasConflictWarning(false);
      setPendingApptId(null);
      setPendingApptPayload(null);

      // 🔹 also ensure we are not in "editing appointment" mode
      setEditingAppointmentId(null);
      setHighlightPatientForm(false);

      return;
    }

    // 🔹 whenever a *new* patient is selected, cancel any ongoing appointment edit
    setEditingAppointmentId(null);
    setDoctorId("");
    setDatePart("");
    setTimePart("");
    setDateTime("");
    setReason("");
    setSelectedSpecialty("");
    setHasConflictWarning(false);
    setPendingApptId(null);
    setPendingApptPayload(null);
    setApptDoctorError(false);
    setApptDateError(false);
    setApptTimeError(false);
    setApptReasonError(false);

    // sync basic patient details
    setName(p.name || "");
    setAge(p.age != null ? String(p.age) : "");
    setGender(p.gender || "");
    setHistory(p.medicalHistory || "");

    // reset errors on new patient load
    setNameError(false);
    setAgeError(false);
    setGenderError(false);
    setHistoryError(false);
  });

  // Listen for global "edit-patient" event from App
  if (typeof window !== "undefined") {
    window.addEventListener("edit-patient", () => {
      if (props.patient) {
        setIsEditing(true);
        // ✨ highlight when global edit is triggered
        setHighlightPatientForm(true);
        setTimeout(() => setHighlightPatientForm(false), 1200);
      }
    });
  }

  // Listen for global request to highlight appointment form
  if (typeof window !== "undefined") {
    window.addEventListener("highlight-new-appointment", () => {
      setHighlightAppointmentForm(true);
      setTimeout(() => setHighlightAppointmentForm(false), 1200);
    });
  }

  const handleSave = async (e) => {
    e.preventDefault();
    if (!props.patient) return;

    const nameVal = name().trim();
    const ageVal = age().trim();
    const genderVal = gender().trim();
    const historyVal = history().trim();

    const missingName = !nameVal;
    const missingAge = !ageVal;
    const missingGender = !genderVal;
    const missingHistory = !historyVal;

    setNameError(missingName);
    setAgeError(missingAge);
    setGenderError(missingGender);
    setHistoryError(missingHistory);

    if (missingName || missingAge || missingGender || missingHistory) {
      // do not submit if anything is missing
      return;
    }

    // All good → clear errors
    setNameError(false);
    setAgeError(false);
    setGenderError(false);
    setHistoryError(false);

    await props.onUpdatePatient?.(props.patient.id, {
      name: nameVal,
      age: Number(ageVal),
      gender: genderVal,
      medicalHistory: historyVal,
    });
    setIsEditing(false);

    // ✨ flash the card to show save success
    setHighlightPatientForm(true);
    setTimeout(() => setHighlightPatientForm(false), 1200);
  };

  // NEW: start editing an existing appointment
  const startEditAppointment = (appt) => {
    // clear any previous conflict warning
    setHasConflictWarning(false);
    setPendingApptId(null);
    setPendingApptPayload(null);

    // clear appointment validation errors
    setApptDoctorError(false);
    setApptDateError(false);
    setApptTimeError(false);
    setApptReasonError(false);

    setEditingAppointmentId(appt.id);

    const docIdNum = Number(appt.doctorId);
    const docIdStr = docIdNum ? String(docIdNum) : "";

    // Find the doctor & set specialty first
    const doc = (props.doctors || []).find(
      (d) => Number(d.id) === docIdNum
    );
    if (doc && doc.specialty) {
      setSelectedSpecialty(doc.specialty);
    } else {
      setSelectedSpecialty("");
    }

    // Then set the doctorId (so memo sees both aligned)
    setDoctorId(docIdStr);

    const d = new Date(appt.dateTime);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");

      let hours = d.getHours();
      let minutes = d.getMinutes();

      let totalMinutes = hours * 60 + minutes;
      let snappedTotal = Math.ceil(totalMinutes / 15) * 15;

      const maxTotal = 23 * 60 + 45;
      if (snappedTotal > maxTotal) snappedTotal = maxTotal;

      hours = Math.floor(snappedTotal / 60);
      minutes = snappedTotal % 60;

      const hh = String(hours).padStart(2, "0");
      const mi = String(minutes).padStart(2, "0");

      const dateStr = `${yyyy}-${mm}-${dd}`;
      const timeStr = `${hh}:${mi}`;

      setDatePart(dateStr);
      setTimePart(timeStr);
      setDateTime(`${dateStr}T${timeStr}`);
    } else {
      setDatePart("");
      setTimePart("");
      setDateTime("");
    }

    setReason(appt.reason || "");

    setHighlightAppointmentForm(true);
    setTimeout(() => setHighlightAppointmentForm(false), 1200);

    const el = document.getElementById("appointment-form");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // NEW: clear appointment form + exit edit mode
  const resetAppointmentForm = () => {
    setDoctorId("");
    setDatePart("");
    setTimePart("");
    setDateTime("");
    setReason("");
    setEditingAppointmentId(null);
    setSelectedSpecialty("");

    // clear conflict & validation state
    setHasConflictWarning(false);
    setPendingApptId(null);
    setPendingApptPayload(null);
    setApptDoctorError(false);
    setApptDateError(false);
    setApptTimeError(false);
    setApptReasonError(false);
  };

  const requestDeleteAppointment = (id) => {
    setPendingDeleteApptId(id);
  };

  const cancelDeleteAppointment = () => {
    setPendingDeleteApptId(null);
  };

  const confirmDeleteAppointment = async () => {
    const id = pendingDeleteApptId();
    if (!id || !props.onDeleteAppointment) return;

    await props.onDeleteAppointment(id);
    setPendingDeleteApptId(null);
  };

  const handleProceedAnyway = async () => {
    if (!props.onUpdateAppointment && !props.onCreateAppointment) return;

    const id = pendingApptId();
    const payload = pendingApptPayload();
    if (!payload) return;

    if (id && props.onUpdateAppointment) {
      await props.onUpdateAppointment(id, payload);
    } else {
      await props.onCreateAppointment?.(payload);
    }

    resetAppointmentForm();
  };

  const handleDismissConflictWarning = () => {
    // user wants to adjust time instead
    setHasConflictWarning(false);
    setPendingApptId(null);
    setPendingApptPayload(null);
  };

  const handleSubmitAppointment = async (e) => {
    e.preventDefault();
    if (!props.patient) return;

    // First: basic required-field validation for appointment form
    const doctorVal = (doctorId() || "").toString().trim();
    const dateVal = (datePart() || "").trim();
    const timeVal = (timePart() || "").trim();

    const missingDoctor = !doctorVal;
    const missingDate = !dateVal;
    const missingTime = !timeVal;
    const missingReason = !reason().trim();

    setApptDoctorError(missingDoctor);
    setApptDateError(missingDate);
    setApptTimeError(missingTime);
    setApptReasonError(missingReason);

    if (missingDoctor || missingDate || missingTime || missingReason) {
      // Do not proceed to conflict checks if basic fields missing
      return;
    }

    // Clear validation errors if everything is filled in
    setApptDoctorError(false);
    setApptDateError(false);
    setApptTimeError(false);
    setApptReasonError(false);

    const payload = {
      patientId: Number(props.patient.id),
      doctorId: Number(doctorVal),
      dateTime: `${dateVal}T${timeVal}`,
      reason: reason() || undefined,
    };

    let doctorConflict = false;
    let patientConflict = false;

    if (doctorVal && dateVal && timeVal) {
      // --- doctor conflict (existing logic) ---
      const taken = unavailableSlots();
      if (taken.has(timeVal)) {
        doctorConflict = true;
      }

      // --- patient conflict (same patient, same day & slot) ---
      const all = props.allAppointments || [];
      const pid = Number(props.patient.id);
      const currentId = editingAppointmentId();

      for (const appt of all) {
        if (currentId && appt.id === currentId) continue; // skip the one we're editing
        if (Number(appt.patientId) !== pid) continue;

        const d = new Date(appt.dateTime);
        if (isNaN(d.getTime())) continue;

        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const dateStr = `${yyyy}-${mm}-${dd}`;
        if (dateStr !== dateVal) continue;

        const slot = to15MinSlot(d);
        if (slot === timeVal) {
          patientConflict = true;
          break;
        }
      }
    }

    if (doctorConflict || patientConflict) {
      setHasConflictWarning(true);
      setPendingApptId(editingAppointmentId());
      setPendingApptPayload(payload);
      return;
    }

    // Decide between create vs update based on editingAppointmentId
    if (editingAppointmentId() && props.onUpdateAppointment) {
      await props.onUpdateAppointment(editingAppointmentId(), payload);
    } else {
      await props.onCreateAppointment?.(payload);
    }

    resetAppointmentForm();
  };

  const sortedAppointments = () =>
    [...props.appointments].sort(
      (a, b) => new Date(b.dateTime) - new Date(a.dateTime)
    );




  return (
    <div class="flex flex-col gap-4">
      <Show
        when={props.patient}
        fallback={
          <div class="h-40 flex items-center justify-center text-sm text-gray-500">
            Search or select a patient from the list to view their details and
            appointments.
          </div>
        }
      >
        {(p) => (
          <>
            {/* Patient info */}
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1">
                  <div class="h-7 w-7 rounded-full bg-primary/90 flex items-center justify-center text-xs font-semibold text-bg-main">
                    {p().name
                      .split(" ")
                      .map((x) => x[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div class="text-xs text-gray-700">
                    <div class="font-semibold text-gray-900">{p().name}</div>
                    <div class="text-[11px] text-gray-500">
                      Patient ID: {p().id}
                    </div>
                  </div>
                </div>

                <div class="mt-3 text-xs text-gray-700 space-y-1">
                  <div>
                    <span class="font-semibold text-gray-900">Age: </span>
                    {p().age != null ? `${p().age} years` : "N/A"}
                  </div>
                  <div>
                    <span class="font-semibold text-gray-900">Gender: </span>
                    {p().gender || "N/A"}
                  </div>
                </div>
              </div>

              <button
                type="button"
                class="text-xs rounded-full border border-gray-300 px-3 py-1 text-gray-700 hover:bg-gray-50 transition"
                onClick={() => {
                  if (!isEditing()) {
                    // going from view → edit
                    setIsEditing(true);
                    setHighlightPatientForm(true);
                    setTimeout(() => setHighlightPatientForm(false), 1200);
                  } else {
                    // edit → view (cancel)
                    setIsEditing(false);
                  }
                }}
              >
                {isEditing() ? "Cancel edit" : "Edit details"}
              </button>
            </div>

            {/* Medical history / edit form */}
            <div
              classList={{
                "border border-gray-100 rounded-lg bg-gray-50/60 p-3": true,
                "flash-highlight": highlightPatientForm(),
              }}
            >
              <Show
                when={!isEditing()}
                fallback={
                  <form class="space-y-2" onSubmit={handleSave}>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {/* Name */}
                      <div>
                        <label class="block text-[11px] text-gray-600 mb-1">
                          Name
                        </label>
                        <input
                          class={`w-full text-xs rounded-md border bg-white px-2 py-1.5 text-gray-900 focus:outline-none focus:ring-1 ${
                            nameError()
                              ? "border-red-400 bg-red-50 focus:ring-red-400"
                              : "border-gray-300 focus:ring-primary"
                          }`}
                          value={name()}
                          onInput={(e) => {
                            const v = e.currentTarget.value;
                            setName(v);
                            if (v.trim()) setNameError(false);
                          }}
                        />
                      </div>

                      {/* Age */}
                      <div>
                        <label class="block text-[11px] text-gray-600 mb-1">
                          Age
                        </label>
                        <input
                          type="number"
                          min="0"
                          class={`w-full text-xs rounded-md border bg-white px-2 py-1.5 text-gray-900 focus:outline-none focus:ring-1 ${
                            ageError()
                              ? "border-red-400 bg-red-50 focus:ring-red-400"
                              : "border-gray-300 focus:ring-primary"
                          }`}
                          value={age()}
                          onInput={(e) => {
                            const v = e.currentTarget.value;
                            setAge(v);
                            if (v.trim()) setAgeError(false);
                          }}
                        />
                      </div>

                      {/* Gender */}
                      <div>
                        <label class="block text-[11px] text-gray-600 mb-1">
                          Gender
                        </label>
                        <select
                          class={`w-full text-xs rounded-md border bg-white px-2 py-1.5 text-gray-900 focus:outline-none focus:ring-1 ${
                            genderError()
                              ? "border-red-400 bg-red-50 focus:ring-red-400"
                              : "border-gray-300 focus:ring-primary"
                          }`}
                          value={gender()}
                          onInput={(e) => {
                            const v = e.currentTarget.value;
                            setGender(v);
                            if (v.trim()) setGenderError(false);
                          }}
                        >
                          <option value="">Gender</option>
                          <For each={props.genderOptions || []}>
                            {(g) => <option value={g}>{g}</option>}
                          </For>
                          <option value="Prefer not to say">
                            Prefer not to say
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* Medical history / notes */}
                    <div>
                      <label class="block text-[11px] text-gray-600 mb-1">
                        Medical history / notes
                      </label>
                      <textarea
                        rows={3}
                        class={`w-full text-xs rounded-md border bg-white px-2 py-1.5 text-gray-900 focus:outline-none focus:ring-1 ${
                          historyError()
                            ? "border-red-400 bg-red-50 focus:ring-red-400"
                            : "border-gray-300 focus:ring-primary"
                        }`}
                        value={history()}
                        onInput={(e) => {
                          const v = e.currentTarget.value;
                          setHistory(v);
                          if (v.trim()) setHistoryError(false);
                        }}
                      />
                    </div>

                    {/* Inline validation summary (edit form) */}
                    <Show when={missingFields().length > 0}>
                      <div class="mt-1 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                        <div class="font-semibold mb-1">
                          Please complete the highlighted field
                          {missingFields().length > 1 ? "s" : ""}.
                        </div>
                        <div>Missing: {missingFields().join(", ")}</div>
                      </div>
                    </Show>

                    <div class="flex justify-end gap-2 mt-1">
                      <button
                        type="button"
                        class="text-xs rounded-full border border-gray-300 px-3 py-1 text-gray-700 hover:bg-gray-50 transition"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        class="text-xs rounded-full bg-primary px-4 py-1 text-white font-semibold hover:bg-primary/90 transition"
                      >
                        Save changes
                      </button>
                    </div>
                  </form>
                }
              >
                <div>
                  <div class="text-[11px] font-semibold text-gray-700 mb-1">
                    Medical history / notes
                  </div>
                  <div class="text-xs text-gray-700 whitespace-normal break-all max-h-[150px] overflow-y-auto pr-1">
                    {sanitizeText(p().medicalHistory, 2000) ||
                      "No history on file."}
                  </div>
                </div>
              </Show>
            </div>

            {/* Appointments list */}
            <div class="border border-gray-100 rounded-lg bg-gray-50/60 p-3">
              <div class="flex items-center justify-between mb-2">
                <div>
                  <div class="text-sm font-semibold text-gray-900">
                    Appointments
                  </div>
                  <div class="text-[11px] text-gray-500">
                    {props.appointments.length === 0
                      ? "No appointments yet"
                      : `${props.appointments.length} appointment${
                          props.appointments.length === 1 ? "" : "s"
                        }`}
                  </div>
                </div>
              </div>

              <Show
                when={props.appointments.length > 0}
                fallback={
                  <div class="text-xs text-gray-500">
                    This patient has no appointments yet.
                  </div>
                }
              >
                {/* SCROLLABLE CONTAINER */}
                <div class="max-h-[500px] overflow-y-auto pr-1">
                  <ul class="space-y-2 text-xs">
                    <For each={sortedAppointments()}>
                      {(appt) => (
                        <li class="rounded-md bg-white border border-gray-200 px-3 py-2 flex items-start justify-between gap-3">
                          <div>
                            <div class="font-medium text-gray-900">
                              {new Date(appt.dateTime).toLocaleString()}
                            </div>
                            <div class="text-[11px] text-gray-500">
                              Doctor:{" "}
                              <button
                                type="button"
                                class="text-primary hover:underline"
                                onClick={() =>
                                  props.onSelectDoctor?.(appt.doctorId)
                                }
                              >
                                {props.doctorMap.get(appt.doctorId)?.name ||
                                  `#${appt.doctorId}`}
                                {props.doctorMap.get(appt.doctorId)?.specialty
                                  ? ` · ${
                                      props.doctorMap.get(appt.doctorId)
                                        .specialty
                                    }`
                                  : ""}
                              </button>
                            </div>
                            <Show when={appt.reason}>
                              <div class="mt-1 text-[11px] text-gray-600 whitespace-normal break-all max-h-[150px] overflow-y-auto pr-1">
                                Reason: {sanitizeText(appt.reason, 2000)}
                              </div>
                            </Show>
                          </div>

                          <div class="flex flex-col items-end gap-1">
                            <button
                              type="button"
                              class="text-[11px] text-primary hover:text-primary/80"
                              onClick={() => startEditAppointment(appt)}
                            >
                              Edit
                            </button>

                            {/* Delete trigger */}
                            <button
                              type="button"
                              class="text-[11px] text-red-500 hover:text-red-600"
                              onClick={() => requestDeleteAppointment(appt.id)}
                            >
                              Delete
                            </button>

                            {/* Inline delete confirmation */}
                            <Show when={pendingDeleteApptId() === appt.id}>
                              <div
                                class="
                                  mt-1
                                  rounded-md bg-red-50 border border-red-200
                                  px-2 py-1
                                  text-[11px] text-red-700
                                  flex items-center justify-end
                                  whitespace-nowrap
                                  max-w-fit self-end
                                "
                              >
                                <span class="mr-2">Delete?</span>
                                <button
                                  type="button"
                                  class="inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-red-700 transition mr-1"
                                  onClick={confirmDeleteAppointment}
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  class="inline-flex items-center rounded-full border border-red-300 px-2 py-0.5 text-[11px] font-medium text-red-700 bg-red-50 hover:bg-red-100 transition"
                                  onClick={cancelDeleteAppointment}
                                >
                                  No
                                </button>
                              </div>
                            </Show>
                          </div>
                        </li>
                      )}
                    </For>
                  </ul>
                </div>
              </Show>
            </div>

            {/* New / Edit appointment form */}
            <div
              id="appointment-form"
              classList={{
                "border border-dashed border-gray-200 rounded-lg bg-gray-50/80 p-3":
                  true,
                "flash-highlight": highlightAppointmentForm(),
              }}
            >
              <div class="flex items-center justify-between mb-2">
                <div class="text-xs font-semibold text-gray-800">
                  {editingAppointmentId()
                    ? "Edit appointment"
                    : "Schedule new appointment"}
                </div>
                <Show when={editingAppointmentId()}>
                  <button
                    type="button"
                    class="text-[10px] text-gray-500 hover:text-gray-700 underline"
                    onClick={resetAppointmentForm}
                  >
                    Cancel edit
                  </button>
                </Show>
              </div>

              <form
                class="space-y-2 text-[11px]"
                onSubmit={handleSubmitAppointment}
              >
                {/* Line 1: Specialty -> Doctor */}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {/* Specialty */}
                  <div>
                    <label class="block mb-1 text-gray-600">Specialty</label>
                    <select
                      class="w-full rounded-md border bg-white px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 border-gray-300 focus:ring-primary"
                      value={selectedSpecialty()}
                      onInput={(e) => {
                        const v = e.currentTarget.value;
                        setSelectedSpecialty(v);
                        // Clear doctor selection when specialty changes
                        setDoctorId("");
                        setApptDoctorError(false);
                      }}
                    >
                      <option value="">Any specialty</option>
                      <For each={specialtyOptions()}>
                        {(s) => <option value={s}>{s}</option>}
                      </For>
                    </select>
                  </div>

                  {/* Doctor (filtered by specialty) */}
                  <div>
                    <label class="block mb-1 text-gray-600">Doctor</label>
                    <select
                      class={`w-full rounded-md border bg-white px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 ${
                        apptDoctorError()
                          ? "border-red-400 bg-red-50 focus:ring-red-400"
                          : "border-gray-300 focus:ring-primary"
                      }`}
                      value={doctorId()}
                      onInput={(e) => {
                        const v = e.currentTarget.value;
                        setDoctorId(v);
                        if (v) setApptDoctorError(false);
                      }}
                    >
                      <option value="">Select doctor</option>
                      <For each={sortedFilteredDoctors()}>
                        {(d) => (
                          <option value={String(d.id)}>
                            {d.name}
                            {d.specialty ? ` (${d.specialty})` : ""}
                          </option>
                        )}
                      </For>
                    </select>
                  </div>
                </div>

                {/* Line 2: Date -> Time */}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {/* Date */}
                  <div>
                    <label class="block mb-1 text-gray-600">Date</label>
                    <input
                      type="date"
                      class={`w-full rounded-md border bg-white px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 ${
                        apptDateError()
                          ? "border-red-400 bg-red-50 focus:ring-red-400"
                          : "border-gray-300 focus:ring-primary"
                      }`}
                      value={datePart()}
                      onInput={(e) => {
                        const v = e.currentTarget.value;
                        setDatePart(v);
                        if (v) setApptDateError(false);
                        updateDateTime();
                      }}
                    />
                  </div>

                  {/* Time */}
                  <div>
                    <label class="block mb-1 text-gray-600">Time</label>
                    <select
                      class={`w-full rounded-md border bg-white px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 ${
                        apptTimeError()
                          ? "border-red-400 bg-red-50 focus:ring-red-400"
                          : "border-gray-300 focus:ring-primary"
                      }`}
                      value={timePart()}
                      onInput={(e) => {
                        const v = e.currentTarget.value;
                        setTimePart(v);
                        if (v) setApptTimeError(false);
                        updateDateTime();
                      }}
                    >
                      <option value="">Time</option>
                      <For each={timeSlots}>
                        {(t) => {
                          const taken = unavailableSlots().has(t);
                          const isCurrent = t === timePart();
                          return (
                            <option
                              value={t}
                              disabled={taken && !isCurrent}
                            >
                              {t}
                              {taken && !isCurrent ? " (booked)" : ""}
                            </option>
                          );
                        }}
                      </For>
                    </select>
                  </div>
                </div>

                {/* Line 3: Reason + Create/Update button */}
                <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
                  {/* Reason */}
                  <div class="flex-1">
                    <label class="block mb-1 text-gray-600">Reason</label>
                    <textarea
                      rows={2}
                      classList={{
                        "w-full rounded-md bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none": true,
                        "border border-gray-300 focus:ring-1 focus:ring-primary":
                          !apptReasonError(),
                        "ring-1 ring-red-400": apptReasonError(),
                      }}
                      placeholder="Checkup, follow-up…"
                      value={reason()}
                      onInput={(e) => {
                        setReason(e.currentTarget.value);
                        if (apptReasonError()) setApptReasonError(false);
                      }}
                    />

                    {/* Inline validation summary for appointment form */}
                    <Show when={missingApptFields().length > 0}>
                      <div class="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                        <div class="font-semibold mb-1">
                          Please complete the highlighted appointment field
                          {missingApptFields().length > 1 ? "s" : ""}.
                        </div>
                        <div>Missing: {missingApptFields().join(", ")}</div>
                      </div>
                    </Show>

                    {/* Conflict warning inline below textarea */}
                    <Show when={hasConflictWarning()}>
                      <div class="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                        <div class="font-semibold mb-1">
                          This time conflicts with another appointment.
                        </div>
                        <p class="mb-2">
                          Either the doctor or this patient is already booked at this time.
                          Double-booking may cause scheduling issues. Do you want to proceed
                          anyway, or change the appointment time?
                        </p>
                        <div class="flex flex-wrap gap-2">
                          <button
                            type="button"
                            class="inline-flex items-center rounded-full bg-amber-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-amber-700 transition"
                            onClick={handleProceedAnyway}
                          >
                            Proceed anyway
                          </button>
                          <button
                            type="button"
                            class="inline-flex items-center rounded-full border border-amber-400 px-3 py-1 text-[11px] font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 transition"
                            onClick={handleDismissConflictWarning}
                          >
                            Change time
                          </button>
                        </div>
                      </div>
                    </Show>
                  </div>

                  {/* Create/Update button */}
                  <div class="md:w-auto">
                    <button
                      type="submit"
                      class="w-full md:w-auto inline-flex items-center justify-center rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition"
                    >
                      {editingAppointmentId() ? "Update" : "Create"}
                    </button>
                  </div>
                </div>
              </form>

            </div>
          </>
        )}
      </Show>
    </div>
  );
};

export default PatientDetails;
