/* ============================================
   GRIGLIA OSSERVAZIONE GRUPPO — script.js
   ============================================ */

const DRAFT_KEY = 'griglia_bozza_v1';
let ultimaAnalisi = '';

/* ── ANNO FOOTER ── */
document.getElementById('footerYear').textContent = new Date().getFullYear();

/* ── TOGGLE ISTRUZIONI ── */
function toggleIstruzioni() {
  const btn = document.querySelector('.toggle-istruzioni');
  const body = document.getElementById('istruzioniBody');
  const expanded = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', !expanded);
  body.hidden = expanded;
}

/* ── RACCOLTA DATI ── */
function raccogliDati() {
  const data = {
    nomeGruppo: document.getElementById('nomeGruppo').value.trim(),
    ruolo: document.getElementById('ruoloCompilatore').value.trim(),
    indicatori: []
  };

  document.querySelectorAll('.elemento-section').forEach(sezione => {
    const elemento = sezione.dataset.elemento;
    sezione.querySelectorAll('.indicatore-card').forEach(card => {
      const indicatore = card.dataset.indicatore;
      const radios = card.querySelectorAll('input[type="radio"]');
      let punteggio = null;
      radios.forEach(r => { if (r.checked) punteggio = parseInt(r.value); });
      const nota = card.querySelector('.note-field').value.trim();
      data.indicatori.push({ elemento, indicatore, punteggio, nota: nota || null });
    });
  });

  return data;
}

/* ── VALIDAZIONE ── */
function valida(data) {
  let valido = true;

  if (!data.nomeGruppo || !data.ruolo) {
    valido = false;
  }

  document.querySelectorAll('.indicatore-card').forEach(card => {
    const radios = card.querySelectorAll('input[type="radio"]');
    let checked = false;
    radios.forEach(r => { if (r.checked) checked = true; });
    if (!checked) {
      card.classList.add('error');
      valido = false;
    } else {
      card.classList.remove('error');
    }
  });

  return valido;
}

/* ── SALVA BOZZA ── */
function salvaBozza() {
  const data = raccogliDati();
  // Store radio selections by name
  const radioStates = {};
  document.querySelectorAll('input[type="radio"]:checked').forEach(r => {
    radioStates[r.name] = r.value;
  });
  // Store textareas
  const noteStates = [];
  document.querySelectorAll('.note-field').forEach((t, i) => {
    noteStates[i] = t.value;
  });
  localStorage.setItem(DRAFT_KEY, JSON.stringify({
    nomeGruppo: data.nomeGruppo,
    ruolo: data.ruolo,
    radioStates,
    noteStates
  }));
  mostraNotifica('💾 Bozza salvata!');
}

/* ── CARICA BOZZA ── */
function caricaBozza() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.nomeGruppo) document.getElementById('nomeGruppo').value = saved.nomeGruppo;
    if (saved.contesto) document.getElementById('contestoOsservato').value = saved.contesto;
    if (saved.ruolo) document.getElementById('ruoloCompilatore').value = saved.ruolo;
    if (saved.radioStates) {
      Object.entries(saved.radioStates).forEach(([name, value]) => {
        const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
        if (el) el.checked = true;
      });
    }
    if (saved.noteStates) {
      document.querySelectorAll('.note-field').forEach((t, i) => {
        if (saved.noteStates[i] !== undefined) t.value = saved.noteStates[i];
      });
    }
  } catch(e) { /* ignore */ }
}

/* ── CANCELLA DATI ── */
function cancellaDati() {
  if (!confirm('Sei sicuro di voler cancellare tutti i dati inseriti?')) return;
  document.getElementById('nomeGruppo').value = '';
  document.getElementById('contestoOsservato').value = '';
  document.getElementById('ruoloCompilatore').value = '';
  document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
  document.querySelectorAll('.note-field').forEach(t => t.value = '');
  document.querySelectorAll('.indicatore-card').forEach(c => c.classList.remove('error'));
  localStorage.removeItem(DRAFT_KEY);
  document.getElementById('risultatoSection').hidden = true;
  mostraNotifica('🗑 Dati cancellati');
}

/* ── COPIA ANALISI ── */
function copiaAnalisi() {
  navigator.clipboard.writeText(ultimaAnalisi).then(() => {
    mostraNotifica('📋 Testo copiato!');
  });
}

/* ── SCARICA ANALISI ── */
function scaricaAnalisi() {
  const blob = new Blob([ultimaAnalisi], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const data = raccogliDati();
  const nomeFile = `analisi_${(data.nomeGruppo || 'gruppo').replace(/\s+/g, '_').toLowerCase()}.txt`;
  a.href = url;
  a.download = nomeFile;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── NOTIFICA TOAST ── */
function mostraNotifica(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed; bottom:28px; left:50%; transform:translateX(-50%) translateY(20px);
      background:#2a2826; color:#fff; padding:10px 20px; border-radius:40px;
      font-family:'DM Sans',sans-serif; font-size:13px; font-weight:600;
      opacity:0; transition:all .25s; z-index:9999; white-space:nowrap;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2200);
}

/* ── COSTRUISCI PAYLOAD MINIMALE PER AI ── */
function costruisciPayload(data) {
  const righe = data.indicatori.map(ind => {
    const base = `[${ind.elemento}] ${ind.indicatore} → ${ind.punteggio}`;
    return ind.nota ? `${base} — nota: ${ind.nota}` : base;
  }).join('\n');

  return `Gruppo: ${data.nomeGruppo}
Ruolo osservatore: ${data.ruolo}

Punteggi (scala 1-6):
${righe}`;
}

/* ── INVIO FORM ── */
document.getElementById('grigliaForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const data = raccogliDati();
  const msgEl = document.getElementById('validationMsg');

  if (!valida(data)) {
    msgEl.hidden = false;
    msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  msgEl.hidden = true;

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="loading-dots">Analisi in corso</span>';

  const risultatoSection = document.getElementById('risultatoSection');
  const risultatoBody = document.getElementById('risultatoBody');
  const risultatoMeta = document.getElementById('risultatoMeta');

  risultatoSection.hidden = false;
  risultatoBody.textContent = 'Elaborazione in corso…';
  risultatoMeta.textContent = `${data.nomeGruppo} · ${data.contesto}`;
  risultatoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const payload = costruisciPayload(data);

    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload })
    });

    if (!res.ok) throw new Error(`Errore server: ${res.status}`);

    const json = await res.json();
    ultimaAnalisi = `ANALISI GRIGLIA DI OSSERVAZIONE
Gruppo: ${data.nomeGruppo}
Ruolo: ${data.ruolo}
Data: ${new Date().toLocaleDateString('it-IT')}

${json.result}`;

    risultatoBody.textContent = json.result;

  } catch(err) {
    risultatoBody.textContent = `Errore durante l'analisi: ${err.message}\n\nVerifica che il server sia attivo e l'API key sia configurata.`;
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '✦ Analizza con AI';
  }
});

/* ── INIT ── */
caricaBozza();
