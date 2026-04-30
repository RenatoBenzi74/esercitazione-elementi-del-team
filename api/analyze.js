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
  const systemPrompt = `Analizza una griglia di osservazione di gruppo.
La griglia osserva il comportamento collettivo, non i singoli individui.
Gli elementi osservati sono: Identità, Organizzazione, Comunicazione, Atteggiamento propositivo e cultura dell'errore, Clima.
Usa solo punteggi e note inserite.
Non inventare informazioni. Non giudicare persone. Non fare diagnosi. Non proporre piani di crescita.
Usa formule prudenti: "dai dati inseriti sembra…", "potrebbe essere utile osservare…", "emerge come ipotesi…".
Rispondi in massimo 1500 caratteri in italiano.
Se le note sono poche o assenti, evidenzialo con delicatezza invitando a osservare meglio.
Struttura:
1. Sintesi generale
2. Lettura per elementi
3. Punti forti osservati
4. Attenzioni principali
5. Tre domande per osservare meglio`;
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
        max_tokens: 1000,
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
