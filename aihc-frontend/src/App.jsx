import { createResource, createSignal, For, Show, createMemo } from "solid-js";
import toast from "solid-toast";
import {
  getPatients,
  getDoctors,
  getAppointments,
  createPatient,
  deletePatient,
  updatePatient,
  createAppointment,
  deleteAppointment,
  createDoctor,
  deleteDoctor,
  updateDoctor,
  updateAppointment,
} from "./api";
import Header from "./components/Header";
import TodaySchedule from "./components/TodaySchedule";
import PeopleTabs from "./components/PeopleTabs";
import PatientList from "./components/PatientList";
import PatientDetails from "./components/PatientDetails";
import DoctorDetails from "./components/DoctorDetails";
import { sanitizeText } from "./utils/sanitizeText";
import Footer from "./components/Footer";

// Simple login screen with static credentials: admin / admin
const LoginScreen = (props) => {
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const u = username().trim();
    const p = password();

    if (u === "admin" && p === "admin") {
      setError("");
      props.onLoginSuccess?.();
    } else {
      setError("Invalid username or password. Try admin / admin.");
    }
  };

  return (
    <div class="min-h-screen bg-bg-main flex items-center justify-center px-4">
      <div class="w-full max-w-sm bg-white rounded-xl shadow-lg border border-gray-200 p-6 space-y-4">
        <div class="flex items-center gap-2 mb-2">
          <div class="h-9 w-9 rounded-xl bg-primary/90 flex items-center justify-center text-sm font-bold text-white shadow-md">
            HC
          </div>
          <div>
            <h1 class="text-base font-semibold text-gray-900">
              AI Health Chains Portal
            </h1>
            <p class="text-[11px] text-gray-500">Admin login</p>
          </div>
        </div>

        <form class="space-y-3" onSubmit={handleSubmit}>
          <div>
            <label class="block text-[11px] text-gray-600 mb-1">
              Username
            </label>
            <input
              class="w-full text-xs rounded-md border border-gray-300 bg-white px-2 py-1.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="admin"
              value={username()}
              onInput={(e) => setUsername(e.currentTarget.value)}
            />
          </div>
          <div>
            <label class="block text-[11px] text-gray-600 mb-1">
              Password
            </label>
            <input
              type="password"
              class="w-full text-xs rounded-md border border-gray-300 bg-white px-2 py-1.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="admin"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
            />
          </div>

          <Show when={error()}>
            <div class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
              {error()}
            </div>
          </Show>

          <button
            type="submit"
            class="w-full inline-flex items-center justify-center rounded-md bg-primary text-xs font-semibold text-white py-1.5 hover:bg-primary/90 transition"
          >
            Log in
          </button>
        </form>

        <p class="text-[11px] text-gray-400 text-center">
          Demo credentials: <span class="font-semibold">admin / admin</span>
        </p>
      </div>
    </div>
  );
};

