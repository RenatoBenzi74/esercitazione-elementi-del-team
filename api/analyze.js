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
- tieni conto del ruolo che è stato scritto dal compilatore per dare i suggerimenti; se è un referente o incaricato sono suggerimenti di gestione se è un membro del gruppo sono suggerimenti di comportamento

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
3 domande aperte che chi compila la griglia può portare nella prossima osservazione o nella prossima sessione con il gruppo. Devono essere domande genuine, non retoriche.`;
  try {
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
      return res.status(502).json({ error: `Errore API: ${response.status}`, detail: err });
    }
    const data = await response.json();
    const result = data.content?.[0]?.text || 'Nessuna risposta.';
    return res.status(200).json({ result });
  } catch (err) {
    return res.status(500).json({ error: `Errore: ${err.message}` });
  }
}
