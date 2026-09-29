Berikut adalah file dokumen lengkap **`PRD_WHATSAPP_PRACTICE_BOT.md`** yang telah menggabungkan seluruh komponen sistem: arsitektur multi-tenant, matriks konkurensi/idempotensi, PostgreSQL DDL lengkap, integrasi Mayar.id, sistem tier gating, superadmin panel, hingga landing page high-hook dengan interaktif CSS mockup WhatsApp.

---

```markdown
# Product Requirement Document (PRD): WhatsApp Multi-Tenant Practice Assistant Bot

| Metadata | Value |
|---|---|
| **Document Title** | WhatsApp Autonomous Practice & Appointment Assistant Engine |
| **Document Version** | 3.0.0-PROD-COMPLETE |
| **File Name** | `PRD_WHATSAPP_PRACTICE_BOT.md` |
| **Status** | Approved for Implementation |
| **Primary Interface** | WhatsApp Only (Conversational UI / Zero-Web UI for Patients & Tenants) |
| **Payment Gateway** | Mayar.id (Dynamic QRIS, Instant Invoicing, Webhook HMAC Verification) |
| **Target Pilot** | Solo Home-Practice Physicians (General Practitioners) & Home Dental Clinics |
| **Core Stack** | Node.js (TypeScript), `@whiskeysockets/baileys`, PostgreSQL (with `btree_gist`), Redis, QuickChart.io, LLM Function Calling |

---

## 1. Executive Summary & Problem Definition

### 1.1 Context & Background
Tenaga medis mandiri yang menjalankan praktek rumahan (seperti dokter umum dan dokter gigi) beroperasi dengan keterbatasan staf dan ruang fisik:
* **Keterbatasan Ruang:** Ruang tunggu rumahan sempit; penumpukan pasien mengganggu privasi keluarga dan kenyamanan lingkungan sekitar.
* **Distraksi Operasional:** Dokter terganggu saat memeriksa pasien karena harus menjawab pesan WhatsApp terkait ketersediaan jadwal atau status antrean.
* **Variasi Tindakan & Risiko No-Show:** Dokter gigi membutuhkan alokasi durasi yang berbeda untuk tiap tindakan (misal: scaling 40 menit vs ekstraksi 60 menit) dan rentan mengalami kerugian akibat pembatalan sepihak (*no-show*).
* **Friction Web UI:** Dokter enggan menggunakan dashboard web terpisah karena merepotkan harus membuka laptop atau login ke platform lain di luar aplikasi pesan instan.

### 1.2 Product Vision
Membangun platform asisten operasional praktek mandiri berbasis WhatsApp (*single-number multi-tenant gateway*) yang mengotomatisasi seluruh siklus reservasi pasien dan bertindak sebagai AI Copilot bagi praktisi medis tanpa antarmuka web sama sekali.

---

## 2. Personas & Stakeholders

| Persona | Profil & Karakteristik | Kebutuhan Utama |
|---|---|---|
| **Dokter Umum Rumahan** | Model antrean berjalan (*first-come, first-served*). Durasi periksa cepat (10–15 menit). | Notifikasi otomatis menjelang giliran pasien, perintah panggil sederhana (`NEXT`, `DONE`), dan kontrol kuota antrean harian. |
| **Dokter Gigi Mandiri** | Model berbasis slot presisi (*appointment-based*). Durasi tindakan 30–60 menit. | Pilihan tindakan terstandarisasi di awal booking, konfirmasi otomatis, self-service rescheduling, dan pengingat H-2 jam. |
| **Pasien / Customer** | Pengguna WhatsApp umum tanpa akun khusus. | Mengetahui perkiraan waktu periksa secara pasti, booking mandiri tanpa menunggu balasan manual, dan kemudahan memindahkan jadwal. |
| **System Operator (Dev)** | Pemilik bot dan infrastruktur SaaS. | Isolasi data multi-tenant yang aman, arsitektur basis data tahan konkurensi, monetisasi otomatis via Mayar.id, dan pembatasan fitur berbasis paket yang tepat. |

---

## 3. System Architecture & High-Level Design

### 3.1 Topology & Ingress Gateway
Satu nomor bot WhatsApp melayani banyak tenant dan seluruh pasien. Pesan masuk difilter di level ingress berdasarkan nomor pengirim (`senderJid`).


```

```
                      [ Inbound Message (Baileys) ]
                                    │
                                    ▼
                     [ Sender Authentication Gate ]
                                    │
             ┌──────────────────────┴──────────────────────┐
             ▼                                             ▼
 [ Sender ∈ Tenants Whitelist ]             [ Sender ∉ Tenants Whitelist ]
             │                                             │
             ▼                                             ▼
    [ Doctor AI Copilot ]                       [ Patient Booking FSM ]
    - Subscription & Tier Guard                 - Deep Link Slug Parser
    - Tool Calling Engine                       - Service & Slot Selection
    - Schedule Mutation                         - Self-Service Reschedule
    - Real-time Practice Control                - Queue Status Tracking
    - Analytics & Chart Image                              │
             │                                             │
             └──────────────────────┬──────────────────────┘
                                    ▼
                     [ Concurrency & Storage Layer ]
                     - PostgreSQL (UTC Timestamps)
                     - Distributed Lock & Idempotency
                     - Redis Session Cache

```

