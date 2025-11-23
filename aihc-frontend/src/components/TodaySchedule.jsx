import { For, Show, createMemo, createSignal } from "solid-js";

const TodaySchedule = (props) => {
  const [expanded, setExpanded] = createSignal(false);

  const todayAppointments = createMemo(() => {
    const appts = props.appointments || [];
    if (!appts.length) return [];

    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();

    const isSameDay = (dt) => {
      const date = new Date(dt);
      return (
        date.getFullYear() === y &&
        date.getMonth() === m &&
        date.getDate() === d
      );
    };

    return appts
      .filter((a) => isSameDay(a.dateTime))
      .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
  });

  const hasAppointments = () => todayAppointments().length > 0;

  const patientName = (id) => {
    const list = props.patients || [];
    const p = list.find((x) => x.id === id);
    return p?.name || `Patient #${id}`;
  };

  const doctorName = (id) => {
    const list = props.doctors || [];
    const d = list.find((x) => x.id === id);
    return d?.name || `Doctor #${id}`;
  };

  const doctorSpecialty = (id) => {
    const list = props.doctors || [];
    const d = list.find((x) => x.id === id);
    return d?.specialty || null;
  };

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <section class="bg-white border border-gray-200 rounded-xl shadow-sm p-4 md:p-5">
      {/* Header */}
      <div class="flex items-center justify-between mb-1.5">
        <div>
          <h2 class="text-sm md:text-base font-semibold text-gray-900">
            Today&apos;s schedule
          </h2>
          <p class="text-[11px] text-gray-500">{todayLabel}</p>
        </div>

        <div class="flex items-center gap-3 text-[11px] text-gray-500">
          <div>
            <Show when={hasAppointments()} fallback={<span>No appointments today</span>}>
              {todayAppointments().length} appointment
              {todayAppointments().length === 1 ? "" : "s"}
            </Show>
          </div>

          {/* Toggle only if there are appointments */}
          <Show when={hasAppointments()}>
            <button
              type="button"
              class="text-primary hover:text-primary/80 underline-offset-2 hover:underline"
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded() ? "Hide schedule" : "View schedule"}
            </button>
          </Show>
        </div>
      </div>

      {/* When no appointments at all */}
      <Show when={!hasAppointments()}>
        <div class="mt-2 text-xs text-gray-500">
          You&apos;re all clear for today. 🎉
        </div>
      </Show>

      {/* Expanded list */}
      <Show when={hasAppointments() && expanded()}>
        <div class="mt-3">
          <div class="max-h-[150px] overflow-y-auto flex flex-col gap-2 pr-1">
            <For each={todayAppointments()}>
              {(appt) => (
                <button
                  type="button"
                  class="w-full text-left rounded-lg border border-gray-200 hover:border-primary/70 hover:bg-primary/5 transition px-3 py-2 text-xs flex items-start justify-between gap-3"
                  onClick={() => props.onSelectPatient?.(appt.patientId)}
                >
                  <div>
                    <div class="text-gray-900 font-medium">
                      {new Date(appt.dateTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {patientName(appt.patientId)}
                    </div>
                    <div class="text-[11px] text-gray-500">
                      {doctorName(appt.doctorId)}
                      {doctorSpecialty(appt.doctorId)
                        ? ` · ${doctorSpecialty(appt.doctorId)}`
                        : ""}
                    </div>
                    <Show when={appt.reason}>
                      <div class="mt-1 text-[11px] text-gray-600 whitespace-normal break-words">
                        Reason: {appt.reason}
                      </div>
                    </Show>
                  </div>
                  <div class="text-[10px] rounded-full px-2 py-0.5 bg-bg-secondary text-gray-800">
                    {props.selectedPatientId === appt.patientId
                      ? "Selected"
                      : "View"}
                  </div>
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>
    </section>
  );
};

export default TodaySchedule;
