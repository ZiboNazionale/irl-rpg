/**
 * Le missioni della vita reale. Ogni missione allena una caratteristica; la difficoltà
 * decide gli XP e quanto fa crescere la caratteristica.
 */

export type Difficolta = 'facile' | 'media' | 'difficile';

export interface Missione {
  id: string;
  titolo: string;
  descrizione: string;
  caratteristica: string;
  difficolta: Difficolta;
}

const m = (caratteristica: string, difficolta: Difficolta, id: string, titolo: string, descrizione: string): Missione =>
  ({ id, titolo, descrizione, caratteristica, difficolta });

export const MISSIONI: Missione[] = [
  // Corpo
  m('resistenza', 'facile', 'cammina20', 'Passo dopo passo', 'Cammina a passo sostenuto per 20 minuti.'),
  m('resistenza', 'media', 'cardio30', 'Fiato lungo', '30 minuti di corsa, bici o nuoto a ritmo costante.'),
  m('resistenza', 'difficile', 'cardio45', 'Fondo', '45 minuti di cardio senza fermarti.'),
  m('forza', 'facile', 'piegamenti', 'Primi mattoni', '3 serie di piegamenti e squat, al tuo livello.'),
  m('forza', 'media', 'forza30', 'Sala pesi', '30 minuti di allenamento di forza, segnando carichi o ripetizioni.'),
  m('forza', 'difficile', 'progressione', 'Nuovo record', 'Batti di poco un tuo carico o un tuo numero di ripetizioni.'),
  m('velocita', 'facile', 'scatti', 'Accendi i motori', '6 scatti brevi dopo un buon riscaldamento.'),
  m('velocita', 'media', 'agilita', 'Piedi veloci', '20 minuti di esercizi di agilità o di uno sport rapido.'),
  m('velocita', 'difficile', 'partita', 'In campo', 'Gioca una partita o un allenamento di squadra.'),
  m('mobilita', 'facile', 'stretching10', 'Sciogliti', '10 minuti di mobilità o stretching.'),
  m('mobilita', 'media', 'yoga20', 'Flessibile', '20 minuti di yoga o di una routine di mobilità.'),
  m('mobilita', 'difficile', 'mobilita-test', 'Fuori dalla zona rigida', 'Una routine completa di 30 minuti, poi segna come ti senti.'),
  // Carriera
  m('hardSkill', 'facile', 'studio20', 'Investi su di te', '20 minuti di studio o pratica nella tua competenza.'),
  m('hardSkill', 'media', 'esercizio', 'Mani in pasta', 'Completa un esercizio o un piccolo lavoro concreto.'),
  m('hardSkill', 'difficile', 'progetto', 'Portfolio', 'Porta avanti un progetto vero per almeno un\'ora.'),
  m('soldi', 'facile', 'spese', 'Ogni euro conta', 'Registra tutte le spese di oggi.'),
  m('soldi', 'media', 'budget', 'Il piano', 'Rivedi il budget della settimana e una spesa da tagliare.'),
  m('soldi', 'difficile', 'risparmio', 'Salvadanaio', 'Metti da parte una cifra decisa in anticipo.'),
  m('focus', 'facile', 'blocco25', 'Modalità concentrazione', 'Un blocco di 25 minuti su una sola attività, notifiche spente.'),
  m('focus', 'media', 'blocchi3', 'In the zone', 'Tre blocchi da 25 minuti con pause brevi.'),
  m('focus', 'difficile', 'lavoro-profondo', 'Lavoro profondo', '90 minuti senza distrazioni su una cosa importante.'),
  m('organizzazione', 'facile', 'priorita', 'La mossa giusta', 'Scegli le 3 priorità di domani.'),
  m('organizzazione', 'media', 'agenda', 'Regista', 'Pianifica la settimana con orari e margini.'),
  m('organizzazione', 'difficile', 'arretrati', 'Svuota la panchina', 'Chiudi tre cose rimandate da tempo.'),
  // Identità
  m('carisma', 'facile', 'saluta', 'Fai il primo passo', 'Inizia una conversazione con qualcuno.'),
  m('carisma', 'media', 'proponi', 'Capitano', 'Proponi un\'idea o un\'uscita a un gruppo.'),
  m('carisma', 'difficile', 'organizza', 'Fai squadra', 'Organizza qualcosa con altre persone.'),
  m('comunicazione', 'facile', 'ascolta', 'Orecchie aperte', 'Ascolta qualcuno senza interromperlo, poi riformula.'),
  m('comunicazione', 'media', 'spiega', 'Chiaro e tondo', 'Spiega qualcosa a qualcuno e verifica che abbia capito.'),
  m('comunicazione', 'difficile', 'chiarisci', 'Mediatore', 'Affronta con calma un disaccordo e trovate un passo concreto.'),
  m('umorismo', 'facile', 'battuta', 'Porta leggerezza', 'Condividi una storia o una battuta che fa sorridere.'),
  m('umorismo', 'media', 'autoironia', 'Ridici su', 'Racconta con autoironia un tuo errore.'),
  m('umorismo', 'difficile', 'serata', 'Animatore', 'Rendi più leggera una situazione tesa senza prendere in giro nessuno.'),
  m('creativita', 'facile', 'idee', 'Lampo di genio', 'Scrivi 5 idee su un problema o un progetto.'),
  m('creativita', 'media', 'bozza', 'Prima bozza', 'Trasforma un\'idea in una bozza: schizzo, testo, prototipo.'),
  m('creativita', 'difficile', 'pubblica', 'Fantasista', 'Finisci una piccola opera e mostrala a qualcuno.'),
  // Mente
  m('disciplina', 'facile', 'letto', 'Si parte bene', 'Rifai il letto e prepara la giornata appena sveglio.'),
  m('disciplina', 'media', 'routine', 'Routine', 'Rispetta la routine serale: niente schermi a letto.'),
  m('disciplina', 'difficile', 'promessa', 'Parola data', 'Fai la cosa che rimandi di più, anche solo 10 minuti.'),
  m('motivazione', 'facile', 'perche', 'Il perché', 'Scrivi in una riga perché vuoi raggiungere il tuo obiettivo.'),
  m('motivazione', 'media', 'passo', 'Prossimo passo', 'Scegli il prossimo piccolo passo e fissalo in calendario.'),
  m('motivazione', 'difficile', 'traguardo', 'Visione', 'Scrivi dove vuoi essere tra 3 mesi e come lo misurerai.'),
  m('benessere', 'facile', 'aria', 'Ricarica', '15 minuti all\'aperto senza telefono.'),
  m('benessere', 'media', 'sonno', 'Recupero', 'Dormi almeno 7 ore e mezza.'),
  m('benessere', 'difficile', 'supporto', 'Non sei solo', 'Senti una persona importante e racconta come stai davvero.'),
];

/** Le cattive abitudini: segnarle con onestà costa XP e un po' di caratteristica. */
export interface Ricaduta {
  id: string;
  nome: string;
  caratteristica: string;
}

export const RICADUTE: Ricaduta[] = [
  { id: 'fumo', nome: 'Fumo', caratteristica: 'resistenza' },
  { id: 'alcol', nome: 'Troppo alcol', caratteristica: 'focus' },
  { id: 'cibo', nome: 'Cibo spazzatura', caratteristica: 'resistenza' },
  { id: 'sonno', nome: 'Poco sonno', caratteristica: 'benessere' },
  { id: 'scroll', nome: 'Ore sui social', caratteristica: 'focus' },
  { id: 'azzardo', nome: 'Gioco d\'azzardo', caratteristica: 'soldi' },
  { id: 'acquisto', nome: 'Acquisto d\'impulso', caratteristica: 'soldi' },
  { id: 'rimando', nome: 'Rimandato tutto', caratteristica: 'disciplina' },
];
