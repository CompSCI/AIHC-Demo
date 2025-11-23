import { For, Show, createSignal, createMemo } from "solid-js";

const PatientList = (props) => {
  // Local quick-add form
  const [name, setName] = createSignal("");
  const [age, setAge] = createSignal("");
  const [gender, setGender] = createSignal("");
  const [history, setHistory] = createSignal("");

  // Per-field validation error state (all fields required)
  const [nameError, setNameError] = createSignal(false);
  const [ageError, setAgeError] = createSignal(false);
  const [genderError, setGenderError] = createSignal(false);
  const [historyError, setHistoryError] = createSignal(false);

  // Inline delete confirmation state
  const [pendingDeletePatientId, setPendingDeletePatientId] =
    createSignal(null);

  const requestDeletePatient = (id, e) => {
    e?.stopPropagation?.();
    setPendingDeletePatientId(id);
  };

  const cancelDeletePatient = (e) => {
    e?.stopPropagation?.();
    setPendingDeletePatientId(null);
  };

  const confirmDeletePatient = async (e) => {
    e?.stopPropagation?.();
    const id = pendingDeletePatientId();
    if (!id || !props.onDeletePatient) return;

    await props.onDeletePatient(id);
    setPendingDeletePatientId(null);
  };

  const filteredPatients = createMemo(() => {
    const list = props.patients || [];
    const q = (props.searchValue || "").toLowerCase().trim();

    // Filter first
    const filtered = q
      ? list.filter((p) => p.name.toLowerCase().includes(q))
      : list;

    // Sort by last name
    return [...filtered].sort((a, b) => {
      const lastA = a.name.trim().split(" ").pop().toLowerCase();
      const lastB = b.name.trim().split(" ").pop().toLowerCase();
      return lastA.localeCompare(lastB);
    });
  });

  // Labels for fields that are currently invalid
  const missingFields = createMemo(() => {
    const list = [];
    if (nameError()) list.push("Name");
    if (ageError()) list.push("Age");
    if (genderError()) list.push("Gender");
    if (historyError()) list.push("Medical history / notes");
    return list;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nameVal = name().trim();
    const ageVal = age().trim();
    const genderVal = gender().trim();
    const historyVal = history().trim();

    const missingName = !nameVal;
    const missingAge = !ageVal;
    const missingGender = !genderVal;
    const missingHistory = !historyVal;

    // Update error state
    setNameError(missingName);
    setAgeError(missingAge);
    setGenderError(missingGender);
    setHistoryError(missingHistory);

    // If any missing, show warning and do not submit
    if (missingName || missingAge || missingGender || missingHistory) {
      return;
    }

    // All good → clear errors
    setNameError(false);
    setAgeError(false);
    setGenderError(false);
    setHistoryError(false);

    await props.onCreatePatient?.({
      name: nameVal,
      age: Number(ageVal),
      gender: genderVal,
      medicalHistory: historyVal,
    });

    setName("");
    setAge("");
    setGender("");
    setHistory("");
  };

  return (
    <div class="flex flex-col h-full">
      <div class="flex items-center justify-between mb-3">
        <div>
          <h2 class="text-sm md:text-base font-semibold text-gray-900">
            Patients
          </h2>
          <p class="text-[11px] text-gray-500">
            {filteredPatients().length} of {(props.patients || []).length}{" "}
            patients
          </p>
        </div>
      </div>

      {/* List */}
      <div class="flex-1 max-h-[500px] overflow-y-auto border border-gray-100 rounded-lg mb-3">
        <Show
          when={!props.loading}
          fallback={
            <div class="p-3 text-xs text-gray-500">Loading patients…</div>
          }
        >
          <Show
            when={filteredPatients().length > 0}
            fallback={
              <div class="p-3 text-xs text-gray-500">
                No patients match your search.
              </div>
            }
          >
            <ul class="divide-y divide-gray-100">
              <For each={filteredPatients()}>
                {(p) => (
                  <li
                    data-patient-id={p.id}
                    classList={{
                      "px-3 py-2.5 cursor-pointer text-xs transition border-l-4 border-l-transparent":
                        true,
                      "bg-primary/5 !border-l-primary":
                        props.selectedPatientId === p.id,
                      "hover:bg-gray-50": props.selectedPatientId !== p.id,
                    }}
                    onClick={() => props.onSelectPatient?.(p.id)}
                  >
                    <div class="flex items-center justify-between gap-2">
                      <div>
                        <div class="font-medium text-gray-900 truncate">
                          {p.name}
                        </div>
                        <div class="text-[11px] text-gray-500">
                          {p.age ? `${p.age} yrs` : "Age N/A"} ·{" "}
                          {p.gender || "Gender N/A"}
                        </div>
                      </div>

                      <div class="flex flex-col items-end gap-1">
                        {/* Delete trigger */}
                        <button
                          type="button"
                          class="text-[11px] text-red-500 hover:text-red-600"
                          onClick={(e) => requestDeletePatient(p.id, e)}
                        >
                          Delete
                        </button>

                        {/* Inline delete confirmation */}
                        <Show when={pendingDeletePatientId() === p.id}>
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
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span class="mr-2">Delete?</span>
                            <button
                              type="button"
                              class="inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-red-700 transition mr-1"
                              onClick={confirmDeletePatient}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              class="inline-flex items-center rounded-full border border-red-300 px-2 py-0.5 text-[11px] font-medium text-red-700 bg-red-50 hover:bg-red-100 transition"
                              onClick={cancelDeletePatient}
                            >
                              No
                            </button>
                          </div>
                        </Show>
                      </div>
                    </div>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </Show>
      </div>

      {/* Quick-add */}
      <div class="border border-dashed border-gray-200 rounded-lg p-3 bg-gray-50/60">
        <h3 class="text-xs font-semibold text-gray-800 mb-1.5">
          Quick add patient
        </h3>
        <form class="space-y-2" onSubmit={handleSubmit}>
          {/* Name */}
          <input
            class={`w-full text-xs rounded-md border bg-white px-2 py-1.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 ${
              nameError()
                ? "border-red-400 bg-red-50 focus:ring-red-400"
                : "border-gray-300 focus:ring-primary"
            }`}
            placeholder="Full name"
            value={name()}
            onInput={(e) => {
              const v = e.currentTarget.value;
              setName(v);
              if (v.trim()) setNameError(false);
            }}
          />

          <div class="flex gap-2">
            {/* Age */}
            <input
              type="number"
              min="0"
              class={`w-1/3 text-xs rounded-md border bg-white px-2 py-1.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 ${
                ageError()
                  ? "border-red-400 bg-red-50 focus:ring-red-400"
                  : "border-gray-300 focus:ring-primary"
              }`}
              placeholder="Age"
              value={age()}
              onInput={(e) => {
                const v = e.currentTarget.value;
                setAge(v);
                if (v.trim()) setAgeError(false);
              }}
            />

            {/* Gender */}
            <select
              class={`flex-1 text-xs rounded-md border bg-white px-2 py-1.5 text-gray-900 focus:outline-none focus:ring-1 ${
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
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>

          {/* Medical history / notes (required now) */}
          <div>
            <label class="block text-[11px] text-gray-600 mb-1">
              Medical history / notes
            </label>
            <textarea
              rows={2}
              class={`w-full text-xs rounded-md border bg-white px-2 py-1.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 ${
                historyError()
                  ? "border-red-400 bg-red-50 focus:ring-red-400"
                  : "border-gray-300 focus:ring-primary"
              }`}
              placeholder="Brief history or notes…"
              value={history()}
              onInput={(e) => {
                const v = e.currentTarget.value;
                setHistory(v);
                if (v.trim()) setHistoryError(false);
              }}
            />
          </div>

          {/* Inline validation summary */}
          <Show when={missingFields().length > 0}>
            <div class="mt-1 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              <div class="font-semibold mb-1">
                Please complete the highlighted field
                {missingFields().length > 1 ? "s" : ""}.
              </div>
              <div>Missing: {missingFields().join(", ")}</div>
            </div>
          </Show>

          <button
            type="submit"
            class="w-full inline-flex items-center justify-center rounded-md bg-primary text-xs font-semibold text-white py-1.5 hover:bg-primary/90 transition mt-1"
          >
            Add patient
          </button>
        </form>
      </div>
    </div>
  );
};

export default PatientList;
