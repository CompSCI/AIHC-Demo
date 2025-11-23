// src/components/DoctorDetails.jsx
import {
  Show,
  For,
  createSignal,
  createEffect,
  createMemo,
} from "solid-js";
import { sanitizeText } from "../utils/sanitizeText";

const DoctorDetails = (props) => {
  const [isEditingDoctor, setIsEditingDoctor] = createSignal(false);
  const [name, setName] = createSignal("");
  const [specialty, setSpecialty] = createSignal("");
  const [bio, setBio] = createSignal("");
  const [useCustomSpecialty, setUseCustomSpecialty] = createSignal(false);
  const [highlightDoctorForm, setHighlightDoctorForm] = createSignal(false);

  // Doctor edit form validation
  const [nameError, setNameError] = createSignal(false);
  const [specialtyError, setSpecialtyError] = createSignal(false);
  const [bioError, setBioError] = createSignal(false);

  // Appointment editing state
  const [editingAppointmentId, setEditingAppointmentId] = createSignal(null);
  const [editingPatientId, setEditingPatientId] = createSignal(null);
  const [editDoctorId, setEditDoctorId] = createSignal("");
  const [datePart, setDatePart] = createSignal("");
  const [timePart, setTimePart] = createSignal("");
  const [editReason, setEditReason] = createSignal("");

  // Appointment: specialty filter for edit form
  const [selectedApptSpecialty, setSelectedApptSpecialty] = createSignal("");

  const specialtyOptionsForAppt = createMemo(() => {
    const list = props.doctors || [];
    const set = new Set();
    for (const doc of list) {
      if (doc.specialty) set.add(doc.specialty);
    }
    return Array.from(set).sort();
  });

  const filteredDoctorsForAppt = createMemo(() => {
    const list = props.doctors || [];
    const spec = selectedApptSpecialty();
    const currentIdNum = Number(editDoctorId() || 0);

    // Base list (by specialty if chosen, otherwise all)
    let base;
    if (!spec) {
      base = list;
    } else {
      base = list.filter((d) => d.specialty === spec);
    }

    // Ensure the currently selected doctor is included, even if specialty mismatch
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

  // Appointment validation state
  const [apptDoctorError, setApptDoctorError] = createSignal(false);
  const [apptDateError, setApptDateError] = createSignal(false);
  const [apptTimeError, setApptTimeError] = createSignal(false);
  const [apptReasonError, setApptReasonError] = createSignal(false);

  // Conflict warning state for double-booking
  const [hasConflictWarning, setHasConflictWarning] = createSignal(false);
  const [pendingApptId, setPendingApptId] = createSignal(null);
  const [pendingApptPayload, setPendingApptPayload] = createSignal(null);

  // Delete confirmation state for appointments
  const [pendingDeleteApptId, setPendingDeleteApptId] = createSignal(null);

  // 15-minute time slots
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

  const sortedAppointments = () =>
    [...(props.appointments || [])].sort(
      (a, b) => new Date(b.dateTime) - new Date(a.dateTime)
    );

  const patientName = (id) => {
    const list = props.patients || [];
    const p = list.find((x) => x.id === id);
    return p?.name || `Patient #${id}`;
  };

  // Busy time slots for selected doctor/date in the edit form
  const busyTimeSlots = createMemo(() => {
    const all = props.allAppointments || [];
    const dId = Number(editDoctorId());
    const dPart = datePart();
    const currentApptId = editingAppointmentId();

    if (!dId || !dPart) return new Set();

    const set = new Set();

    for (const a of all) {
      if (Number(a.doctorId) !== dId) continue;

      // don't block the slot of the appointment we're editing
      if (currentApptId && a.id === currentApptId) continue;

      const d = new Date(a.dateTime);
      if (isNaN(d.getTime())) continue;

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const apptDateStr = `${yyyy}-${mm}-${dd}`;
      if (apptDateStr !== dPart) continue;

      let hours = d.getHours();
      let minutes = d.getMinutes();
      let totalMinutes = hours * 60 + minutes;

      // snap to 15-minute grid (same as PatientDetails)
      let snappedTotal = Math.ceil(totalMinutes / 15) * 15;
      const maxTotal = 23 * 60 + 45;
      if (snappedTotal > maxTotal) snappedTotal = maxTotal;

      hours = Math.floor(snappedTotal / 60);
      minutes = snappedTotal % 60;

      const hh = String(hours).padStart(2, "0");
      const mi = String(minutes).padStart(2, "0");
      set.add(`${hh}:${mi}`);
    }

    return set;
  });

  // Labels for missing doctor fields
  const missingDoctorFields = createMemo(() => {
    const list = [];
    if (nameError()) list.push("Name");
    if (specialtyError()) list.push("Specialty");
    if (bioError()) list.push("Bio / notes");
    return list;
  });

  // Labels for missing appointment fields
  const missingApptFields = createMemo(() => {
    const list = [];
    if (apptDoctorError()) list.push("Doctor");
    if (apptDateError()) list.push("Date");
    if (apptTimeError()) list.push("Time");
    if (apptReasonError()) list.push("Reason");
    return list;
  });

  // Sync with doctor prop
  createEffect(() => {
    const d = props.doctor;
    if (!d) {
      setName("");
      setSpecialty("");
      setBio("");
      setUseCustomSpecialty(false);
      setEditingAppointmentId(null);

      // clear doctor form validation
      setNameError(false);
      setSpecialtyError(false);
      setBioError(false);

      // clear appointment edit state
      setEditingPatientId(null);
      setEditDoctorId("");
      setDatePart("");
      setTimePart("");
      setEditReason("");
      setSelectedApptSpecialty("");

      // clear appointment validation
      setApptDoctorError(false);
      setApptDateError(false);
      setApptTimeError(false);
      setApptReasonError(false);

      // clear delete + conflict state when no doctor is selected
      setPendingDeleteApptId(null);
      setHasConflictWarning(false);
      setPendingApptId(null);
      setPendingApptPayload(null);

      setHighlightDoctorForm(false);

      return;
    }

    // 🔹 when switching to a different doctor, cancel any ongoing appointment edit
    setEditingAppointmentId(null);
    setEditingPatientId(null);
    setEditDoctorId("");
    setDatePart("");
    setTimePart("");
    setEditReason("");
    setSelectedApptSpecialty("");
    setHasConflictWarning(false);
    setPendingApptId(null);
    setPendingApptPayload(null);
    setApptDoctorError(false);
    setApptDateError(false);
    setApptTimeError(false);
    setApptReasonError(false);

    setName(d.name || "");
    setSpecialty(d.specialty || "");
    setBio(d.bio || "");
    const opts = props.specialtyOptions || [];
    setUseCustomSpecialty(d.specialty && !opts.includes(d.specialty));

    // reset validation errors when switching doctors
    setNameError(false);
    setSpecialtyError(false);
    setBioError(false);

    // ✨ reset highlight when switching doctor
    setHighlightDoctorForm(false);
  });

  const handleSpecialtySelectChange = (e) => {
    const val = e.currentTarget.value;
    if (val === "__custom") {
      setUseCustomSpecialty(true);
      // don't clear specialty text; custom input will handle it
    } else {
      setUseCustomSpecialty(false);
      setSpecialty(val);
      if (val.trim()) setSpecialtyError(false);
    }
  };

  const handleSaveDoctor = async (e) => {
    e.preventDefault();
    if (!props.doctor) return;

    const nameVal = name().trim();
    const specialtyVal = specialty().trim();
    const bioVal = bio().trim();

    const missingName = !nameVal;
    const missingSpecialty = !specialtyVal;
    const missingBio = !bioVal;

    setNameError(missingName);
    setSpecialtyError(missingSpecialty);
    setBioError(missingBio);

    if (missingName || missingSpecialty || missingBio) {
      // do not submit if anything is missing
      return;
    }

    // clear errors
    setNameError(false);
    setSpecialtyError(false);
    setBioError(false);

    await props.onUpdateDoctor?.(props.doctor.id, {
      name: nameVal,
      specialty: specialtyVal,
      bio: bioVal,
    });
    setIsEditingDoctor(false);

    // ✨ flash to show save success
    setHighlightDoctorForm(true);
    setTimeout(() => setHighlightDoctorForm(false), 1200);
  };

  // Start editing an appointment
  const startEditAppointment = (appt) => {
    // clear any previous conflict & validation state
    setHasConflictWarning(false);
    setPendingApptId(null);
    setPendingApptPayload(null);
    setApptDoctorError(false);
    setApptDateError(false);
    setApptTimeError(false);
    setApptReasonError(false);

    setEditingAppointmentId(appt.id);
    setEditingPatientId(appt.patientId);

    // Normalize doctor id
    const docIdNum = Number(appt.doctorId);
    const docIdStr = docIdNum ? String(docIdNum) : "";

    // Set specialty first based on this doctor
    const doc = (props.doctors || []).find(
      (d) => Number(d.id) === docIdNum
    );
    if (doc && doc.specialty) {
      setSelectedApptSpecialty(doc.specialty);
    } else {
      setSelectedApptSpecialty("");
    }

    // Then set doctor id
    setEditDoctorId(docIdStr);

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
    } else {
      setDatePart("");
      setTimePart("");
    }

    setEditReason(appt.reason || "");

    const el = document.getElementById("doctor-appointment-edit-form");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const resetAppointmentEdit = () => {
    setEditingAppointmentId(null);
    setEditingPatientId(null);
    setEditDoctorId("");
    setDatePart("");
    setTimePart("");
    setEditReason("");
    setSelectedApptSpecialty("");

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

  const handleSaveAppointment = async (e) => {
    e.preventDefault();
    if (!editingAppointmentId() || !props.onUpdateAppointment) return;

    // basic required-field validation
    const doctorVal = (editDoctorId() || "").toString().trim();
    const dateVal = (datePart() || "").trim();
    const timeVal = (timePart() || "").trim();
    const reasonVal = (editReason() || "").trim();

    const missingDoctor = !doctorVal;
    const missingDate = !dateVal;
    const missingTime = !timeVal;
    const missingReason = !reasonVal;

    setApptDoctorError(missingDoctor);
    setApptDateError(missingDate);
    setApptTimeError(missingTime);
    setApptReasonError(missingReason);

    if (missingDoctor || missingDate || missingTime || missingReason) {
      // don't run conflict logic if fields are missing
      return;
    }

    // clear errors if all set
    setApptDoctorError(false);
    setApptDateError(false);
    setApptTimeError(false);
    setApptReasonError(false);

    const apptId = editingAppointmentId();
    const payload = {
      patientId: Number(editingPatientId()),
      doctorId: Number(doctorVal),
      dateTime: `${dateVal}T${timeVal}`,
      reason: reasonVal,
    };

    let doctorConflict = false;
    let patientConflict = false;

    if (doctorVal && dateVal && timeVal) {
      // --- doctor conflict ---
      const busy = busyTimeSlots();
      if (busy.has(timeVal)) {
        doctorConflict = true;
      }

      // --- patient conflict (same patient, same day & slot) ---
      const all = props.allAppointments || [];
      const pid = Number(editingPatientId());
      if (pid) {
        for (const a of all) {
          if (a.id === apptId) continue; // skip this appointment
          if (Number(a.patientId) !== pid) continue;

          const d = new Date(a.dateTime);
          if (isNaN(d.getTime())) continue;

          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          const apptDateStr = `${yyyy}-${mm}-${dd}`;
          if (apptDateStr !== dateVal) continue;

          const slot = to15MinSlot(d);
          if (slot === timeVal) {
            patientConflict = true;
            break;
          }
        }
      }
    }

    if (doctorConflict || patientConflict) {
      // trigger inline warning, let user choose
      setHasConflictWarning(true);
      setPendingApptId(apptId);
      setPendingApptPayload(payload);
      return;
    }

    // No conflict → save immediately
    await props.onUpdateAppointment(apptId, payload);
    resetAppointmentEdit();
  };

  const handleProceedAnyway = async () => {
    if (!props.onUpdateAppointment) return;
    const id = pendingApptId();
    const payload = pendingApptPayload();
    if (!id || !payload) return;

    await props.onUpdateAppointment(id, payload);

    // clean up and close the edit form
    resetAppointmentEdit();
  };

  const handleDismissConflictWarning = () => {
    // user wants to adjust time instead
    setHasConflictWarning(false);
    setPendingApptId(null);
    setPendingApptPayload(null);
  };

  return (
    <div class="flex flex-col gap-4">
      <Show
        when={props.doctor}
        fallback={
          <div class="h-40 flex items-center justify-center text-sm text-gray-500">
            Select a doctor from the list to view their details and
            appointments.
          </div>
        }
      >
        {(d) => (
          <>
            {/* Doctor info */}
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1">
                  <div class="h-7 w-7 rounded-full bg-primary/90 flex items-center justify-center text-xs font-semibold text-bg-main">
                    {d().name
                      .split(" ")
                      .map((x) => x[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div class="text-xs text-gray-700">
                    <div class="font-semibold text-gray-900">{d().name}</div>
                    <div class="text-[11px] text-gray-500">
                      Doctor ID: {d().id}
                    </div>
                  </div>
                </div>

                <div class="mt-3 text-xs text-gray-700 space-y-1">
                  <div>
                    <span class="font-semibold text-gray-900">
                      Specialty:{" "}
                    </span>
                    {d().specialty || "N/A"}
                  </div>
                </div>
              </div>

              <button
                type="button"
                class="text-xs rounded-full border border-gray-300 px-3 py-1 text-gray-700 hover:bg-gray-50 transition"
                onClick={() => {
                  if (!isEditingDoctor()) {
                    // going from view → edit
                    setIsEditingDoctor(true);
                    setHighlightDoctorForm(true);
                    setTimeout(() => setHighlightDoctorForm(false), 1200);
                  } else {
                    // edit → view (cancel)
                    setIsEditingDoctor(false);
                  }
                }}
              >
                {isEditingDoctor() ? "Cancel edit" : "Edit details"}
              </button>
            </div>

            {/* Bio / edit form */}
            <div
              classList={{
                "border border-gray-100 rounded-lg bg-gray-50/60 p-3": true,
                "flash-highlight": highlightDoctorForm(),
              }}
            >
              <Show
                when={!isEditingDoctor()}
                fallback={
                  <form class="space-y-2" onSubmit={handleSaveDoctor}>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
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

                      {/* Specialty */}
                      <div>
                        <label class="block text-[11px] text-gray-600 mb-1">
                          Specialty
                        </label>
                        <select
                          class={`w-full text-xs rounded-md border bg-white px-2 py-1.5 text-gray-900 focus:outline-none focus:ring-1 ${
                            specialtyError()
                              ? "border-red-400 bg-red-50 focus:ring-red-400"
                              : "border-gray-300 focus:ring-primary"
                          }`}
                          value={useCustomSpecialty() ? "__custom" : specialty()}
                          onInput={handleSpecialtySelectChange}
                        >
                          <option value="">Select specialty</option>
                          <For each={props.specialtyOptions || []}>
                            {(s) => <option value={s}>{s}</option>}
                          </For>
                          <option value="__custom">Other (manual entry)</option>
                        </select>
                        <Show when={useCustomSpecialty()}>
                          <input
                            class={`mt-1 w-full text-xs rounded-md border bg-white px-2 py-1.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 ${
                              specialtyError()
                                ? "border-red-400 bg-red-50 focus:ring-red-400"
                                : "border-gray-300 focus:ring-primary"
                            }`}
                            placeholder="Custom specialty"
                            value={specialty()}
                            onInput={(e) => {
                              const v = e.currentTarget.value;
                              setSpecialty(v);
                              if (v.trim()) setSpecialtyError(false);
                            }}
                          />
                        </Show>
                      </div>
                    </div>

                    {/* Bio */}
                    <div>
                      <label class="block text-[11px] text-gray-600 mb-1">
                        Bio / notes
                      </label>
                      <textarea
                        rows={3}
                        class={`w-full text-xs rounded-md border bg-white px-2 py-1.5 text-gray-900 focus:outline-none focus:ring-1 ${
                          bioError()
                            ? "border-red-400 bg-red-50 focus:ring-red-400"
                            : "border-gray-300 focus:ring-primary"
                        }`}
                        value={bio()}
                        onInput={(e) => {
                          const v = e.currentTarget.value;
                          setBio(v);
                          if (v.trim()) setBioError(false);
                        }}
                      />
                    </div>

                    {/* Inline validation summary for doctor form */}
                    <Show when={missingDoctorFields().length > 0}>
                      <div class="mt-1 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                        <div class="font-semibold mb-1">
                          Please complete the highlighted field
                          {missingDoctorFields().length > 1 ? "s" : ""}.
                        </div>
                        <div>Missing: {missingDoctorFields().join(", ")}</div>
                      </div>
                    </Show>

                    <div class="flex justify-end gap-2">
                      <button
                        type="button"
                        class="text-xs rounded-full border border-gray-300 px-3 py-1 text-gray-700 hover:bg-gray-50 transition"
                        onClick={() => setIsEditingDoctor(false)}
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
                    Bio / notes
                  </div>
                  <div class="text-xs text-gray-700 whitespace-normal break-all max-h-[100px] overflow-y-auto pr-1">
                    {sanitizeText(d().bio, 2000) || "No bio on file."}
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
                    {sortedAppointments().length === 0
                      ? "No appointments yet"
                      : `${sortedAppointments().length} appointment${
                          sortedAppointments().length === 1 ? "" : "s"
                        }`}
                  </div>
                </div>
              </div>

              <Show
                when={sortedAppointments().length > 0}
                fallback={
                  <div class="text-xs text-gray-500">
                    This doctor has no appointments yet.
                  </div>
                }
              >
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
                              Patient:{" "}
                              <button
                                type="button"
                                class="underline text-primary hover:text-primary/80"
                                onClick={() =>
                                  props.onSelectPatient?.(appt.patientId)
                                }
                              >
                                {patientName(appt.patientId)}
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

            {/* Edit appointment form */}
            <Show when={editingAppointmentId()}>
              <div
                id="doctor-appointment-edit-form"
                class="border border-dashed border-gray-200 rounded-lg bg-gray-50/80 p-3"
              >
                <div class="flex items-center justify-between mb-2">
                  <div class="text-xs font-semibold text-gray-800">
                    Edit appointment
                  </div>
                  <button
                    type="button"
                    class="text-[10px] text-gray-500 hover:text-gray-700 underline"
                    onClick={resetAppointmentEdit}
                  >
                    Cancel edit
                  </button>
                </div>

                <form
                  class="space-y-2 text-[11px]"
                  onSubmit={handleSaveAppointment}
                >
                  {/* Line 1: Specialty -> Doctor */}
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {/* Specialty */}
                    <div>
                      <label class="block mb-1 text-gray-600">Specialty</label>
                      <select
                        class="w-full rounded-md border bg-white px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 border-gray-300 focus:ring-primary"
                        value={selectedApptSpecialty()}
                        onInput={(e) => {
                          const v = e.currentTarget.value;
                          setSelectedApptSpecialty(v);
                          // Clear doctor when specialty changes
                          setEditDoctorId("");
                          setApptDoctorError(false);
                        }}
                      >
                        <option value="">Any specialty</option>
                        <For each={specialtyOptionsForAppt()}>
                          {(s) => <option value={s}>{s}</option>}
                        </For>
                      </select>
                    </div>

                    {/* Doctor */}
                    <div>
                      <label class="block mb-1 text-gray-600">Doctor</label>
                      <select
                        class={`w-full rounded-md border bg-white px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 ${
                          apptDoctorError()
                            ? "border-red-400 bg-red-50 focus:ring-red-400"
                            : "border-gray-300 focus:ring-primary"
                        }`}
                        value={editDoctorId()}
                        onInput={(e) => {
                          const v = e.currentTarget.value;
                          setEditDoctorId(v);
                          if (v) setApptDoctorError(false);
                        }}
                      >
                        <option value="">Select doctor</option>
                        <For each={sortedFilteredDoctors()}>
                          {(doc) => (
                            <option value={String(doc.id)}>
                              {doc.name}
                              {doc.specialty ? ` (${doc.specialty})` : ""}
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
                        }}
                      >
                        <option value="">Time</option>
                        <For each={timeSlots}>
                          {(t) => {
                            const isBusy = busyTimeSlots().has(t);
                            const isCurrent = t === timePart();
                            return (
                              <option
                                value={t}
                                disabled={isBusy && !isCurrent}
                                class={isBusy && !isCurrent ? "text-gray-300" : ""}
                              >
                                {t}
                                {isBusy && !isCurrent ? " (busy)" : ""}
                              </option>
                            );
                          }}
                        </For>
                      </select>
                    </div>
                  </div>

                  {/* Line 3: Reason + Save button */}
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
                        value={editReason()}
                        onInput={(e) => {
                          const v = e.currentTarget.value;
                          setEditReason(v);
                          if (v.trim()) setApptReasonError(false);
                        }}
                      />

                      {/* Inline validation summary */}
                      <Show when={missingApptFields().length > 0}>
                        <div class="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                          <div class="font-semibold mb-1">
                            Please complete the highlighted appointment field
                            {missingApptFields().length > 1 ? "s" : ""}.
                          </div>
                          <div>Missing: {missingApptFields().join(", ")}</div>
                        </div>
                      </Show>

                      {/* Conflict warning */}
                      <Show when={hasConflictWarning()}>
                        <div class="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                          <div class="font-semibold mb-1">
                            This time conflicts with another appointment.
                          </div>
                          <p class="mb-2">
                            Either the doctor or the patient is already booked at this time.
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

                    {/* Save button */}
                    <div class="md:w-auto">
                      <button
                        type="submit"
                        class="w-full md:w-auto inline-flex items-center justify-center rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </Show>
          </>
        )}
      </Show>
    </div>
  );
};

export default DoctorDetails;
