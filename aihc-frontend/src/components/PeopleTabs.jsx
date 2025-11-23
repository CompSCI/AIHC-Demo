// src/components/PeopleTabs.jsx
import { Show } from "solid-js";
import PatientList from "./PatientList";
import DoctorList from "./DoctorList";

const PeopleTabs = (props) => {
  const tabButtonBase =
    "relative px-3 py-1.5 text-xs md:text-sm font-medium rounded-full transition";
  const tabActive = "bg-primary text-white shadow-sm";
  const tabInactive = "text-gray-600 hover:bg-gray-100";

  const isPatients = () => props.activeTab === "patients";
  const isDoctors = () => props.activeTab === "doctors";

  return (
    <section class="bg-white border border-gray-200 rounded-xl shadow-sm p-3 md:p-4 h-full">
      {/* Tabs header */}
      <div class="flex items-center justify-between mb-3">
        <div class="inline-flex items-center bg-gray-100 rounded-full p-1">
          <button
            type="button"
            classList={{
              [tabButtonBase]: true,
              [tabActive]: isPatients(),
              [tabInactive]: !isPatients(),
            }}
            onClick={() => props.onChangeTab?.("patients")}
          >
            Patients
          </button>
          <button
            type="button"
            classList={{
              [tabButtonBase]: true,
              [tabActive]: isDoctors(),
              [tabInactive]: !isDoctors(),
            }}
            onClick={() => props.onChangeTab?.("doctors")}
          >
            Doctors
          </button>
        </div>
      </div>

      {/* Tab content */}
      <Show
        when={isPatients()}
        fallback={
          <DoctorList
            doctors={props.doctors}
            loading={props.doctorsLoading}
            selectedDoctorId={props.selectedDoctorId}
            onSelectDoctor={props.onSelectDoctor}
            onDeleteDoctor={props.onDeleteDoctor}
            onCreateDoctor={props.onCreateDoctor}
            specialtyOptions={props.specialtyOptions}
          />
        }
      >
        <PatientList
          patients={props.patients}
          loading={props.patientsLoading}
          searchValue={props.patientSearch}
          onSelectPatient={props.onSelectPatient}
          selectedPatientId={props.selectedPatientId}
          onDeletePatient={props.onDeletePatient}
          onCreatePatient={props.onCreatePatient}
          genderOptions={props.genderOptions}
        />
      </Show>
    </section>
  );
};

export default PeopleTabs;
