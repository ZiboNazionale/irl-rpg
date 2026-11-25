/**
 * Le caratteristiche del giocatore e il test che le calcola.
 * Ogni caratteristica ha 3 domande con 5 risposte, dalla meno alla più "allenata".
 * I punteggi sono stime di gioco basate su quello che dichiari, non misure oggettive.
 */

export type Gruppo = 'Corpo' | 'Carriera' | 'Identità' | 'Mente';

export interface Caratteristica {
  id: string;
  nome: string;
  gruppo: Gruppo;
  /** Sigla da 3 lettere, come sulle carte dei calciatori. */
  sigla: string;
  descrizione: string;
}

export const CARATTERISTICHE: Caratteristica[] = [
  { id: 'resistenza', nome: 'Resistenza', gruppo: 'Corpo', sigla: 'RES', descrizione: 'Quanto a lungo tieni il ritmo' },
  { id: 'forza', nome: 'Forza', gruppo: 'Corpo', sigla: 'FOR', descrizione: 'Allenamento e progressi di forza' },
  { id: 'velocita', nome: 'Velocità', gruppo: 'Corpo', sigla: 'VEL', descrizione: 'Rapidità e reattività' },
  { id: 'mobilita', nome: 'Mobilità', gruppo: 'Corpo', sigla: 'MOB', descrizione: 'Libertà e controllo nei movimenti' },
  { id: 'hardSkill', nome: 'Hard skill', gruppo: 'Carriera', sigla: 'SKL', descrizione: 'La tua competenza professionale' },
  { id: 'soldi', nome: 'Gestione soldi', gruppo: 'Carriera', sigla: 'SLD', descrizione: 'Spese, budget e risparmio' },
  { id: 'focus', nome: 'Focus', gruppo: 'Carriera', sigla: 'FOC', descrizione: 'Concentrazione senza distrazioni' },
  { id: 'organizzazione', nome: 'Organizzazione', gruppo: 'Carriera', sigla: 'ORG', descrizione: 'Priorità, scadenze e impegni' },
  { id: 'carisma', nome: 'Carisma', gruppo: 'Identità', sigla: 'CAR', descrizione: 'Come coinvolgi gli altri' },
  { id: 'comunicazione', nome: 'Comunicazione', gruppo: 'Identità', sigla: 'COM', descrizione: 'Spiegare, ascoltare, mediare' },
  { id: 'umorismo', nome: 'Umorismo', gruppo: 'Identità', sigla: 'UMO', descrizione: 'Leggerezza al momento giusto' },
  { id: 'creativita', nome: 'Creatività', gruppo: 'Identità', sigla: 'CRE', descrizione: 'Dalle idee ai risultati' },
  { id: 'disciplina', nome: 'Disciplina', gruppo: 'Mente', sigla: 'DIS', descrizione: 'Costanza, ogni giorno' },
  { id: 'motivazione', nome: 'Motivazione', gruppo: 'Mente', sigla: 'MOT', descrizione: 'La spinta a cominciare' },
  { id: 'benessere', nome: 'Benessere', gruppo: 'Mente', sigla: 'BEN', descrizione: 'Come ti senti in questo periodo' },
];

export const GRUPPI: Gruppo[] = ['Corpo', 'Carriera', 'Identità', 'Mente'];

export interface Domanda {
  caratteristica: string;
  testo: string;
  risposte: [string, string, string, string, string];
}

const d = (caratteristica: string, testo: string, risposte: Domanda['risposte']): Domanda => ({ caratteristica, testo, risposte });

