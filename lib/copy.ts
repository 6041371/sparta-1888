export const GAME_TITLES = {
  reaction: "Reaction Arena",
  memory: "Memory Vault",
  code: "Crack the Code",
  photo: "Photo Mission",
} as const;

export const GAME_SUMMARIES = {
  reaction: "Tik alleen op het Sparta-schild. Snelheid en nauwkeurigheid tellen allebei.",
  memory: "Draai paren kaarten om en onthoud waar ze liggen.",
  code: "Los de puzzel op. Het antwoord wordt op de server gecontroleerd.",
  photo: "Maak samen een foto. De organisatie kent daarna de punten toe.",
} as const;

export const PHOTO_PROMPTS = [
  "Beeld samen een doelpunt uit: één keeper, één schutter, de rest juicht.",
  "Vorm met jullie lichamen het cijfer 1 uit 1888.",
  "Maak een teamfoto alsof jullie de selectie zijn die het veld opkomt.",
  "Bouw een menselijk kasteel: twee torens en een muur ertussen.",
  "Beeld de twaalfde man uit: het hele team juicht naar een denkbeeldige tribune.",
];

export const MISSION = {
  kicker: "Vertrouwelijk dossier",
  title: "De Verdwenen Erfenis",
  lead: "Dit dossier is een spelverhaal. De diefstal, het archiefstuk en de verdachten zijn verzonnen.",
  body: [
    "Het is een bijzondere dag bij Sparta Rotterdam. Tijdens het doorspitten van het historische archief wordt een ontdekking gedaan: een oud dossier uit 1888, het jaar waarin Sparta werd opgericht.",
    "Maar er is iets mis. Een belangrijk archiefstuk is verdwenen. Op de plek waar het hoorde te liggen, vinden medewerkers alleen een leeg vak en een mysterieuze boodschap: ‘Wie de geschiedenis kent, zal de waarheid vinden.’",
    "Op verschillende plekken in Het Kasteel zijn vreemde aanwijzingen gevonden. Oude documenten lijken te zijn verplaatst, foto's liggen op de verkeerde plek en sommige verklaringen spreken elkaar tegen.",
    "Jullie zijn aangesteld als speciaal onderzoeksteam. In verschillende ruimtes van Het Kasteel moeten jullie opdrachten uitvoeren, bewijs verzamelen en verklaringen onderzoeken.",
    "Wat is er precies verdwenen? Wie zit erachter? En wat was het motief? Niet iedere aanwijzing vertelt het hele verhaal. Verzamel het bewijs, vergelijk de verklaringen en ontdek wat er werkelijk is gebeurd.",
    "Jullie hebben beperkte tijd om de zaak op te lossen. Aan het einde moeten jullie een verdachte aanwijzen en uitleggen waarom jullie denken dat diegene verantwoordelijk is.",
    "Het dossier ligt klaar. Het onderzoek begint nu. Sparta rekent op jullie.",
  ],
  facts:
    "De historische feiten in dit spel blijven beperkt tot wat openbaar bekend is: Sparta Rotterdam is opgericht in 1888, de clubkleuren zijn rood en wit, en de thuishaven staat bekend als Het Kasteel. De verdwijning en alle personages zijn fictie voor het teamspel. Dit zijn geen beschuldigingen aan echte personen.",
};

export const SUSPECTS = [
  {
    id: "mira",
    name: "Mira Vos",
    role: "Spelpersonage · pers",
    statement: "Ik keek om negen uur in het archiefvak. Het was leeg. Ik heb niets meegenomen.",
  },
  {
    id: "daan",
    name: "Daan de Wit",
    role: "Spelpersonage · bestuur",
    statement: "Om half negen was de map al weg. Volgens mij heeft een onbekende supporter hem meegenomen.",
  },
  {
    id: "noor",
    name: "Noor Klein",
    role: "Spelpersonage · museum",
    statement: "Ik haalde om 08:40 een map met een rood lint op voor een rondleiding. Ik dacht dat het een kopie was.",
  },
  {
    id: "finn",
    name: "Finn Bakker",
    role: "Spelpersonage · facilitair",
    statement: "Ik heb alleen fotolijsten recht gezet. Aan mappen kom ik niet.",
  },
] as const;

export const CULPRIT_ID = "noor";

export const RULES = [
  "Blijf bij je team en volg de aanwijzingen van de instructeur en de huisregels van het stadion.",
  "Scan de vaste QR-code in een ruimte. Alleen ruimtes die de instructeur heeft opengesteld, zijn vandaag te spelen.",
  "Een opdracht levert één keer punten op. Opnieuw scannen opent het resultaat, geen tweede score.",
  "Hints kosten punten. Het bedrag en het aantal hints stelt de instructeur in.",
  "De klok loopt vanaf de officiële start en is voor elk team dezelfde. Verversen zet de tijd niet terug.",
  "Aan het einde wijzen jullie één spelpersonage aan en leggen jullie uit waarom.",
  "Overleg binnen je team mag. Andere teams hinderen hoort er niet bij.",
];

export const SECRET_DEFAULT =
  "Dit geheim hoort bij het spel. Er is geen echt document verdwenen en geen echte persoon beschuldigd.\n\nNoor Klein, de fictieve museumgids, nam om 08:40 een map met een rood lint mee voor een rondleiding. Ze dacht dat het een kopie was en liet die in de kleedkamer achter. Het origineel is nooit gestolen. De andere verklaringen kloppen niet met dat tijdstip.\n\nDe erfenis van Sparta zit niet in die map. Die zit in hoe jullie samen keken, overlegden en doorzetten.";

export const FINALE_PROMPT =
  "Wijs het spelpersonage aan dat de map heeft verplaatst en leg uit waarom de andere verklaringen niet kloppen. Dit zijn verzonnen personages, geen echte mensen.";

export const FINALE_HINT =
  "Vergelijk de tijden. Wie was als enige in het museum vóór negen uur, met een map zonder archiefstempel?";
