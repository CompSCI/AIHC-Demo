import { createSignal, createMemo, Show, For } from "solid-js";

const Header = (props) => {
  const isBlurred = () => props.isBlurred;

  const [activeSearchTab, setActiveSearchTab] = createSignal("patients");

  const sortByName = (a, b) => {
    const getParts = (name) => {
      const parts = name.trim().split(/\s+/);
      const last = parts.pop().toLowerCase();   // last name
      const first = parts.join(" ").toLowerCase(); // first + middle
      return { last, first };
    };

    const A = getParts(a.name);
    const B = getParts(b.name);

    // Sort by last name
    if (A.last !== B.last) return A.last.localeCompare(B.last);

    // Then by first name(s)
    return A.first.localeCompare(B.first);
  };

  const query = createMemo(() =>
    (props.searchValue || "").toLowerCase().trim()
  );

  const patientResults = createMemo(() => {
    const q = query();
    if (!q) return [];
    const list = props.patients || [];

    return list
      .filter((p) => p.name.toLowerCase().includes(q))
      .sort(sortByName)      // <-- ADD THIS
      // .slice(0, 50);
  });

  const doctorResults = createMemo(() => {
    const q = query();
    if (!q) return [];
    const list = props.doctors || [];

    return list
      .filter((d) => d.name.toLowerCase().includes(q))
      .sort(sortByName)     // <-- ADD
      // .slice(0, 50);
  });

  const hasAnyResults = createMemo(
    () => patientResults().length > 0 || doctorResults().length > 0
  );

  const showDropdown = createMemo(
    () => query().length > 0
  );

  const handleResultClick = (kind, id) => {
    props.onSearchSelect?.({ kind, id });
  };

  return (
    <header
      class="
        sticky top-0 z-40
        bg-bg-main/95 backdrop-blur
        text-white
      "
    >
      <div class="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo / title */}
        <div class="flex items-center gap-2 flex-shrink-0">
          <div class="h-9 w-9 rounded-xl bg-primary/90 flex items-center justify-center text-sm font-bold shadow-md">
            HC
          </div>
          {/* Hide text block on very small screens */}
          <div class="hidden sm:block">
            <h1 class="text-lg font-semibold tracking-tight">
              AI Health Chains Portal
            </h1>
            <p class="text-[11px] text-gray-200">
              Patients · Doctors · Appointments
            </p>
          </div>
        </div>

        {/* Search */}
        <div class="flex-1 max-w-xs sm:max-w-sm">
          <div class="relative">
            <input
              type="text"
              class="
                w-full rounded-full border border-primary/50
                bg-bg-main/80
                px-3 sm:px-4
                py-1.5
                pr-7 sm:pr-8
                text-[11px] sm:text-xs
                text-white placeholder:text-gray-300
                focus:outline-none focus:ring-1 focus:ring-primary
              "
              placeholder="Search patients & doctors by name..."
              value={props.searchValue || ""}
              onInput={(e) => props.onSearchChange?.(e.currentTarget.value)}
            />
            <div class="pointer-events-none absolute inset-y-0 right-2 sm:right-3 flex items-center text-gray-300 text-[10px] sm:text-xs">
              🔍
            </div>

            {/* Search dropdown */}
            <Show when={showDropdown()}>
              <div
                class="
                  absolute mt-1 w-full
                  rounded-lg border border-gray-700/60 bg-slate-900/95
                  shadow-lg z-50
                  text-[11px]
                "
              >
                {/* Tabs */}
                <div class="flex items-center justify-between px-2 pt-1 pb-1 border-b border-gray-700/80">
                  <div class="inline-flex bg-slate-800/80 rounded-full p-0.5">
                    <button
                      type="button"
                      class={`px-2 py-0.5 rounded-full font-medium ${
                        activeSearchTab() === "patients"
                          ? "bg-primary text-white"
                          : "text-gray-300 hover:bg-slate-700"
                      }`}
                      onClick={() => setActiveSearchTab("patients")}
                    >
                      Patients ({patientResults().length})
                    </button>
                    <button
                      type="button"
                      class={`px-2 py-0.5 rounded-full font-medium ${
                        activeSearchTab() === "doctors"
                          ? "bg-primary text-white"
                          : "text-gray-300 hover:bg-slate-700"
                      }`}
                      onClick={() => setActiveSearchTab("doctors")}
                    >
                      Doctors ({doctorResults().length})
                    </button>
                  </div>
                  <span class="text-[10px] text-gray-400 hidden sm:inline">
                    {query()}
                  </span>
                </div>

                {/* Results OR global empty state */}
                <Show
                  when={hasAnyResults()}
                  fallback={
                    <div class="px-3 py-2 text-gray-400 text-[11px]">
                      No patients or doctors match "{query()}".
                    </div>
                  }
                >
                  <div class="max-h-64 overflow-y-auto">
                    <Show
                      when={
                        activeSearchTab() === "patients"
                          ? patientResults().length > 0
                          : doctorResults().length > 0
                      }
                      fallback={
                        <div class="px-3 py-2 text-gray-400">
                          No {activeSearchTab()} match "{query()}".
                        </div>
                      }
                    >
                      <ul class="py-1">
                        <For
                          each={
                            activeSearchTab() === "patients"
                              ? patientResults()
                              : doctorResults()
                          }
                        >
                          {(item) => (
                            <li>
                              <button
                                type="button"
                                class="
                                  w-full text-left px-3 py-1.5
                                  hover:bg-slate-800
                                  flex flex-col
                                "
                                onClick={() =>
                                  handleResultClick(
                                    activeSearchTab() === "patients"
                                      ? "patient"
                                      : "doctor",
                                    item.id
                                  )
                                }
                              >
                                <span class="font-medium text-gray-100 truncate">
                                  {item.name}
                                </span>
                                <Show when={activeSearchTab() === "patients"}>
                                  <span class="text-[10px] text-gray-400">
                                    Patient ·{" "}
                                    {item.age != null ? `${item.age} yrs` : "Age N/A"}
                                    {item.gender ? ` · ${item.gender}` : ""}
                                  </span>
                                </Show>
                                <Show when={activeSearchTab() === "doctors"}>
                                  <span class="text-[10px] text-gray-400">
                                    Doctor
                                    {item.specialty ? ` · ${item.specialty}` : ""}
                                  </span>
                                </Show>
                              </button>
                            </li>
                          )}
                        </For>
                      </ul>
                    </Show>
                  </div>
                </Show>
              </div>
            </Show>
          </div>
        </div>

        {/* Actions: icon-only on mobile, icon + label on sm+ */}
        <div class="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Blur toggle */}
          <button
            type="button"
            class="
              inline-flex items-center justify-center
              rounded-full border border-primary/60
              bg-bg-main
              px-2 py-1 sm:px-3 sm:py-1.5
              text-[11px] font-semibold text-primary
              hover:bg-primary/15 transition
            "
            onClick={() => props.onToggleBlur?.()}
          >
            <svg
              viewBox="0 0 24 24"
              class="h-4 w-4"
              aria-hidden="true"
              fill="currentColor"
            >
              <circle cx="7" cy="7" r="3" />
              <circle cx="17" cy="7" r="3" />
              <circle cx="12" cy="17" r="3" />
            </svg>
            <span class="hidden sm:inline ml-1">
              {props.isBlurred ? "Unblur" : "Blur"}
            </span>
          </button>

          {/* Logout */}
          <button
            type="button"
            class="
              inline-flex items-center justify-center
              rounded-full bg-primary
              px-2 py-1 sm:px-3 sm:py-1.5
              text-[11px] font-semibold text-bg-main
              shadow hover:bg-primary/90 transition
            "
            onClick={() => props.onLogout?.()}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 12H4m0 0 4-4M4 12l4 4"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 5h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2"
              />
            </svg>
            <span class="hidden sm:inline ml-1">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;