export const DOMANDE: Domanda[] = [
  d('resistenza', 'Negli ultimi 14 giorni, quante volte hai camminato a passo sostenuto o fatto cardio per almeno 20 minuti?', ['Mai', '1 volta', '2–3 volte', '4–6 volte', '7 o più volte']),
  d('resistenza', 'Quanto riesci a camminare a passo sostenuto prima di aver bisogno di una pausa?', ['Meno di 5 minuti', '5–15 minuti', '15–30 minuti', '30–60 minuti', 'Oltre un’ora']),
  d('resistenza', 'Negli ultimi tre mesi, con quale continuità hai allenato la resistenza?', ['Non l’ho allenata', 'Qualche sessione isolata', 'Circa una volta a settimana', '2–3 volte a settimana', 'Almeno 4 volte a settimana']),
  d('forza', 'Nelle ultime due settimane, quante sessioni di forza hai completato?', ['Nessuna', '1', '2', '3–5', '6 o più']),
  d('forza', 'Quale descrizione corrisponde al tuo allenamento di forza attuale?', ['Non ho ancora iniziato', 'Sto imparando i movimenti base', 'Completo esercizi base con controllo', 'Seguo un programma e registro carichi o ripetizioni', 'Seguo progressioni documentate da almeno sei mesi']),
  d('forza', 'Rispetto a tre mesi fa, che evidenza hai di un miglioramento?', ['Non mi alleno', 'Nessuna misura o prova recente', 'Ripeto meglio gli stessi esercizi', 'Ho aumentato ripetizioni o carichi in alcuni esercizi', 'Ho progressi registrati e costanti su più esercizi']),
  d('velocita', 'Quanto spesso pratichi movimenti rapidi o uno sport che richiede reattività?', ['Mai', 'Meno di una volta al mese', '1 volta a settimana', '2–3 volte a settimana', '4 o più volte a settimana']),
  d('velocita', 'Quando devi cambiare rapidamente direzione in uno sport, cosa succede di solito?', ['Non riesco ancora a controllare il movimento', 'Perdo spesso equilibrio o ritmo', 'Riesco a ritmo moderato', 'Mantengo controllo anche a ritmo alto', 'Lo faccio con costanza in allenamento o gara']),
  d('velocita', 'Hai misurato i tuoi miglioramenti di rapidità negli ultimi tre mesi?', ['Non la alleno', 'No, mi baso solo su sensazioni', 'Ho almeno una misurazione', 'Confronto più misurazioni simili', 'Registro test ripetibili e ho miglioramenti costanti']),
  d('mobilita', 'Quante volte hai dedicato almeno 10 minuti alla mobilità negli ultimi 14 giorni?', ['Mai', '1 volta', '2–3 volte', '4–6 volte', '7 o più volte']),
  d('mobilita', 'Nei movimenti quotidiani, quanto spesso senti rigidità che limita ciò che vuoi fare?', ['Quasi sempre', 'Spesso', 'A volte', 'Raramente', 'Quasi mai']),
  d('mobilita', 'Quanto controlli i movimenti nel tuo intervallo di movimento comodo?', ['Fatico anche con movimenti semplici', 'Solo con movimenti piccoli e lenti', 'Controllo i movimenti base', 'Completo una routine varia con controllo', 'Controllo una routine progressiva e ne registro i risultati']),
  d('hardSkill', 'Qual è il risultato più recente nella tua competenza professionale principale?', ['Non ho ancora scelto una competenza', 'Ho seguito una prima lezione', 'Ho completato un esercizio guidato', 'Ho prodotto un lavoro autonomo utilizzabile', 'Ho consegnato un lavoro utilizzato e valutato da altri']),
  d('hardSkill', 'Quando incontri un problema tipico nel tuo settore, quanto supporto ti serve?', ['Non so da dove iniziare', 'Mi serve una guida passo per passo', 'Risolvo con esempi o documentazione', 'Risolvo in autonomia e verifico il risultato', 'Risolvo e aiuto altri a comprenderlo']),
  d('hardSkill', 'Nelle ultime due settimane, quanto hai praticato in modo attivo?', ['Non ho praticato', 'Meno di un’ora', '1–3 ore', '4–8 ore', 'Oltre 8 ore, con risultati concreti']),
  d('soldi', 'Quante delle spese dell’ultimo mese hai registrato o controllato?', ['Nessuna', 'Solo le più grandi', 'Circa la metà', 'Quasi tutte', 'Tutte, con una revisione periodica']),
  d('soldi', 'Prima di una spesa non essenziale importante, cosa fai di solito?', ['Compro senza controllare', 'Controllo solo il saldo', 'Confronto prezzi e necessità', 'Verifico un budget già definito', 'Valuto budget, alternative e obiettivi prima di decidere']),
  d('soldi', 'Come gestisci le spese ricorrenti?', ['Le scopro quando vengono addebitate', 'Le ricordo in modo approssimativo', 'Ho un elenco aggiornato', 'Le pianifico e controllo regolarmente', 'Le pianifico, le revisiono e accantono in anticipo']),
  d('focus', 'Quanto dura di solito un tuo blocco di lavoro prima di controllare qualcosa di non necessario?', ['Meno di 5 minuti', '5–14 minuti', '15–24 minuti', '25–49 minuti', '50 minuti o più']),
  d('focus', 'Negli ultimi 7 giorni, quanti blocchi da 25 minuti senza interruzioni volontarie hai completato?', ['Nessuno', '1–2', '3–5', '6–10', 'Più di 10']),
  d('focus', 'Quando una notifica interrompe un’attività importante, cosa fai più spesso?', ['Cambio attività a lungo', 'Controllo e fatico a riprendere', 'Controllo e poi torno al compito', 'Rimando il controllo alla pausa', 'Prevengo le interruzioni e termino il blocco']),
  d('organizzazione', 'Come inizi di solito una giornata di lavoro o studio?', ['Decido sul momento cosa capita', 'Ho un’idea vaga delle priorità', 'Scelgo una priorità concreta', 'Preparo attività e tempi', 'Preparo priorità, tempi e margine per gli imprevisti']),
  d('organizzazione', 'Nelle ultime due settimane, quante scadenze concordate hai rispettato?', ['Quasi nessuna', 'Meno della metà', 'Circa la metà', 'Quasi tutte', 'Tutte, oppure ho rinegoziato prima della scadenza']),
  d('organizzazione', 'Come tieni traccia di impegni e attività?', ['Mi affido alla memoria', 'Uso appunti sparsi', 'Uso un elenco unico', 'Uso elenco e calendario aggiornati', 'Li revisiono regolarmente e chiudo ciò che non serve']),
  d('carisma', 'Quando entri in un gruppo nuovo, cosa accade più spesso?', ['Evito di partecipare', 'Parlo solo se mi viene chiesto', 'Partecipo dopo un po’', 'Mi presento e coinvolgo qualcuno', 'Creo connessioni e aiuto altri a sentirsi inclusi']),
  d('carisma', 'Nelle ultime due settimane, quante volte qualcuno ha cercato spontaneamente la tua compagnia o opinione?', ['Nessuna', '1 volta', '2–3 volte', '4–6 volte', '7 o più volte']),
  d('carisma', 'Quando proponi un’idea a un gruppo, quale risposta ricevi più spesso?', ['Non riesco a esprimerla', 'L’idea passa inosservata', 'Ottengo qualche domanda', 'Genero interesse e partecipazione', 'Il gruppo partecipa e sviluppa l’idea con me']),
  d('comunicazione', 'Quando spieghi qualcosa, come controlli che l’altra persona abbia capito?', ['Non controllo', 'Ripeto le stesse parole', 'Chiedo se è chiaro', 'Chiedo una restituzione e adatto gli esempi', 'Ascolto i dubbi e cambio approccio finché troviamo chiarezza']),
  d('comunicazione', 'Durante un disaccordo, cosa fai più spesso?', ['Interrompo o abbandono subito', 'Difendo la mia posizione senza ascoltare', 'Ascolto ma faccio fatica a rispondere', 'Riformulo l’altro punto di vista e spiego il mio', 'Cerco bisogni comuni e concordo un passo concreto']),
  d('comunicazione', 'Nell’ultima settimana, quante conversazioni hai ascoltato senza interrompere per preparare la tua risposta?', ['Nessuna', '1', '2–3', '4–6', '7 o più']),
  d('umorismo', 'Quanto spesso le tue battute o storie fanno sorridere gli altri in modo spontaneo?', ['Quasi mai', 'Raramente', 'A volte', 'Spesso', 'Molto spesso in contesti diversi']),
  d('umorismo', 'Se una battuta non funziona, come reagisci di solito?', ['Insisto o mi irrigidisco', 'Mi chiudo per il resto della conversazione', 'Cambio argomento con calma', 'Rido di me e alleggerisco', 'Leggo la reazione e adatto il tono senza mettere a disagio']),
  d('umorismo', 'Come scegli il momento di fare una battuta?', ['Non guardo molto il contesto', 'La faccio anche se non sono sicuro del momento', 'Aspetto un momento disteso', 'Valuto tono e persone prima di parlare', 'Adatto ritmo e tono e coinvolgo senza prendere di mira']),
  d('creativita', 'Negli ultimi 14 giorni, quante idee hai trasformato in una bozza o un piccolo risultato?', ['Nessuna', '1', '2–3', '4–6', '7 o più']),
  d('creativita', 'Quando il primo tentativo non funziona, cosa fai di solito?', ['Mi fermo', 'Riprovo nello stesso modo', 'Cerco un esempio diverso', 'Provo più alternative e le confronto', 'Combino approcci e verifico cosa funziona']),
  d('creativita', 'Qual è il tuo rapporto con il feedback sui tuoi lavori?', ['Non condivido i miei tentativi', 'Condivido ma evito i commenti', 'Ascolto qualche consiglio', 'Cerco feedback e faccio una revisione', 'Confronto più feedback e realizzo più iterazioni']),
  d('disciplina', 'Negli ultimi 7 giorni, in quanti giorni hai mantenuto il piccolo impegno più importante che avevi preso con te stesso?', ['0 giorni', '1–2 giorni', '3–4 giorni', '5–6 giorni', '7 giorni']),
  d('disciplina', 'Quando non hai voglia di cominciare un compito importante, cosa fai più spesso?', ['Lo rimando senza una nuova data', 'Aspetto di sentirmi motivato', 'Comincio solo se qualcuno mi sollecita', 'Riduco il compito e inizio per pochi minuti', 'Uso una routine e completo il minimo concordato']),
  d('disciplina', 'Dopo una giornata saltata, quanto impieghi di solito a riprendere?', ['Oltre una settimana', '3–7 giorni', '2 giorni', 'Il giorno seguente', 'Riparto dal prossimo piccolo passo disponibile']),
  d('motivazione', 'Nell’ultima settimana, quanto spesso hai avuto un motivo concreto per dedicarti ai tuoi obiettivi?', ['Mai', 'Raramente', 'In alcuni giorni', 'Quasi ogni giorno', 'Ogni giorno, con una direzione chiara']),
  d('motivazione', 'Quanto sono chiari i tuoi obiettivi del prossimo mese?', ['Non ne ho ancora', 'Ho un desiderio generico', 'Ho un obiettivo ma nessun passo definito', 'Ho un obiettivo e un prossimo passo', 'Ho obiettivo, passi e un modo per vedere i progressi']),
  d('motivazione', 'Quando immagini il prossimo piccolo passo, come reagisci più spesso?', ['Non riesco a immaginarlo', 'Mi sembra molto lontano', 'Mi sento incerto ma curioso', 'Ho voglia di provarci', 'Lo cerco attivamente e preparo le condizioni per farlo']),
  d('benessere', 'Negli ultimi 7 giorni, quanto spesso hai trovato momenti di calma o sollievo?', ['Mai', 'Raramente', 'In alcuni giorni', 'Quasi ogni giorno', 'Ogni giorno']),
  d('benessere', 'Negli ultimi 7 giorni, quanto spesso hai sentito di poter contare su una persona o uno spazio di supporto?', ['Mai', 'Raramente', 'A volte', 'Spesso', 'Quasi sempre']),
  d('benessere', 'Negli ultimi 7 giorni, quanto spesso hai avuto energia sufficiente per le tue attività quotidiane?', ['Mai', 'Raramente', 'In alcuni giorni', 'Quasi ogni giorno', 'Ogni giorno']),
];