```

### 3.2 Timezone Strategy ("UTC Everywhere, Local on Edge")
* **Penyimpanan Database:** Seluruh kolom waktu wajib menggunakan `TIMESTAMPTZ` yang dikonversi dan disimpan dalam standar **UTC**.
* **Konfigurasi Tenant:** Setiap entitas bisnis memiliki metadata timezone berbasis IANA (contoh: `Asia/Jakarta`, `Asia/Makassar`, `Asia/Tokyo`, `Europe/London`).
* **Representasi Percakapan:** Semua tampilan waktu di WhatsApp (pilihan slot, konfirmasi tiket, laporan dokter) dikonversi dari UTC ke timezone lokal tenant yang bersangkutan sebelum dikirimkan.

---

## 4. Tier Packaging, Quotas & Feature Entitlement (Tier Gating)

Untuk memastikan pelanggan mendapatkan fitur yang tepat sesuai paket yang dibayar, sistem menerapkan mekanisme **Feature Entitlement Middleware & Quota Counter**.

### 4.1 Matriks Fitur & Batasan Berdasarkan Paket Langganan

| Dimensi Fitur | Starter (Rp 99.000 / bln) | Pro (Rp 199.000 / bln) | Clinic (Rp 349.000 / bln) | Lifetime Partner (Free Pilot) |
|---|---|---|---|---|
| **Batas Booking Bulanan** | Maks. 100 booking / bln | Maks. 400 booking / bln | **Unlimited** | Maks. 250 booking / bln |
| **Model Antrean** | Queue & Slot-based | Queue & Slot-based | Queue & Slot-based | Queue & Slot-based |
| **Interaksi Dokter** | Command Kaku (`NEXT`, `DONE`) | **AI Copilot (Free text / NLP)** | **AI Copilot (Free text / NLP)** | **AI Copilot (Free text / NLP)** |
| **Smart Nudge Timer** | ❌ Dinonaktifkan | ✅ Aktif (Alarm >20 mnt) | ✅ Aktif (Alarm >20 mnt) | ✅ Aktif |
| **Visual Chart Analytics**| ❌ Teks ringkasan saja | ✅ Gambar PNG (QuickChart) | ✅ Gambar PNG + AI Insight | ✅ Gambar PNG (QuickChart) |
| **Multi-Praktisi / Shift** | ❌ 1 Dokter saja | ❌ 1 Dokter saja | ✅ Multi-Dokter / Kapster | ❌ 1 Dokter saja |

---

### 4.2 Skema Evaluasi Hak Akses (Enforcement Implementation)

Setiap request dari dokter maupun booking baru dari pasien divalidasi melalui fungsi middleware:

```typescript
export interface TenantEntitlements {
  canUseAICopilot: boolean;
  canUseSmartNudge: boolean;
  canGenerateVisualCharts: boolean;
  maxMonthlyBookings: number;
  isMultiStaffSupported: boolean;
}

export const PLAN_LIMITS: Record<string, TenantEntitlements> = {
  STARTER: {
    canUseAICopilot: false,
    canUseSmartNudge: false,
    canGenerateVisualCharts: false,
    maxMonthlyBookings: 100,
    isMultiStaffSupported: false
  },
  PRO: {
    canUseAICopilot: true,
    canUseSmartNudge: true,
    canGenerateVisualCharts: true,
    maxMonthlyBookings: 400,
    isMultiStaffSupported: false
  },
  CLINIC: {
    canUseAICopilot: true,
    canUseSmartNudge: true,
    canGenerateVisualCharts: true,
    maxMonthlyBookings: 999999,
    isMultiStaffSupported: true
  },
  LIFETIME_PARTNER: {
    canUseAICopilot: true,
    canUseSmartNudge: true,
    canGenerateVisualCharts: true,
    maxMonthlyBookings: 250,
    isMultiStaffSupported: false
  }
};

// Middleware: Validasi Kuota Sebelum Pasien Memesan
export async function assertBookingQuotaAvailable(tenantId: string): Promise<void> {
  const tenant = await db.getTenantById(tenantId);
  const limits = PLAN_LIMITS[tenant.subscription_plan];
  
  const currentMonthBookings = await db.countMonthlyAppointments(tenantId);
  if (currentMonthBookings >= limits.maxMonthlyBookings) {
    throw new Error("BOOKING_QUOTA_EXHAUSTED");
  }
}

// Middleware: Validasi Perintah Dokter
export function assertFeatureAccess(plan: string, feature: keyof TenantEntitlements): boolean {
  return PLAN_LIMITS[plan]?.[feature] ?? false;
}

