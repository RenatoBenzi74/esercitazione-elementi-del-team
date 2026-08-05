// api/analyze.js — Vercel Serverless Function
// Variabili ambiente richieste: ANTHROPIC_API_KEY, RESEND_API_KEY, NOTIFY_EMAIL

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  const { payload } = req.body;

  if (!payload || typeof payload !== 'string') {
    return res.status(400).json({ error: 'Payload mancante o non valido' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key non configurata' });
  }

  const systemPrompt = `Sei un osservatore esperto di dinamiche di gruppo in contesti formativi e associativi.
Analizza la griglia di osservazione ricevuta con cura e profondità.
La griglia osserva il comportamento collettivo, non i singoli individui.
Gli elementi osservati sono: Identità, Organizzazione, Comunicazione, Atteggiamento propositivo e cultura dell'errore, Clima.

REGOLE:
- Usa solo i punteggi e le note inserite. Non inventare informazioni.
- Non giudicare le persone. Non fare diagnosi. Non proporre piani strutturati di crescita.
- Usa sempre formule prudenti: "dai dati inseriti sembra…", "potrebbe essere utile osservare…", "emerge come ipotesi…", "vale la pena chiedersi…".
- Se le note sono poche o assenti, segnalalo con delicatezza e invita a osservare più nel dettaglio.
- Rispondi in italiano, in modo caldo e formativo, mai tecnico o freddo.

STRUTTURA DELLA RISPOSTA (segui questo ordine):

1. SINTESI GENERALE
Una lettura complessiva del gruppo: come appare il funzionamento generale, quali energie sembrano presenti, cosa colpisce guardando i dati nel loro insieme.

2. LETTURA PER ELEMENTI
Per ogni elemento (Identità, Organizzazione, Comunicazione, Atteggiamento, Clima) scrivi 2-4 righe: cosa emerge dai punteggi, se ci sono coerenze o contraddizioni interne, cosa vale la pena approfondire.

3. PUNTI DI FORZA OSSERVATI
Gli elementi o indicatori con punteggi più alti: cosa sembra funzionare bene, quali risorse il gruppo sembra avere.

4. ATTENZIONI PRINCIPALI
Gli elementi o indicatori con punteggi più bassi o in contraddizione: cosa potrebbe valere la pena osservare meglio, senza giudizio.

5. SUGGERIMENTI DI COMPORTAMENTO
3-4 comportamenti concreti che il gruppo o il facilitatore potrebbe provare a introdurre o osservare nelle prossime occasioni. Formulali come inviti, non come prescrizioni.

6. DOMANDE PER OSSERVARE MEGLIO
5 domande aperte che chi compila la griglia può portare nella prossima osservazione o nella prossima sessione con il gruppo. Devono essere domande genuine, non retoriche.`;

  let result = '';

  try {
    // 1. ANALISI AI
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: payload }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: `Errore API Anthropic: ${response.status}`, detail: err });
    }

    const data = await response.json();
    result = data.content?.[0]?.text || 'Nessuna risposta ricevuta.';

    // 2. INVIO EMAIL
    const resendKey = process.env.RESEND_API_KEY;
    const notifyEmail = process.env.NOTIFY_EMAIL;

    if (resendKey && notifyEmail) {
      const emailBody = `
<h2>Nuova analisi griglia di osservazione</h2>

<h3>Dati inseriti</h3>
<pre style="background:#f5f5f5;padding:16px;border-radius:8px;font-size:13px;white-space:pre-wrap;">${payload}</pre>

<h3>Analisi AI</h3>
<div style="background:#fff8f0;padding:16px;border-radius:8px;font-size:14px;white-space:pre-wrap;line-height:1.7;">${result.replace(/\n/g, '<br>')}</div>

<p style="color:#999;font-size:12px;margin-top:24px;">Inviato automaticamente da Griglia Osservazione Gruppo · ${new Date().toLocaleString('it-IT')}</p>
      `;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendKey}`
        },
        body: JSON.stringify({
          from: 'Griglia Osservazione <onboarding@resend.dev>',
          to: [notifyEmail],
          subject: `Nuova analisi — ${new Date().toLocaleDateString('it-IT')}`,
          html: emailBody
        })
      });
    }

    return res.status(200).json({ result });

  } catch (err) {
    return res.status(500).json({ error: `Errore: ${err.message}` });
  }
}
