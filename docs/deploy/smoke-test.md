# End-to-End Smoke Test

Run through these steps to verify the full system works.

## Setup Prerequisites
- Docker Compose running with all services healthy
- WAHA paired and session WORKING
- Cloudflare Tunnel routing public URL to the API

## Test 1: Admin Login
1. Open `https://dm.your-homelab.com/login`
2. Login: `admin@puskesmas.local` / `admin123`
3. Expected: redirected to Patients page (/)
4. Verify sidebar has: Dashboard (Patients), WhatsApp, Pasien, Template Pesan, Konsumsi

## Test 2: WhatsApp Session Status
1. Navigate to WhatsApp page
2. Expected: status badge shows "Terhubung" (green) with phone number
3. If not connected: click "Mulai Session" and scan QR

## Test 3: Patient Enrollment + Opt-in
1. Navigate to Patients page
2. Click "Tambah Pasien"
3. Fill: Nama = "Test User", No. WA = sender phone number, click Tambah
4. Expected: new row appears in table with status "Menunggu" (yellow badge)
5. On the patient's WhatsApp, they should receive an opt-in message:
   > Program Pemantauan Obat DM
   > Halo Test User, Anda telah didaftarkan...
   > [Setuju] [Nanti saja]
6. Patient taps "Setuju"
7. Refresh the Patients page — status should change to "Setuju" (green badge)

## Test 4: Opt-in Confirmation Reply
1. After tapping "Setuju", patient receives: "Pendaftaran Berhasil. Terima kasih..."
2. Patient's consentStatus in DB should be `opted_in`

## Test 5: Medication Assignment
1. Click the patient's name in the table (navigates to medications page)
2. Click "Tambah Obat"
3. Fill: Nama = "Metformin", Dosis = "500", Satuan = "mg", Jadwal = "08:00, 20:00" (use times a few minutes from now for quick test)
4. Click Tambah
5. Expected: medication card appears with name, dosage, schedule

## Test 6: Reminder Dispatch
1. Wait for the next dispatcher cycle (runs every 1 minute)
2. At the scheduled time (or when `scheduledAt <= now`), the dispatcher sends the reminder
3. Patient receives WhatsApp message:
   > Pengingat Minum Obat
   > Halo Test User, saatnya minum obat Metformin dosis 500 mg...
   > [Sudah minum] [Belum]
4. Verify Reminder status changed from `pending` → `sent`

## Test 7: Consumption Logging (Button)
1. Patient taps "Sudah minum" button on the reminder message
2. System replies: "Tercatat. Terima kasih."
3. Reminder status: `sent` → `confirmed`
4. ConsumptionLog created: status=`taken`, source=`button`
5. Navigate to Konsumsi page on dashboard
6. Expected: new row with status "Diminum" (green badge), source "Tombol"

## Test 8: Consumption Logging (Free Text)
1. Wait for the second reminder of the day (or set up another medication with a near-future time)
2. Patient replies with free text: "sudah"
3. System replies: "Tercatat. Terima kasih."
4. ConsumptionLog created: status=`taken`, source=`free_text`
5. Navigate to Konsumsi page — expected new row with source "Teks"

## Test 9: Missed Dose Detection
1. Let a reminder stay `sent` (patient doesn't reply)
2. When the NEXT scheduled dose for the same medication fires:
   - The prior reminder status: `sent` → `missed`
   - ConsumptionLog created: status=`missed`, source=`system_missed`
3. Navigate to Konsumsi page — expected red badge "Terlewat", source "Sistem"

## Test 10: Template Editing
1. Navigate to Template Pesan page
2. Select "Pengingat" (reminder) template
3. Click Edit, change the body text, click Simpan
4. Expected: template updated
5. Wait for next reminder dispatch — verify patient receives the new body text

## Test 11: CSV Export
1. Navigate to Konsumsi page
2. Click "Ekspor CSV"
3. Expected: CSV file downloads with headers: Tanggal, Nama Pasien, WA Number, Nama Obat, Status, Sumber

## Test 12: Patient Search + Pagination
1. Navigate to Patients page
2. Type a name in the search box
3. Expected: filtered results
4. If >10 patients exist, pagination controls appear

## Known Limitations (MVP)
- Patient receives duplicate opt-in if admin clicks "Re-send opt-in" multiple times
- Free-text "sudah" applies to the most recent `sent` Reminder across all meds — if patient has 2 meds, only the most recent one is confirmed
- No delivery receipts from WAHA — if WAHA fails, the reminder shows as `failed` in the dashboard but the admin must manually retry
- Session re-pairing needed if the sending phone unlinks the device from WhatsApp settings