```

---

## 5. Conversational Frontend UI (CUI) & Subscription Flow

Seluruh antarmuka dokter dan pasien berjalan di WhatsApp menggunakan interactive component list dan buttons.

### 5.1 Tampilan Penawaran Langganan (Doctor Subscription Catalog)

Ketika dokter mengetik `LANGGANAN` atau masa uji coba 30 hari berakhir, bot merender katalog paket interaktif:

#### A. Payload Pesan Interaktif WhatsApp (List Message)

```json
{
  "title": "Pilihan Paket Asisten Praktek",
  "text": "Pilih paket langganan untuk mengaktifkan asisten otomatis WhatsApp Anda:\n\n1. *Starter (Rp 99.000/bln)*: Pasien booking mandiri, notif antrean, maks 100 pasien.\n2. *Pro (Rp 199.000/bln)*: AI Copilot bebas chat, alarm durasi periksa, grafik insight, maks 400 pasien.\n3. *Clinic (Rp 349.000/bln)*: Semua fitur Pro, kuota tanpa batas, multi-staf/dokter.",
  "buttonText": "Pilih Paket Langganan",
  "sections": [
    {
      "title": "Paket Rekomendasi",
      "rows": [
        {
          "rowId": "SUB_PLAN_PRO",
          "title": "Paket Pro (Rekomendasi)",
          "description": "Rp 199.000 / bln • AI Copilot + Grafik Visual"
        }
      ]
    },
    {
      "title": "Pilihan Paket Lainnya",
      "rows": [
        {
          "rowId": "SUB_PLAN_STARTER",
          "title": "Paket Starter",
          "description": "Rp 99.000 / bln • Perintah Dasar (Maks 100 Pasien)"
        },
        {
          "rowId": "SUB_PLAN_CLINIC",
          "title": "Paket Clinic / Multi-Staff",
          "description": "Rp 349.000 / bln • Kuota Unlimited + Multi-Dokter"
        }
      ]
    }
  ]
}

```

#### B. WhatsApp Quick Action Confirmation (Fallback Teks / Buttons)

Jika list message tidak didukung di nomor tujuan, bot mengirimkan teks dengan action button:

```text
┌──────────────────────────────────────────────┐
│        TAGIHAN AKTIVASI PAKET PRO            │
├──────────────────────────────────────────────┤
│ 🏷️ Paket: PRO MONTHLY (AI Copilot + Chart)    │
│ 💰 Nominal: Rp 199.000 / 30 Hari             │
│ 🛡️ Pembayaran: QRIS Otomatis (Mayar.id)      │
└──────────────────────────────────────────────┘
Tekan tombol di bawah untuk menampilkan kode QRIS pembayaran:

```

* Tombol 1: `[ Bayar QRIS Sekarang ]` (`BTN_PAY_QRIS_PRO`)
* Tombol 2: `[ Ganti Paket Lain ]` (`BTN_CHANGE_PLAN`)

---

## 6. Integrasi Payment Gateway Mayar.id

Mayar.id digunakan sebagai motor pembayaran dinamis (QRIS) dan invoice instan yang ramah registrasi perorangan (KYC KTP).

### 6.1 Alur Transaksi In-WhatsApp

```
[Dokter Pilih Paket di WhatsApp]
                │
                ▼
[Server Panggil Mayar.id API: POST /hl/v1/payment/create]
                │
                ▼
[Mayar Return Dynamic QR Image URL & Payment Link]
                │
                ▼
[Baileys Kirim Gambar QRIS + Link ke WhatsApp Dokter]
                │
                ▼
[Dokter Scan QRIS via BCA / Mandiri / GoPay / OVO]
                │
                ▼
[Mayar.id Mengirimkan Webhook: payment.received]
                │
                ▼
[Server Validasi Signature Token Webhook]
                │
                ▼
[Update Database: Tambah Masa Aktif +30 Hari]
                │
                ▼
[Baileys Kirim Pesan Konfirmasi Sukses & Receipt ke Dokter]

```

---

### 6.2 Integrasi API Backend Node.js (Membuat Tagihan Mayar.id)

```typescript
import axios from 'axios';

interface CreateMayarInvoiceParams {
  tenantId: string;
  planName: 'STARTER' | 'PRO' | 'CLINIC';
  amount: number;
  doctorPhone: string;
  doctorName: string;
}

export async function createMayarPayment(params: CreateMayarInvoiceParams) {
  const MAYAR_API_URL = "[https://api.mayar.id/hl/v1/payment/create](https://api.mayar.id/hl/v1/payment/create)";
  const MAYAR_API_KEY = process.env.MAYAR_API_KEY!;

  const payload = {
    name: params.doctorName,
    email: `doctor_${params.tenantId}@internal-bot.id`, // Virtual email identifier
    mobile: params.doctorPhone,
    amount: params.amount,
    description: `Langganan Bot Praktek - Paket ${params.planName} (30 Hari)`,
    redirectUrl: "[https://wa.me/](https://wa.me/)" + process.env.BOT_PHONE_NUMBER,
    expiredAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // Berlaku 30 menit
  };

  const response = await axios.post(MAYAR_API_URL, payload, {
    headers: {
      Authorization: `Bearer ${MAYAR_API_KEY}`,
      "Content-Type": "application/json"
    }
  });

  return {
    paymentId: response.data.data.id,
    paymentUrl: response.data.data.link,
    qrImageUrl: response.data.data.qrCode,
    expiresAt: payload.expiredAt
  };
}