/** Il punteggio (da 1 a 99) di ciascuna delle 5 risposte. */
export const PUNTI_RISPOSTA = [15, 34, 53, 72, 91] as const;

/** Il valore di partenza di una caratteristica senza risposte. */
export const VALORE_SENZA_RISPOSTE = 35;

export type Punteggi = Record<string, number>;

/**
 * Calcola le caratteristiche dalle risposte (indice 0–4 per ogni domanda, null = saltata):
 * la media dei punti delle risposte date per quella caratteristica.
 */
export function calcolaCaratteristiche(risposte: readonly (number | null)[]): Punteggi {
  const punti: Record<string, number[]> = {};
  DOMANDE.forEach((domanda, i) => {
    const r = risposte[i];
    if (r != null && Number.isInteger(r) && r >= 0 && r < 5) (punti[domanda.caratteristica] ??= []).push(PUNTI_RISPOSTA[r]);
  });
  return Object.fromEntries(
    CARATTERISTICHE.map(({ id }) => {
      const lista = punti[id];
      return [id, lista?.length ? Math.round(lista.reduce((a, b) => a + b, 0) / lista.length) : VALORE_SENZA_RISPOSTE];
    }),
  );
}

/** Il "complessivo" (OVR) della carta: media delle 12 abilità di Corpo, Carriera e Identità. */
export function complessivo(punteggi: Punteggi): number {
  const abilita = CARATTERISTICHE.filter((c) => c.gruppo !== 'Mente');
  return Math.round(abilita.reduce((s, c) => s + (punteggi[c.id] ?? VALORE_SENZA_RISPOSTE), 0) / abilita.length);
}

