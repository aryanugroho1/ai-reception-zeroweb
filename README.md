# AI Receptionist Zeroweb 🏥🤖

AI Receptionist & Clinical Management Platform built for medical practices, clinics, and psychiatric centers. Features intelligent multi-channel patient intake, automated appointment booking, payment gateway integration, and a Doctor Copilot dashboard.

---

## 🌟 Key Features

- **Multi-Channel Patient Ingress**: Omnichannel support (WhatsApp Webhook / Web Chat Simulator) with clinical intent extraction & triage routing.
- **Doctor Copilot & Clinical Dashboard**: Automated clinical intake summaries, SOAP draft generation, risk flags, and real-time appointment management.
- **Automated Scheduling & Rescheduling**: Rescheduling workflows with smart slot matching, cancellation management, and patient notifications.
- **Payment Gateway Integration**: Secure payment generation and idempotent webhook processing via [Mayar](https://mayar.id).
- **Multi-Tier Clinic Licensing**: Feature gating and usage quota enforcement across Starter, Pro, and Enterprise clinic tiers.
- **Deterministic & Idempotent Architecture**: End-to-end idempotency for webhooks, booking requests, and transactions to prevent double-booking.

---

## 🏗️ Architecture & Tech Stack

- **Frontend**: Vanilla HTML5, Modern CSS (Glassmorphism & Medical Theme), Vanilla JavaScript.
- **Backend**: Node.js HTTP Service, In-Memory DB with transactional atomic locks and Mock LLM triage engine.
- **APIs**: RESTful endpoints for booking, reschedule, webhook callbacks, triage, and doctor notes.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ installed

### 2. Running Locally

Start the backend and frontend dev server:
```bash
node serve.js
```
The application will be accessible at:
- **Patient Portal**: `http://localhost:3000/`
- **Admin & Doctor Dashboard**: `http://localhost:3000/admin.html`

### 3. Running Backend Tests
Execute the comprehensive automated test suite:
```bash
node backend/test_suite.js
```

---

## 📂 Project Structure

```
├── admin.html          # Doctor Copilot & Clinic Administration Portal
├── admin.css           # Styling for Admin Portal
├── admin.js            # Admin Dashboard state management & real-time updates
├── index.html          # Patient Ingress & Appointment Booking Web Interface
├── index.css           # UI Design System & Responsive Layouts
├── app.js              # Patient-facing client logic & chat triage engine
├── serve.js            # Local server runner
├── backend/
│   ├── database.js     # Data store & schema definitions
│   ├── ingress_router.js # Omnichannel triage & router
│   ├── reschedule.js   # Slot shifting & reschedule logic
│   ├── mayar_service.js # Payment link & webhook processing
│   ├── idempotency.js  # Deduplication & lock mechanism
│   ├── doctor_copilot.js # SOAP notes & clinical summaries
│   ├── tier_gating.js  # Feature flags & quota validation
│   ├── server.js       # Core backend router & API endpoints
│   └── test_suite.js   # Automated integration and edge-case tests
├── PRD.md              # Product Requirement Document
└── AGENT.md            # AI Agent execution guidelines
```

---

## 📄 License
ISC / Private