```

---

### 6.3 Mayar.id Webhook Handler & Signature Verification

Endpoint penerima webhook dari Mayar.id (`POST /api/webhooks/mayar`):

```typescript
import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../database';
import { sock } from '../baileysInstance';

export async function handleMayarWebhook(req: Request, res: Response) {
  try {
    const signatureFromHeader = req.headers['x-mayar-signature'] as string;
    const webhookToken = process.env.MAYAR_WEBHOOK_TOKEN!;
    const payload = JSON.stringify(req.body);

    // 1. Verifikasi Signature Hash (HMAC-SHA256)
    const expectedSignature = crypto
      .createHmac('sha256', webhookToken)
      .update(payload)
      .digest('hex');

    if (signatureFromHeader !== expectedSignature) {
      console.warn("⚠️ Invalid Mayar Webhook Signature Rejected!");
      return res.status(403).json({ status: "error", message: "Invalid Signature" });
    }

    const event = req.body.event; // e.g. "payment.received"
    const data = req.body.data;

    if (event === "payment.received" && data.status === "SUCCESS") {
      const paymentRef = data.id;
      const invoice = await db.getInvoiceByPaymentRef(paymentRef);

      if (invoice && invoice.status === 'PENDING') {
        // 2. Eksekusi Transaksi Database Atomik
        await db.transaction(async (trx) => {
          await trx.updateInvoice(invoice.id, {
            status: 'PAID',
            paid_at: new Date()
          });

          await trx.extendTenantSubscription(
            invoice.tenant_id,
            invoice.plan,
            30 // Perpanjang 30 hari
          );
        });

        // 3. Notifikasi Instan ke WhatsApp Dokter via Baileys
        const tenant = await db.getTenantById(invoice.tenant_id);
        const confirmationMessage = 
          `✅ *Pembayaran Terkonfirmasi!*\n\n` +
          `Langganan *Paket ${invoice.plan}* Anda telah aktif untuk 30 hari ke depan.\n` +
          `• Total Bayar: *Rp ${Number(invoice.amount).toLocaleString('id-ID')}*\n` +
          `• Status Fitur: *Aktif Penuh*\n\n` +
          `Terima kasih telah mempercayakan asisten operasional praktek Anda. Ketik *MENU* untuk melihat opsi asisten.`;

        await sock.sendMessage(`${tenant.owner_phone}@s.whatsapp.net`, {
          text: confirmationMessage
        });
      }
    }

    return res.status(200).json({ status: "success" });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
}

```

---

## 7. Concurrency, Edge Cases & Idempotency Specification

Untuk menanggulangi pengiriman pesan berulang dari jaringan WhatsApp, retry webhook, dan perebutan slot secara simultan, sistem wajib memenuhi 7 matriks skenario berikut:

```
                          [ Incoming Booking Request ]
                                        │
                                        ▼
                     [ Generate Idempotency Key & Hash ]
                                        │
                                        ▼
                   [ Check `idempotency_records` Table ]
                                        │
                 ┌──────────────────────┼──────────────────────┐
                 ▼                      ▼                      ▼
           [ Not Found ]         [ IN_PROGRESS ]          [ RESOLVED ]
                 │                      │                      │
                 │                      │           ┌──────────┴──────────┐
                 │                      │           ▼                     ▼
                 │                      │     [ Hash Sama ]         [ Hash Beda ]
                 │                      │           │                     │
                 │                      │           ▼                     ▼
                 │                      │     (Return Cached      (Throw Inconsistency
                 │                      │        Response)               Error)
                 │                      ▼
                 │            (Concurrency Lock Race:
                 │             Wait / Backoff Retry)
                 ▼
        [ Acquire DB Lock ]
                 │
                 ▼
     [ Collision Check (GIST) ] ──(Collision)──> [ Rollback & Prompt Slot Lain ]
                 │
                 ▼
      [ Insert Appointment ]
                 │
                 ▼
  [ Update Idempotency: RESOLVED ]
                 │
                 ▼
          [ Send Ticket ]

```

### 7.1 Consideration Test Matrix & Detailed Behaviors

| No | Skenario | Kondisi Pemicu | Mekanisme Database & Sistem | Output Respons WhatsApp |
| --- | --- | --- | --- | --- |
| **1** | **Successful Booking** | Slot kosong, layanan aktif, key baru, kuota bulanan aman. | Buka transaksi $\rightarrow$ validasi `is_active` & kuota tier $\rightarrow$ periksa irisan waktu slot $\rightarrow$ insert `appointments` $\rightarrow$ set record idempotency ke `RESOLVED` $\rightarrow$ commit. | Menerbitkan tiket pendaftaran lengkap dengan detail tanggal, jam, kode booking, dan panduan batal/ubah. |
| **2** | **Occupied Slot** | Slot waktu target telah terisi oleh reservasi lain yang aktif. | Query mendeteksi irisan waktu (`scheduled_time` s/d `scheduled_time + duration`) berstatus non-cancelled. Transaksi dibatalkan secara bersih (*clean abort*). | *"Maaf, slot waktu pukul [HH:mm] baru saja terisi. Silakan pilih alternatif slot kosong berikut:"* (Menampilkan 3 opsi terdekat). |
| **3** | **Inactive Service** | Layanan dinonaktifkan dokter atau kuota harian telah ditutup. | Validasi `services.is_active = false` atau `tenants.is_accepting_patients = false`. Transaksi dihentikan sebelum menyentuh engine penjadwalan. | *"Layanan ini sedang tidak menerima reservasi baru saat ini. Silakan pilih layanan lain."* |
| **4** | **Clean Double-Booking Error** | Pasien yang sama mencoba memesan slot yang identik dua kali. | Database melempar error constraint violation (`unique_active_customer_slot`). Handler menangkap error secara terkontrol tanpa server crash. | *"Anda sudah terdaftar pada jadwal ini dengan Kode: #[KODE]. Tidak perlu mendaftar ulang."* |
| **5** | **Idempotent Repeated Request** | Jaringan pasien lag menyebabkan pesan identik terkirim dua kali dengan payload sama. | Record idempotency ditemukan berstatus `RESOLVED` dan payload hash cocok 100%. Melewati proses penulisan ke database dan mengambil data dari cache response. | Mengirimkan ulang detail tiket yang sama persis tanpa menduplikasi baris database atau nomor antrean. |
| **6** | **Idempotency Key Reused with Different Payload** | Key yang sama digunakan kembali namun payload berbeda (misal: modifikasi nama/layanan di detik yang sama). | Record idempotency ditemukan tetapi `current_payload_hash != existing_payload_hash`. Transaksi langsung ditolak (*Unprocessable Entity*). | *"Terjadi inkonsistensi data reservasi. Mohon ulangi proses pendaftaran dari awal."* |
| **7** | **Concurrent Same-Idempotency-Key Behavior** | Dua request dengan key identik dieksekusi simultan dalam selisih milidetik (*race condition*). | Request pertama memperoleh row-lock (`status = IN_PROGRESS`). Request kedua mendeteksi lock aktif, melakukan *exponential backoff*, lalu menerima output dari request pertama. | Request pertama memproses pemesanan hingga tuntas; request kedua menerima hasil yang telah diselesaikan oleh request pertama (tanpa duplikasi). |

---

## 8. Customer Self-Service Rescheduling Logic

Fitur ini memungkinkan pasien memindahkan jadwal periksa secara mandiri lewat WhatsApp tanpa campur tangan admin dokter.

### 8.1 Aturan Bisnis & Kebijakan Reschedule (Policy Rules)

* **Cutoff Time (Locking Window):** Reschedule mandiri hanya diizinkan maksimal **H-2 jam** (dikonfigurasi per tenant via `reschedule_cutoff_hours`) sebelum jadwal awal.
* **Max Reschedule Limit:** Pasien dibatasi melakukan reschedule maksimal **2 kali** per booking ID untuk mencegah eksploitasi penahanan slot kosong.
* **Atomic Swap:** Pengosongan slot lama dan klaim slot baru wajib dieksekusi dalam **satu database transaction (`SERIALIZABLE` / `SELECT ... FOR UPDATE`)**. Jika slot target baru gagal diklaim, jadwal lama tetap aman dan tidak hilang.

```sql
-- Atomic Swap Implementation
BEGIN;
SELECT id, reschedule_count, scheduled_time 
FROM appointments 
WHERE id = :old_appointment_id AND tenant_id = :tenant_id
FOR UPDATE;

UPDATE appointments 
SET status = 'CANCELLED', updated_at = NOW()
WHERE id = :old_appointment_id;

INSERT INTO appointments (
    tenant_id, service_id, customer_phone, customer_name,
    scheduled_time, status, parent_booking_id, reschedule_count
) VALUES (
    :tenant_id, :service_id, :customer_phone, :customer_name,
    :new_scheduled_time_utc, 'WAITING', :old_appointment_id, :reschedule_count + 1
);
COMMIT;

```

---

## 9. Database Schema Specification (PostgreSQL DDL)

Struktur basis data mencakup multi-tenancy, batasan paket, manajemen penagihan Mayar.id, dan tabel idempotensi.

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ENUM Definitions
CREATE TYPE scheduling_type_enum AS ENUM ('QUEUE', 'SLOT_BASED');
CREATE TYPE subscription_plan_enum AS ENUM ('LIFETIME_PARTNER', 'TRIAL', 'STARTER', 'PRO', 'CLINIC');
CREATE TYPE appointment_status_enum AS ENUM ('WAITING', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
CREATE TYPE idempotency_status_enum AS ENUM ('IN_PROGRESS', 'RESOLVED', 'REJECTED');
CREATE TYPE invoice_status_enum AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'FAILED');

-- 1. Tenants Table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    owner_phone VARCHAR(32) NOT NULL,
    category VARCHAR(64) NOT NULL,
    timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Jakarta',
    country_code VARCHAR(4) NOT NULL DEFAULT 'ID',
    scheduling_type scheduling_type_enum NOT NULL DEFAULT 'SLOT_BASED',
    is_accepting_patients BOOLEAN NOT NULL DEFAULT true,
    reschedule_cutoff_hours INT NOT NULL DEFAULT 2,
    max_reschedule_count INT NOT NULL DEFAULT 2,
    subscription_plan subscription_plan_enum NOT NULL DEFAULT 'TRIAL',
    subscription_until TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tenants_owner_phone ON tenants(owner_phone);
CREATE INDEX idx_tenants_slug ON tenants(slug);

-- 2. Services Table
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 30,
    price DECIMAL(12, 2) NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_services_tenant ON services(tenant_id);

-- 3. Appointments Table
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    service_id UUID NULL REFERENCES services(id) ON DELETE SET NULL,
    customer_phone VARCHAR(32) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    queue_number INT NULL,
    duration_minutes INT NOT NULL DEFAULT 30,
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_start_time TIMESTAMP WITH TIME ZONE NULL,
    actual_end_time TIMESTAMP WITH TIME ZONE NULL,
    status appointment_status_enum NOT NULL DEFAULT 'WAITING',
    parent_booking_id UUID NULL REFERENCES appointments(id),
    reschedule_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Anti-tumpang tindih waktu untuk tenant yang sama
    CONSTRAINT no_overlapping_appointments EXCLUDE USING gist (
        tenant_id WITH =,
        tstzrange(scheduled_time, scheduled_time + (duration_minutes || ' minutes')::interval) WITH &&
    ) WHERE (status NOT IN ('CANCELLED', 'NO_SHOW'))
);

CREATE UNIQUE INDEX unique_active_customer_slot 
ON appointments (tenant_id, customer_phone, scheduled_time) 
WHERE status NOT IN ('CANCELLED', 'NO_SHOW');

CREATE INDEX idx_appointments_lookup ON appointments(tenant_id, scheduled_time, status);

-- 4. Subscription Invoices (Integrasi Mayar.id)
CREATE TABLE subscription_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_number VARCHAR(64) UNIQUE NOT NULL,
    plan subscription_plan_enum NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_provider VARCHAR(32) NOT NULL DEFAULT 'MAYAR',
    payment_ref_id VARCHAR(255) NULL,
    status invoice_status_enum NOT NULL DEFAULT 'PENDING',
    payment_url TEXT NULL,
    qr_image_url TEXT NULL,
    paid_at TIMESTAMP WITH TIME ZONE NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_invoices_lookup ON subscription_invoices(tenant_id, status);
CREATE INDEX idx_invoices_ref ON subscription_invoices(payment_ref_id);

-- 5. Idempotency Records
CREATE TABLE idempotency_records (
    key VARCHAR(255) PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    payload_hash VARCHAR(64) NOT NULL,
    status idempotency_status_enum NOT NULL DEFAULT 'IN_PROGRESS',
    response_data JSONB NULL,
    locked_until TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '10 SECONDS'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_idempotency_lookup ON idempotency_records(key, status);

-- 6. User Conversation Sessions
CREATE TABLE user_sessions (
    phone_number VARCHAR(32) PRIMARY KEY,
    tenant_id UUID NULL REFERENCES tenants(id) ON DELETE SET NULL,
    current_step VARCHAR(64) NOT NULL DEFAULT 'IDLE',
    session_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

```

---

## 10. SaaS Superadmin Platform Control & Metrics

Superadmin Panel berbasis web internal (Appsmith / Retool / Next.js) difungsikan untuk memantau metrik bisnis SaaS dan menjaga operasional gateway Baileys.

### 10.1 Key Metrics Views (PostgreSQL Agregasi)

```sql
-- View Rekapitulasi MRR dan Arus Kas
CREATE OR REPLACE VIEW view_monthly_saas_revenue AS
SELECT 
    DATE_TRUNC('month', paid_at) AS billing_month,
    COUNT(id) AS successful_transactions,
    SUM(amount) AS gross_revenue_idr,
    COUNT(DISTINCT tenant_id) AS total_paying_tenants
FROM subscription_invoices
WHERE status = 'PAID'
GROUP BY DATE_TRUNC('month', paid_at)
ORDER BY billing_month DESC;

-- View Monitoring Utilisasi Kuota Bulanan Tenant
CREATE OR REPLACE VIEW view_tenant_quota_monitoring AS
SELECT 
    t.id AS tenant_id,
    t.name AS tenant_name,
    t.slug,
    t.subscription_plan,
    t.subscription_until,
    COUNT(a.id) AS current_month_bookings,
    CASE 
        WHEN t.subscription_plan = 'STARTER' THEN 100
        WHEN t.subscription_plan = 'PRO' THEN 400
        WHEN t.subscription_plan = 'LIFETIME_PARTNER' THEN 250
        ELSE 999999 
    END AS max_allowed_quota
FROM tenants t
LEFT JOIN appointments a ON t.id = a.tenant_id 
    AND a.created_at >= DATE_TRUNC('month', NOW())
    AND a.status NOT IN ('CANCELLED')
GROUP BY t.id, t.name, t.slug, t.subscription_plan, t.subscription_until;

```

---

## 11. Rollout Strategy & Financial Milestones

### 11.1 Tahapan Validasi Hardware & Finansial

* **Fase 1 (Pilot Validasi di Rumah):**
* Hardware: PC Rumahan + SSD 512GB (Biaya modal: ¥6.500).
* Tenant: 2 Dokter Pertama (Dokter Umum & Dokter Gigi) dengan status `LIFETIME_PARTNER` (Gratis).
* Webhook Ingress: Cloudflare Tunnel gratis mengekspos port Express lokal ke internet.


* **Fase 2 (Break-Even Hardware):**
* Target: 4 Tenant berbayar paket Pro (@ Rp 199.000 = Rp 796.000). Biaya modal SSD lunas dalam 1 bulan pertama.


* **Fase 3 (Migrasi ke VPS Cloud):**
* Target: 15–20 Tenant aktif (Omzet Rp 3.000.000 – Rp 4.000.000/bln).
* Aksi: Pindah dari PC rumah ke VPS Dedicated 8 GB RAM / 4 vCPU untuk menjamin SLA uptime $99.9\%$.



---

## 12. Landing Page Copywriting & Interactive Live Demo

Spesifikasi copy dan komponen frontend landing page dengan daya konversi tinggi (*high-converting hook*), dirancang khusus untuk tenaga medis mandiri.

### 12.1 High-Hook Copywriting Framework

#### Hero Section (Above the Fold)

* **Pre-Headline Badge:** 🩺 *Didesain Khusus untuk Dokter Mandiri & Praktek Rumahan*
* **Headline:**
> **"Praktek Ramai Tanpa Ruang Tamu Berantakan. Biarkan AI yang Atur Jadwal, Anda Cukup Periksa Pasien."**


* **Sub-Headline:**
> Nol aplikasi tambahan, tanpa ribet buka laptop. Pasien daftar sendiri via WhatsApp, antrean teratur otomatis, dan Anda cukup balas **'Next'** saat siap memeriksa.


* **Primary CTA:** `[ Coba Gratis 30 Hari Tanpa Kartu Kredit ]`
* **Social Proof Badge:** ⚡ *Dipercaya dokter umum & dokter gigi rumahan. Pasien langsung tertib dalam 1x24 jam.*

#### The "Mirror" Pain Points Section

1. **Ruang Tamu Penuh & Berisik:** Pasien datang bersamaan di jam yang sama, ruang tunggu sempit, parkiran rumah penuh sampai ke tetangga.
2. **Tangan Steril, HP Berdering Terus:** Pasien bolak-balik chat: *"Dok, masih antre panjang gak?"* padahal dokter sedang memegang alat periksa.
3. **Pasien Batal Sepihak (No-Show):** Pasien gigi tiba-tiba batal tanpa kabar, slot 1 jam terbuang sia-sia tanpa pemasukan.
4. **Malas Buka Web Admin Rumit:** Seharian lelah memeriksa pasien, masih harus merekap data tabel di laptop malam hari.

#### Pricing Section with Framing Psychology

* **Starter (Rp 99.000/bln):** *Setara 1x ongkos transport.* Pasien daftar mandiri, notif antrean otomatis, maks 100 booking.
* **Pro (Rp 199.000/bln) — *Paling Banyak Dipilih*:** *Setara biaya periksa 1 pasien saja!* Semua fitur Starter + AI Copilot bebas chat santai + Alarm durasi periksa + Grafik analitik visual.
* **Clinic (Rp 349.000/bln):** *Untuk praktek bersama.* Kuota tanpa batas, multi-dokter/multi-kursi.

---

### 12.2 Interactive WhatsApp Live Demo (HTML/Tailwind/JS)

Komponen simulasi interaktif yang mendemonstrasikan alur pendaftaran pasien dan perintah panggil dokter secara visual di landing page:

```html
<div class="flex flex-col lg:flex-row items-center justify-center gap-10 p-6 bg-slate-900 min-h-screen text-white font-sans">
  
  <!-- Left Side: Value Proposition -->
  <div class="max-w-xl space-y-6 text-center lg:text-left">
    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm font-medium">
      <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
      100% Berjalan di WhatsApp Tanpa Download App
    </div>
    <h1 class="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
      Praktek Rumahan Rapi. <br>
      <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
        Pasien Tertib, Dokter Tenang.
      </span>
    </h1>
    <p class="text-slate-400 text-lg">
      Pasien daftar mandiri, antrean terpanggil otomatis, laporan kunjungan langsung jadi grafik di chat Anda.
    </p>
    <div class="flex flex-col sm:flex-row gap-4 pt-2 justify-center lg:justify-start">
      <a href="#demo" class="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-center">
        Coba Gratis 30 Hari Sekarang →
      </a>
    </div>
  </div>

  <!-- Right Side: Phone WhatsApp Live Animated Mockup -->
  <div class="w-full max-w-[360px] bg-slate-950 rounded-[44px] p-3 shadow-2xl border-4 border-slate-800 ring-1 ring-slate-700/50">
    <div class="bg-[#0b141a] rounded-[36px] overflow-hidden flex flex-col h-[580px] border border-slate-800/80">
      
      <!-- WA Header -->
      <div class="bg-[#202c33] p-3.5 flex items-center gap-3 border-b border-[#2a3942]">
        <div class="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-white text-base">
          🩺
        </div>
        <div class="flex-1">
          <div class="font-semibold text-sm text-[#e9edef] flex items-center gap-1.5">
            Asisten Praktek drg. Maya
            <svg class="w-3.5 h-3.5 text-blue-400 fill-current" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          </div>
          <div class="text-xs text-emerald-400">Online • Selalu Aktif</div>
        </div>
      </div>

      <!-- WA Chat Body Canvas -->
      <div id="chat-stream" class="flex-1 p-3.5 space-y-3 overflow-y-auto text-[13px] leading-relaxed bg-[radial-gradient(#1f2c34_1px,transparent_1px)] [background-size:16px_16px]">
        <!-- Dynamic Animated Bubble will mount here via JS -->
      </div>

      <!-- WA Input Bar Mockup -->
      <div class="bg-[#202c33] p-2.5 flex items-center gap-2 border-t border-[#2a3942]">
        <div class="flex-1 bg-[#2a3942] rounded-full px-4 py-2 text-xs text-slate-400 flex items-center justify-between">
          <span>Ketik pesan...</span>
          <span class="text-slate-500">📎</span>
        </div>
        <div class="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center text-slate-950 text-xs font-bold">
          ➤
        </div>
      </div>

    </div>
  </div>

</div>

<!-- Interactive Chat Script (Auto-Loop Simulation) -->
<script>
const messages = [
  { sender: 'user', text: 'BOOK_DRG_MAYA' },
  { sender: 'bot', text: 'Halo! Selamat datang di Praktek Mandiri drg. Maya 🦷\nSilakan pilih tindakan medis:\n1. Scaling Karang Gigi (40m)\n2. Tambal Gigi (45m)' },
  { sender: 'user', text: '1' },
  { sender: 'bot', text: 'Pilihan: *Scaling Gigi*.\nSlot kosong hari ini:\nA. 16:00 WIB\nB. 17:30 WIB' },
  { sender: 'user', text: 'A - Dimas Arya' },
  { sender: 'bot', text: '✅ *Pendaftaran Berhasil!*\nNo Booking: #DNT-104\n🗓️ Hari ini, Pukul 16:00 WIB\n\n_Mohon hadir 10 menit sebelum jadwal._' },
  { sender: 'doctor', text: 'Next' },
  { sender: 'bot', text: '🔔 Pasien #DNT-104 (Bpk. Dimas) sudah dipanggil masuk ke ruang periksa.' }
];

const container = document.getElementById('chat-stream');

function playChatAnimation() {
  container.innerHTML = '';
  let delay = 300;

  messages.forEach((msg, idx) => {
    setTimeout(() => {
      // Append Typing Indicator
      const typingEl = document.createElement('div');
      typingEl.className = `flex ${msg.sender === 'user' || msg.sender === 'doctor' ? 'justify-end' : 'justify-start'}`;
      typingEl.innerHTML = `<span class="bg-[#202c33] text-slate-400 px-3 py-1 rounded-full text-xs animate-pulse">Mengetik...</span>`;
      container.appendChild(typingEl);
      container.scrollTop = container.scrollHeight;

      setTimeout(() => {
        container.removeChild(typingEl);

        const bubble = document.createElement('div');
        const isSelf = msg.sender === 'user' || msg.sender === 'doctor';
        
        bubble.className = `flex ${isSelf ? 'justify-end' : 'justify-start'} animate-fade-in`;
        
        let bgColor = isSelf ? 'bg-[#005c4b] text-[#e9edef]' : 'bg-[#202c33] text-[#d1d7db]';
        if (msg.sender === 'doctor') bgColor = 'bg-[#1e3a5f] text-[#dbeafe] border border-blue-400/30';

        bubble.innerHTML = `
          <div class="${bgColor} max-w-[85%] rounded-2xl px-3 py-2 shadow-sm whitespace-pre-line text-xs">
            ${msg.sender === 'doctor' ? '<span class="text-[10px] font-bold block text-blue-300">👨‍⚕️ Dokter:</span>' : ''}
            ${msg.text}
            <div class="text-[9px] text-right text-slate-400/70 mt-1">10:15</div>
          </div>
        `;

        container.appendChild(bubble);
        container.scrollTop = container.scrollHeight;
      }, 700);

    }, delay);

    delay += 2000;
  });

  // Re-loop animation
  setTimeout(playChatAnimation, delay + 4000);
}

window.onload = playChatAnimation;
</script>

```

```

```