/** Per ogni abilità: il ruolo (se è la migliore) e l'aggettivo (se è la seconda), al maschile e femminile. */
const RUOLI: Record<string, { ruolo: [string, string]; aggettivo: [string, string] }> = {
  resistenza: { ruolo: ['Maratoneta', 'Maratoneta'], aggettivo: ['instancabile', 'instancabile'] },
  forza: { ruolo: ['Colosso', 'Roccia'], aggettivo: ['possente', 'possente'] },
  velocita: { ruolo: ['Fulmine', 'Fulmine'], aggettivo: ['scattante', 'scattante'] },
  mobilita: { ruolo: ['Acrobata', 'Acrobata'], aggettivo: ['agile', 'agile'] },
  hardSkill: { ruolo: ['Specialista', 'Specialista'], aggettivo: ['tecnico', 'tecnica'] },
  soldi: { ruolo: ['Tesoriere', 'Tesoriera'], aggettivo: ['oculato', 'oculata'] },
  focus: { ruolo: ['Cecchino', 'Cecchina'], aggettivo: ['concentrato', 'concentrata'] },
  organizzazione: { ruolo: ['Regista', 'Regista'], aggettivo: ['metodico', 'metodica'] },
  carisma: { ruolo: ['Leader', 'Leader'], aggettivo: ['carismatico', 'carismatica'] },
  comunicazione: { ruolo: ['Mediatore', 'Mediatrice'], aggettivo: ['persuasivo', 'persuasiva'] },
  umorismo: { ruolo: ['Intrattenitore', 'Intrattenitrice'], aggettivo: ['brillante', 'brillante'] },
  creativita: { ruolo: ['Fantasista', 'Fantasista'], aggettivo: ['creativo', 'creativa'] },
};

/**
 * Il ruolo del giocatore, dalle risposte: l'abilità migliore dà il ruolo, la seconda
 * l'aggettivo (es. "Fantasista carismatico"). A parità vince l'ordine della scheda.
 */
export function ruolo(punteggi: Punteggi, sesso: 'm' | 'f' = 'm'): string {
  const [prima, seconda] = CARATTERISTICHE.filter((c) => c.gruppo !== 'Mente')
    .map((c, i) => ({ id: c.id, valore: punteggi[c.id] ?? VALORE_SENZA_RISPOSTE, i }))
    .sort((a, b) => b.valore - a.valore || a.i - b.i);
  const g = sesso === 'f' ? 1 : 0;
  return `${RUOLI[prima.id].ruolo[g]} ${RUOLI[seconda.id].aggettivo[g]}`;
}
