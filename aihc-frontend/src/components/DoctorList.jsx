// src/components/DoctorList.jsx
import { For, Show, createSignal, createMemo } from "solid-js";

const DoctorList = (props) => {
  const [name, setName] = createSignal("");
  const [specialty, setSpecialty] = createSignal("");
  const [bio, setBio] = createSignal("");
  const [useCustomSpecialty, setUseCustomSpecialty] = createSignal(false);

  // Filter state
  const [specialtyFilter, setSpecialtyFilter] = createSignal("");

  // Inline delete confirmation state (for doctors)
  const [pendingDeleteDoctorId, setPendingDeleteDoctorId] =
    createSignal(null);

  // Per-field validation error state for quick-add
  const [nameError, setNameError] = createSignal(false);
  const [specialtyError, setSpecialtyError] = createSignal(false);
  const [bioError, setBioError] = createSignal(false);

  // Labels for fields that are currently invalid
  const missingFields = createMemo(() => {
    const list = [];
    if (nameError()) list.push("Name");
    if (specialtyError()) list.push("Specialty");
    if (bioError()) list.push("Bio");
    return list;
  });

  const getLastName = (fullName = "") => {
    const parts = fullName.trim().split(/\s+/);
    return (parts[parts.length - 1] || "").toLowerCase();
  };

  const requestDeleteDoctor = (id, e) => {
    e?.stopPropagation?.();
    setPendingDeleteDoctorId(id);
  };

  const cancelDeleteDoctor = (e) => {
    e?.stopPropagation?.();
    setPendingDeleteDoctorId(null);
  };

  const confirmDeleteDoctor = async (e) => {
    e?.stopPropagation?.();
    const id = pendingDeleteDoctorId();
    if (!id || !props.onDeleteDoctor) return;

    await props.onDeleteDoctor(id);
    setPendingDeleteDoctorId(null);
  };

  const doctors = () => props.doctors || [];

  // Derived: doctors filtered by selected specialty, then sorted by last name
  const filteredDoctors = createMemo(() => {
    const list = doctors();
    const f = specialtyFilter();

    const filtered = f
      ? list.filter((d) => d.specialty === f)
      : list;

    return [...filtered].sort((a, b) =>
      getLastName(a.name).localeCompare(getLastName(b.name))
    );
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nameVal = name().trim();
    const specialtyVal = specialty().trim();
    const bioVal = bio().trim();

    const missingName = !nameVal;
    const missingSpecialty = !specialtyVal;
    const missingBio = !bioVal;

    // Update error state
    setNameError(missingName);
    setSpecialtyError(missingSpecialty);
    setBioError(missingBio);

    // If any missing, show warning and do not submit
    if (missingName || missingSpecialty || missingBio) {
      return;
    }

    // All good → clear errors
    setNameError(false);
    setSpecialtyError(false);
    setBioError(false);

    await props.onCreateDoctor?.({
      name: nameVal,
      specialty: specialtyVal,
      bio: bioVal,
    });

    setName("");
    setSpecialty("");
    setBio("");
    setUseCustomSpecialty(false);
  };

  const handleSpecialtySelectChange = (e) => {
    const val = e.currentTarget.value;
    if (val === "__custom") {
      setUseCustomSpecialty(true);
      if (!specialty()) setSpecialty("");
    } else {
      setUseCustomSpecialty(false);
      setSpecialty(val);
      if (val.trim()) {
        setSpecialtyError(false);
      }
    }
  };

  return (
    <div class="flex flex-col h-full">
      <div class="flex items-center justify-between mb-3 gap-2">
        <div>
          <h2 class="text-sm md:text-base font-semibold text-gray-900">
            Doctors
          </h2>
          <p class="text-[11px] text-gray-500">
            {filteredDoctors().length} of {doctors().length} doctor
            {doctors().length === 1 ? "" : "s"}
          </p>
        </div>

        {/* Filter by specialty */}
        <div class="flex items-center gap-1">
          <label class="hidden md:inline text-[11px] text-gray-500">
            Filter:
          </label>
          <select
            class="text-[11px] rounded-md border border-gray-300 bg-white px-2 py-1 
                   text-gray-900 focus:outline-none focus:ring-1 focus:ring-primary"
            value={specialtyFilter()}
            onInput={(e) => setSpecialtyFilter(e.currentTarget.value)}
          >
            <option value="">All specialties</option>
            <For each={props.specialtyOptions || []}>
              {(s) => <option value={s}>{s}</option>}
            </For>
          </select>
        </div>
      </div>

      {/* List */}
      <div class="flex-1 max-h-[500px] overflow-y-auto border border-gray-100 rounded-lg mb-3">
        <Show
          when={!props.loading}
          fallback={
            <div class="p-3 text-xs text-gray-500">Loading doctors…</div>
          }
        >
          <Show
            when={filteredDoctors().length > 0}
            fallback={
              <div class="p-3 text-xs text-gray-500">
                No doctors found matching this specialty.
              </div>
            }
          >
            <ul class="divide-y divide-gray-100">
              <For each={filteredDoctors()}>
                {(d) => (
                  <li
                    data-doctor-id={d.id}
                    classList={{
                      "px-3 py-2.5 cursor-pointer text-xs transition border-l-4 border-l-transparent":
                        true,
                      "bg-primary/5 !border-l-primary":
                        props.selectedDoctorId === d.id,
                      "hover:bg-gray-50": props.selectedDoctorId !== d.id,
                    }}
                    onClick={() => props.onSelectDoctor?.(d.id)}
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <div class="font-medium text-gray-900 truncate">
                          {d.name}
                        </div>
                        <div class="text-[11px] text-gray-500 truncate">
                          {d.specialty || "Specialty N/A"}
                        </div>
                        <Show when={d.bio}>
                          <div class="mt-1 text-[11px] text-gray-600 line-clamp-2">
                            {d.bio}
                          </div>
                        </Show>
                      </div>

                      <div class="flex flex-col items-end gap-1 shrink-0">
                        {/* Delete trigger */}
                        <button
                          type="button"
                          class="text-[11px] text-red-500 hover:text-red-600"
                          onClick={(e) => requestDeleteDoctor(d.id, e)}
                        >
                          Delete
                        </button>

                        {/* Inline delete confirmation */}
                        <Show when={pendingDeleteDoctorId() === d.id}>
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
                              onClick={confirmDeleteDoctor}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              class="inline-flex items-center rounded-full border border-red-300 px-2 py-0.5 text-[11px] font-medium text-red-700 bg-red-50 hover:bg-red-100 transition"
                              onClick={cancelDeleteDoctor}
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
          Quick add doctor
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

          {/* Select of known specialties + "Other" */}
          <select
            class={`w-full text-xs rounded-md border bg-white px-2 py-1.5 
                     text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 ${
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

          {/* Custom specialty input when "Other" is chosen */}
          <Show when={useCustomSpecialty()}>
            <input
              class={`mt-2 w-full text-xs rounded-md border bg-white px-2 py-1.5 
                       text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 ${
                         specialtyError()
                           ? "border-red-400 bg-red-50 focus:ring-red-400"
                           : "border-gray-300 focus:ring-primary"
                       }`}
              placeholder="Enter specialty"
              value={specialty()}
              onInput={(e) => {
                const v = e.currentTarget.value;
                setSpecialty(v);
                if (v.trim()) setSpecialtyError(false);
              }}
            />
          </Show>

          {/* Bio */}
          <div>
            <label class="block text-[11px] text-gray-600 mb-1">
              Bio / notes
            </label>
            <textarea
              rows={2}
              class={`w-full text-xs rounded-md border bg-white px-2 py-1.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 ${
                bioError()
                  ? "border-red-400 bg-red-50 focus:ring-red-400"
                  : "border-gray-300 focus:ring-primary"
              }`}
              placeholder="Brief bio or notes…"
              value={bio()}
              onInput={(e) => {
                const v = e.currentTarget.value;
                setBio(v);
                if (v.trim()) setBioError(false);
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
            Add doctor
          </button>
        </form>
      </div>
    </div>
  );
};

export default DoctorList;
