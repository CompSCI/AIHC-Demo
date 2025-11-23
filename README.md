---

# 🏥 AI Health Chains — Modern Medical Scheduling App

A polished, modern, real-time medical scheduling and patient-management system built with **Solid.js**, TailwindCSS, and a clean JSON-based backend API.
Provides fast workflows for **patients, doctors, appointments, conflict detection, editing, data sanitization**, and more.

---

## 🚀 Features

### 👨‍⚕️ Doctor Management

* Create, edit, and delete doctors
* Custom specialties or select from existing ones
* Editable bio/notes
* View full appointment history for each doctor
* Reassign appointments to different doctors
* Auto-detect scheduling conflicts

### 🧑‍🤝‍🧑 Patient Management

* Add/edit patient demographics
* Track age, gender, and medical history
* Automatic sanitization for special characters & emojis
* Full appointment list with quick actions
* Click a doctor's name to jump directly into their Doctor Details panel

### 📅 Appointment Scheduling

* 15-minute timeslot system
* Automatic snapping of odd times (e.g., `09:32 → 09:45`)
* Conflict detection & warning UI:
  * Doctor already booked in that slot
  * Patient already booked in that slot
* “Proceed Anyway” override for emergency scheduling
* Rescheduling and editing existing appointments
* Doctor availability validation

### 🔍 Global Patient Search

* Search field in the header
* Auto-switches to “Patients” tab when searching
* Smart filtering

### 🧼 Safe Input Handling

Every user text field (name, notes, history, bio, reason, etc.) is passed through a sanitization system that:

* Allows safe emojis and harmless characters
* Strips dangerous HTML/script tags

### 🎉 Toast Notifications

Nice, modern toast alerts for:

* Patient added / updated
* Doctor added / updated
* Appointment created / updated / deleted

### 🖥️ Custom UI Components

* Patient list with quick-edit
* Doctors list with specialty sorting
* Today’s schedule summary
* Sticky header/footer action bars
* Smooth scrolling to appointment section
* Highlight animation when opening "New Appointment"

---

## 🧱 Tech Stack

| Layer                | Technology                                |
| -------------------- | ----------------------------------------- |
| **Frontend**         | Solid.js, JSX, TailwindCSS                |
| **Notifications**    | `solid-toast`                             |
| **State Management** | Solid Signals & Memos                     |
| **Forms**            | Native HTML + dynamic validation          |
| **Backend (Demo)**   | Simple JSON API wrappers (`api.js`)       |
| **Security**         | Sanitization for all user-entered strings |

---

## 🗂 Project Structure

```
src/
  api.js
  App.jsx
  index.css
  index.jsx
  components/
  	DoctorDetails.jsx
  	DoctorList.jsx
  	Footer.jsx
    Header.jsx
    PatientDetails.jsx
    PatientList.jsx
    PeopleTabs.jsx
    TodaySchedule.jsx
  utils/
    sanitizeText.js
public/
README.md
```

---

## 🧠 Architecture Overview

### 1. **Global State**

Handled entirely inside `App.jsx` using Solid signals:

* `patients`, `doctors`, `allAppointments`
* `selectedPatientId` / `selectedDoctorId`
* `patientSearch`, `activePeopleTab`
* `appointmentsVersion` for reloading appointment data after changes

### 2. **Conflict Detection**

Both PatientDetails and DoctorDetails calculate conflicts by:

* Matching **doctor ID** (doctor is already booked)
* Matching **patient ID** (patient is already booked)
* Matching the same calendar day
* Snapping time to 15-minute increments
* Comparing against ALL appointments in the system
* Ignoring the appointment currently being edited
* Surfacing an inline warning with:
  * “Proceed Anyway” (allow double-booking)
  * “Change time” (keep you in edit mode)

### 3. **User Experience Enhancements**

* Smooth scroll to appointment form
* Flash highlight when clicking “Add Appointment”
* Inline yellow conflict warnings (instead of browser alerts)

### 4. Visual Feedback & UX

* Flash highlight animation (`.flash-highlight`) on:
  * New appointment form
  * Edit patient details card
  * Edit doctor details card
* Smooth scrolling to:
  * Patient appointment form when editing/creating
  * Doctor appointment edit form
* Inline, toast, and border-state feedback instead of blocking browser alerts

---

## 🛠 Installing & Running

**Note**: Assuming the backend is already running at `http://localhost:3000`

### 1. Clone Repo

```bash
git clone https://github.com/CompSCI/AIHC.git
-- OR --
git clone git@github.com:CompSCI/AIHC.git

cd aihc-frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Dev Server

```bash
npm run dev
```

### 4. Build Production

```bash
npm run build
```

## 🌐 Backend API Contract (Demo)

The frontend expects a simple JSON API at `http://localhost:3000` with endpoints like:

- `GET /patients` → list of patients
- `POST /patients` → create patient
- `PUT /patients/:id` → update patient
- `GET /doctors` → list of doctors
- `POST /doctors` → create doctor
- `PUT /doctors/:id` → update doctor
- `GET /appointments` → list of all appointments
- `POST /appointments` → create appointment
- `PUT /appointments/:id` → update appointment
- `DELETE /appointments/:id` → delete appointment

---

## ✨ Future Enhancements (Roadmap)

* Calendar month/week/day view
* Drag-and-drop appointment rescheduling
* Doctor availability profiles
* Email / SMS reminders
* Authentication & role-based admin
* Export / import patient charts
* Telemedicine video links

---

## 🤝 Contributing

Pull requests are welcome!
Please open an issue first to discuss major changes.

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

## 💬 Author

Project developed by **DeFiSCI**
Designed for real-world medical workflow demonstration and educational solid.js usage.

---