const App = () => {
  // ---- Auth / blur state ----
  const [isLoggedIn, setIsLoggedIn] = createSignal(false);
  const [isBlurred, setIsBlurred] = createSignal(false);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setIsBlurred(false);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsBlurred(false);
    // Optionally clear selections too:
    setSelectedPatientId(null);
    setSelectedDoctorId(null);
    setActivePeopleTab("patients");
  };

  const handleToggleBlur = () => {
    setIsBlurred((prev) => !prev);
  };

  // ---- Data resources ----
  const [patients, { refetch: refetchPatients }] = createResource(getPatients);
  const [doctors, { refetch: refetchDoctors }] = createResource(getDoctors);
  const [appointmentsVersion, setAppointmentsVersion] = createSignal(0);
  const [allAppointments] = createResource(
    appointmentsVersion,
    () => getAppointments()
  );

  // ---- UI state ----
  const [selectedPatientId, setSelectedPatientId] = createSignal(null);
  const [selectedDoctorId, setSelectedDoctorId] = createSignal(null);
  const [activePeopleTab, setActivePeopleTab] = createSignal("patients");
  const [patientSearch, setPatientSearch] = createSignal("");
  const [error, setError] = createSignal(null);
  const [success, setSuccess] = createSignal(null);

  const showMessage = (ok, msg) => {
    if (ok) {
      toast.success(msg);
    } else {
      toast.error(msg);
    }
  };

  // Sanitize any string fields in an object
  const sanitizePayloadStrings = (obj, maxLen = 2000) => {
    if (!obj) return obj;
    const out = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string") {
        out[key] = sanitizeText(value, maxLen);
      } else {
        out[key] = value;
      }
    }
    return out;
  };

  // Narrow helpers if you want to tune limits per type:
  const sanitizePatientPayload = (data) =>
    sanitizePayloadStrings(data, 4000); // history can be long

  const sanitizeDoctorPayload = (data) =>
    sanitizePayloadStrings(data, 4000); // bio can be long

  const sanitizeAppointmentPayload = (data) =>
    sanitizePayloadStrings(data, 2000); // reason usually smaller

  // ---- Derived maps ----
  const patientMap = createMemo(() => {
    const p = patients();
    if (!p) return new Map();
    return new Map(p.map((x) => [x.id, x]));
  });

  const doctorMap = createMemo(() => {
    const d = doctors();
    if (!d) return new Map();
    return new Map(d.map((x) => [x.id, x]));
  });

  const selectedPatient = createMemo(() => {
    if (!selectedPatientId()) return null;
    const list = patients() || [];
    return list.find((p) => p.id === selectedPatientId()) || null;
  });

  const patientAppointments = createMemo(() => {
    const pid = selectedPatientId();
    const appts = allAppointments() || [];
    if (pid == null) return [];
    return appts.filter((a) => Number(a.patientId) === Number(pid));
  });

  // NEW: collect unique gender values from existing patients
  const genderOptions = createMemo(() => {
    const list = patients() || [];
    const set = new Set();
    list.forEach((p) => {
      if (p.gender) set.add(p.gender);
    });
    return Array.from(set).sort();
  });

  const specialtyOptions = createMemo(() => {
    const list = doctors() || [];
    const set = new Set();
    list.forEach((d) => {
      if (d.specialty) set.add(d.specialty);
    });
    return Array.from(set).sort();
  });

  const selectedDoctor = createMemo(() => {
    if (!selectedDoctorId()) return null;
    const list = doctors() || [];
    return list.find((d) => d.id === selectedDoctorId()) || null;
  });

  const doctorAppointments = createMemo(() => {
    const did = selectedDoctorId();
    const appts = allAppointments() || [];
    if (!did) return [];
    return appts.filter((a) => a.doctorId === did);
  });

  // ---- Actions ----

  const scrollToListItem = (kind, id) => {
    // kind: "patient" | "doctor"
    const selector =
      kind === "patient"
        ? `[data-patient-id="${id}"]`
        : `[data-doctor-id="${id}"]`;

    const el = document.querySelector(selector);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleGlobalSearchSelect = ({ kind, id }) => {
    if (kind === "patient") {
      setActivePeopleTab("patients");
      setSelectedDoctorId(null);
      setSelectedPatientId(id);
    } else {
      setActivePeopleTab("doctors");
      setSelectedPatientId(null);
      setSelectedDoctorId(id);
    }

    // Let the tab/list render, then scroll
    setTimeout(() => {
      scrollToListItem(kind, id);
    }, 0);

    // Optional: clear the search box after selection
    setPatientSearch("");
  };

  const handleHeaderSearchChange = (value) => {
    setPatientSearch(value);
    // if (value.trim() && activePeopleTab() !== "patients") {
    //   setActivePeopleTab("patients");
    // }
  };

  const handleUpdateAppointment = async (id, data) => {
    try {
      const safeData = sanitizeAppointmentPayload(data);
      await updateAppointment(id, safeData);
      setAppointmentsVersion((v) => v + 1);
      showMessage(true, "Appointment updated");
    } catch (err) {
      showMessage(false, err.message || "Error updating appointment");
    }
  };

  const handleSelectPatient = (id, options = {}) => {
    setSelectedPatientId(id);
    setSelectedDoctorId(null);
    setActivePeopleTab("patients");

    if (options.scroll !== false) {
      setTimeout(() => {
        scrollToListItem("patient", id);
      }, 0);
    }
  };

  const handleCreatePatient = async (data) => {
    try {
      const safeData = sanitizePatientPayload(data);
      const created = await createPatient(safeData);
      await refetchPatients();
      setSelectedPatientId(created.id);
      showMessage(true, "Patient created");
    } catch (err) {
      showMessage(false, err.message || "Error creating patient");
    }
  };

  const handleDeletePatient = async (id) => {
    try {
      await deletePatient(id);
      await refetchPatients();
      if (selectedPatientId() === id) {
        setSelectedPatientId(null);
      }
      showMessage(true, "Patient deleted");
    } catch (err) {
      showMessage(false, err.message || "Error deleting patient");
    }
  };

  const handleUpdatePatient = async (id, updates) => {
    try {
      const safeUpdates = sanitizePatientPayload(updates);
      await updatePatient(id, safeUpdates);
      await refetchPatients();
      showMessage(true, "Patient updated");
    } catch (err) {
      showMessage(false, err.message || "Error updating patient");
    }
  };

  const handleCreateAppointment = async (data) => {
    try {
      const safeData = sanitizeAppointmentPayload(data);
      await createAppointment(safeData);
      setAppointmentsVersion((v) => v + 1);
      showMessage(true, "Appointment created");
    } catch (err) {
      showMessage(false, err.message || "Error creating appointment");
    }
  };

  const handleDeleteAppointment = async (id) => {
    try {
      await deleteAppointment(id);
      setAppointmentsVersion((v) => v + 1);
      showMessage(true, "Appointment deleted");
    } catch (err) {
      showMessage(false, err.message || "Error deleting appointment");
    }
  };

  const handleSelectDoctor = (id, options = {}) => {
    setSelectedDoctorId(id);
    setSelectedPatientId(null);
    setActivePeopleTab("doctors");

    if (options.scroll !== false) {
      setTimeout(() => {
        scrollToListItem("doctor", id);
      }, 0);
    }
  };

  const handleCreateDoctor = async (data) => {
    try {
      const safeData = sanitizeDoctorPayload(data);
      const created = await createDoctor(safeData);
      await refetchDoctors();
      setSelectedDoctorId(created.id);
      showMessage(true, "Doctor created");
    } catch (err) {
      showMessage(false, err.message || "Error creating doctor");
    }
  };

  const handleDeleteDoctor = async (id) => {
    try {
      await deleteDoctor(id);
      await refetchDoctors();

      if (selectedDoctorId() === id) {
        setSelectedDoctorId(null);
      }
      setActivePeopleTab("doctors");

      showMessage(true, "Doctor deleted");
    } catch (err) {
      showMessage(false, err.message || "Error deleting doctor");
    }
  };

  const handleUpdateDoctor = async (id, updates) => {
    try {
      const safeUpdates = sanitizeDoctorPayload(updates);
      await updateDoctor(id, safeUpdates);
      await refetchDoctors();
      showMessage(true, "Doctor updated");
    } catch (err) {
      showMessage(false, err.message || "Error updating doctor");
    }
  };

  // Scroll helper for "New Appointment" buttons
  const scrollToAppointmentForm = () => {
    const el = document.getElementById("appointment-form");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // If not logged in, show login screen instead of the app
  return (
    <Show
      when={isLoggedIn()}
      fallback={<LoginScreen onLoginSuccess={handleLoginSuccess} />}
    >
      <div class="min-h-screen bg-white flex flex-col">
        {/* HEADER */}
        <Header
          searchValue={patientSearch()}
          onSearchChange={handleHeaderSearchChange}
          patients={patients() || []}
          doctors={doctors() || []}
          onSearchSelect={handleGlobalSearchSelect}
          onNewAppointmentClick={scrollToAppointmentForm}
          onLogout={handleLogout}
          isBlurred={isBlurred()}
          onToggleBlur={handleToggleBlur}
        />

        {/* CONTENT WRAPPER (for blur overlay) */}
        <div class="relative flex-1 flex flex-col">
          {/* Alerts */}
          <div class="max-w-6xl w-full mx-auto px-4 pt-3 space-y-2">
            <Show when={error()}>
              <div class="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
                {error()}
              </div>
            </Show>
            <Show when={success()}>
              <div class="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-700">
                {success()}
              </div>
            </Show>
          </div>

          {/* MAIN CONTENT */}
          <main class="flex-1">
            <div class="max-w-6xl w-full mx-auto px-4 py-4 space-y-4">
              {/* Today snapshot */}
              <TodaySchedule
                appointments={allAppointments()}
                patients={patients()}
                doctors={doctors()}
                onSelectPatient={handleSelectPatient}
                selectedPatientId={selectedPatientId()}
              />

              {/* Main 2-column layout */}
              <div class="grid grid-cols-1 md:grid-cols-[minmax(0,2.1fr),minmax(0,1.4fr)] gap-4 items-start">
                {/* Left: Patient/Doctor details + appointments */}
                <section class="bg-white border border-gray-200 rounded-xl shadow-sm p-4 md:p-5">
                  <Show
                    when={activePeopleTab() === "patients"}
                    fallback={
                      <DoctorDetails
                        doctor={selectedDoctor()}
                        doctors={doctors() || []}
                        appointments={doctorAppointments()}
                        patients={patients() || []}
                        allAppointments={allAppointments() || []}
                        onUpdateDoctor={handleUpdateDoctor}
                        onDeleteAppointment={handleDeleteAppointment}
                        onUpdateAppointment={handleUpdateAppointment}
                        onSelectPatient={handleSelectPatient}
                        specialtyOptions={specialtyOptions()}
                      />
                    }
                  >
                    <Show
                      when={!patients.loading && !doctors.loading}
                      fallback={
                        <div class="text-sm text-gray-500">Loading data…</div>
                      }
                    >
                      <PatientDetails
                        patient={selectedPatient()}
                        appointments={patientAppointments()}
                        allAppointments={allAppointments() || []}
                        doctors={doctors() || []}
                        doctorMap={doctorMap()}
                        onUpdatePatient={handleUpdatePatient}
                        onCreateAppointment={handleCreateAppointment}
                        onUpdateAppointment={handleUpdateAppointment}
                        onDeleteAppointment={handleDeleteAppointment}
                        genderOptions={genderOptions()}
                        onSelectDoctor={handleSelectDoctor}
                      />
                    </Show>
                  </Show>
                </section>

                {/* Right: People tabs (lists + quick add) */}
                <section class="bg-white border border-gray-200 rounded-xl shadow-sm p-4 md:p-5">
                  <PeopleTabs
                    // tab state
                    activeTab={activePeopleTab()}
                    onChangeTab={setActivePeopleTab}
                    // patients
                    patients={patients()}
                    patientsLoading={patients.loading}
                    patientSearch={patientSearch()}
                    onSelectPatient={handleSelectPatient}
                    selectedPatientId={selectedPatientId()}
                    onDeletePatient={handleDeletePatient}
                    onCreatePatient={handleCreatePatient}
                    genderOptions={genderOptions()}
                    // doctors
                    doctors={doctors()}
                    doctorsLoading={doctors.loading}
                    onSelectDoctor={handleSelectDoctor}
                    selectedDoctorId={selectedDoctorId()}
                    onDeleteDoctor={handleDeleteDoctor}
                    onCreateDoctor={handleCreateDoctor}
                    specialtyOptions={specialtyOptions()}
                  />
                </section>
              </div>

              {/* Bottom action bar */}
              <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 pt-2 border-t border-gray-200">
                <div class="text-xs text-gray-500">
                  {/* When on Patients tab and a patient is selected */}
                  <Show
                    when={
                      activePeopleTab() === "patients" && selectedPatient()
                    }
                  >
                    {(p) => (
                      <span>
                        Selected patient:{" "}
                        <span class="font-medium text-gray-800">
                          {p().name}
                        </span>
                        <span class="text-gray-500">
                          {" "}
                          (ID {p().id}
                          {p().age != null ? ` · ${p().age} yrs` : ""}
                          {p().gender ? ` · ${p().gender}` : ""}
                          )
                        </span>
                      </span>
                    )}
                  </Show>

                  {/* When on Doctors tab and a doctor is selected */}
                  <Show
                    when={activePeopleTab() === "doctors" && selectedDoctor()}
                  >
                    {(d) => (
                      <span>
                        Selected doctor:{" "}
                        <span class="font-medium text-gray-800">
                          {d().name}
                        </span>
                        <span class="text-gray-500">
                          {" "}
                          (ID {d().id}
                          {d().specialty ? ` · ${d().specialty}` : ""}
                          )
                        </span>
                      </span>
                    )}
                  </Show>

                  {/* Fallback when nothing relevant is selected */}
                  <Show
                    when={
                      !(
                        (activePeopleTab() === "patients" &&
                          selectedPatient()) ||
                        (activePeopleTab() === "doctors" && selectedDoctor())
                      )
                    }
                  >
                    <span>No patient or doctor selected.</span>
                  </Show>
                </div>

                <div class="flex gap-2">
                  {/* Patient actions only when a patient is selected */}
                  <Show
                    when={
                      selectedPatient() && activePeopleTab() === "patients"
                    }
                  >
                    <button
                      type="button"
                      class="inline-flex items-center rounded-full border border-primary/60 px-4 py-1.5 text-sm font-medium text-primary bg-white hover:bg-primary/5 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => {
                        const evt = new CustomEvent("edit-patient", {
                          detail: { patientId: selectedPatientId() },
                        });
                        window.dispatchEvent(evt);
                      }}
                    >
                      Edit patient
                    </button>
                    <button
                      type="button"
                      class="inline-flex items-center rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => {
                        scrollToAppointmentForm();
                        window.dispatchEvent(
                          new Event("highlight-new-appointment")
                        );
                      }}
                    >
                      Add appointment
                    </button>
                  </Show>
                </div>
              </div>
            </div>
          </main>

          {/* BLUR OVERLAY (covers alerts + main, but not header/footer) */}
          <Show when={isBlurred()}>
            <div
              class="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-30 
                     flex flex-col items-center justify-center text-center px-4 cursor-pointer"
              onClick={handleToggleBlur}
            >
              <p class="text-sm font-medium text-white mb-1">
                Screen blurred for privacy
              </p>
              <p class="text-[11px] text-gray-200 max-w-md">
                Click anywhere here or use the Unblur button in the header to
                resume viewing patient information.
              </p>
            </div>
          </Show>
        </div>

        {/* FOOTER */}
        <Footer />
      </div>
    </Show>
  );
};

export default App;
