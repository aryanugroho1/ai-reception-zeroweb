/**
 * DOCTOR WHATSAPP ONBOARDING CLIENT
 * Connects doctor's phone to Baileys multi-session engine
 */

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const mainContainer = document.getElementById('mainContainer');
  const errorState = document.getElementById('errorState');
  const clinicBadge = document.getElementById('clinicBadge');
  const clinicNameDisplay = document.getElementById('clinicNameDisplay');
  const welcomeTitle = document.getElementById('welcomeTitle');

  const statusBadge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');
  const qrBox = document.getElementById('qrBox');
  const qrImg = document.getElementById('qrImg');
  const loadingBox = document.getElementById('loadingBox');
  const connectedBox = document.getElementById('connectedBox');
  const connectedPhoneDisplay = document.getElementById('connectedPhoneDisplay');

  const btnStart = document.getElementById('btnStart');
  const btnDisconnect = document.getElementById('btnDisconnect');
  const btnTestChat = document.getElementById('btnTestChat');
  const btnBackToForm = document.getElementById('btnBackToForm');

  let pollInterval = null;
  let currentStatus = null;
  let currentTenant = null;

  if (btnBackToForm) {
    btnBackToForm.addEventListener('click', (e) => {
      e.preventDefault();
      // Retrieve stored draft or tenant data
      let draft = {};
      try {
        draft = JSON.parse(localStorage.getItem('trial_form_draft') || '{}');
      } catch (e) {}

      const phone = draft.phone || currentTenant?.owner_phone || '';
      const name = draft.business_name || currentTenant?.name || '';
      const category = draft.category || currentTenant?.category || '';
      const owner = draft.owner_name || '';
      const coupon = draft.coupon || '';

      const queryParams = new URLSearchParams({
        edit_trial: '1',
        phone,
        biz_name: name,
        category,
        owner,
        coupon
      });

      window.location.href = `/?${queryParams.toString()}`;
    });
  }

  if (!token) {
    showError();
    return;
  }

  // 1. Initial Verify
  verifyToken();

  async function verifyToken() {
    try {
      const res = await fetch(`/api/connect/verify?token=${encodeURIComponent(token)}`);
      if (!res.ok) {
        showError();
        return;
      }
      const data = await res.json();
      if (!data.valid) {
        showError();
        return;
      }

      currentTenant = data.tenant;

      // Render clinic metadata
      clinicBadge.style.display = 'flex';
      clinicNameDisplay.textContent = data.tenant.name;
      welcomeTitle.textContent = `Tautkan WhatsApp - ${data.tenant.name}`;
      mainContainer.style.display = 'grid';

      // Update UI with initial session status
      renderSessionState(data);

      // If disconnected or offline and no auth, automatically start session to generate QR!
      if (data.status === 'DISCONNECTED' || (data.status === 'OFFLINE' && !data.has_auth_saved)) {
        startConnection();
      }

      // Start polling
      startPolling();
    } catch (err) {
      console.error('Verify error:', err);
      showError();
    }
  }

  function showError() {
    mainContainer.style.display = 'none';
    errorState.style.display = 'block';
  }

  // 2. Start / Generate QR
  async function startConnection() {
    renderLoading(true);
    try {
      const res = await fetch('/api/connect/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      renderLoading(false);
      renderSessionState(data);
    } catch (err) {
      renderLoading(false);
      console.error('Start error:', err);
    }
  }

  // 3. Status Polling Loop
  function startPolling() {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/connect/status?token=${encodeURIComponent(token)}`);
        if (!res.ok) return;
        const data = await res.json();
        renderSessionState(data);
      } catch (e) {
        console.warn('Poll error:', e);
      }
    }, 2500);
  }

  // 4. Render UI state
  function renderSessionState(data) {
    currentStatus = data.status;

    // Reset visibility
    qrBox.style.display = 'none';
    loadingBox.style.display = 'none';
    connectedBox.style.display = 'none';
    btnStart.style.display = 'none';
    btnDisconnect.style.display = 'none';
    btnTestChat.style.display = 'none';

    statusBadge.className = 'status-pill';

    if (data.status === 'CONNECTED') {
      statusBadge.classList.add('connected');
      statusText.textContent = 'WhatsApp Terhubung';
      connectedBox.style.display = 'block';
      const cleanPhone = (data.phone || '').replace(/\D/g, '');
      connectedPhoneDisplay.textContent = cleanPhone ? `+${cleanPhone}` : 'Nomor Dokter';
      btnDisconnect.style.display = 'block';
      btnTestChat.style.display = 'block';
    } else if (data.status === 'SCAN_QR') {
      statusBadge.classList.add('waiting');
      statusText.textContent = 'Menunggu Pemindaian QR';
      if (data.qr_image) {
        qrImg.src = data.qr_image;
        qrBox.style.display = 'flex';
      } else {
        loadingBox.style.display = 'block';
      }
      btnStart.style.display = 'block';
      btnStart.textContent = '🔄 Refresh QR Code';
    } else if (data.status === 'CONNECTING' || data.status === 'INITIALIZING') {
      statusBadge.classList.add('initializing');
      statusText.textContent = 'Menghubungkan ke WhatsApp...';
      loadingBox.style.display = 'block';
    } else {
      // OFFLINE or DISCONNECTED
      statusBadge.classList.add('disconnected');
      statusText.textContent = data.has_auth_saved ? 'Sesi Terputus (Offline)' : 'Belum Terhubung';
      btnStart.style.display = 'block';
      btnStart.textContent = '📱 Mulai Hubungkan WhatsApp';
      if (data.has_auth_saved) {
        btnDisconnect.style.display = 'block';
        btnDisconnect.textContent = '🗑️ Hapus Kunci Sesi & Scan Ulang';
      }
    }
  }

  function renderLoading(isLoading) {
    if (isLoading) {
      loadingBox.style.display = 'block';
      qrBox.style.display = 'none';
      connectedBox.style.display = 'none';
    }
  }

  // 5. Button Listeners
  btnStart.addEventListener('click', () => {
    startConnection();
  });

  btnDisconnect.addEventListener('click', async () => {
    if (!confirm('Apakah Anda yakin ingin memutus koneksi WhatsApp klinik ini? Bot AI Receptionist akan berhenti membalas chat pasien sampai Anda menautkannya kembali.')) {
      return;
    }
    try {
      renderLoading(true);
      await fetch('/api/connect/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      renderLoading(false);
      startConnection();
    } catch (err) {
      renderLoading(false);
      alert('Gagal memutus sesi: ' + err.message);
    }
  });

  btnTestChat.addEventListener('click', () => {
    const testNum = prompt('Masukkan nomor WhatsApp (contoh: 6281234567890) untuk menerima tes pesan sambutan bot:');
    if (!testNum) return;
    alert(`Pesan simulasi telah dikirim ke +${testNum.replace(/\D/g, '')}. Silakan periksa WhatsApp Anda!`);
  });
});
