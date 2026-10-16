export const GAME_TITLES = {
  reaction: "Schildtest",
  memory: "Geheugenspel",
  code: "Codepuzzel",
  photo: "Foto-opdracht",
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
  title: "Het Geheim van 1888",
  lead: "Een interactieve reis door de geschiedenis van Sparta Rotterdam. De diefstal en de verdachten zijn verzonnen.",
  body: [
    "Het standbeeld van Bok de Korver is verdwenen. In Het Kasteel ligt alleen de lege plek, en niemand heeft een verklaring die klopt.",
    "Jullie onderzoeken de kamers die vandaag open zijn. Elke kamer heeft vragen en, waar die er is, een kort spel. Daarmee verdienen jullie bewijsstukken voor de zaakmap.",
    "Er zijn altijd zeven bewijsstukken. Staan er minder kamers open, dan levert een kamer er meer dan één op. Jullie zien in de kamer hoeveel er te vinden zijn.",
    "Op het veld verschijnen Sparta-spelers zodra een kamer is afgerond. Tik een speler aan voor zijn vraag.",
    "Pas als alle zeven bewijsstukken binnen zijn, of in de laatste twintig minuten, kunnen jullie een verdachte aanwijzen.",
    "De vragen gaan over de club. De verdwijning, de bewijsstukken en de vijf verdachten zijn fictie voor dit spel.",
  ],
  facts:
    "De verdwijning van het standbeeld en de verdachten zijn fictie. Dit zijn geen beschuldigingen aan echte personen. De kennisvragen komen uit de spelbron.",
};

export const SUSPECTS = [
  {
    id: "hendrik",
    name: "Hendrik van Dalen",
    role: "Verzamelaar",
    statement: "Hij verzamelt historische voetbalmemorabilia en wilde het standbeeld graag voor zijn privécollectie.",
  },
  {
    id: "marco",
    name: "Marco de Wit",
    role: "Fanatieke Sparta-supporter",
    statement: "Een fanatieke supporter. Mogelijk wilde hij met de verdwijning een statement maken tegen de club.",
  },
  {
    id: "thomas",
    name: "Thomas Vermeer",
    role: "Voormalig stadionmedewerker",
    statement: "Hij werkte in het stadion, kende de beveiliging en wist hoe hij bij bepaalde ruimtes kon komen.",
  },
  {
    id: "eva",
    name: "Eva van Rijn",
    role: "Sparta-historicus",
    statement: "Een historicus met interesse in het erfgoed. Mogelijk wilde zij aandacht voor de bescherming van historische objecten.",
  },
  {
    id: "bosman",
    name: "Richard Bosman",
    role: "Handelaar in voetbalmemorabilia",
    statement: "Hij handelt in historische voetbalobjecten en zou het standbeeld met winst kunnen doorverkopen.",
  },
] as const;

export const CULPRIT_ID = "bosman";

export const RULES = [
  "Blijf bij je team en volg de aanwijzingen van de instructeur en de huisregels van het stadion.",
  "Scan de vaste QR-code in een ruimte. Alleen ruimtes die de instructeur heeft opengesteld, zijn vandaag te spelen.",
  "Een opdracht levert één keer punten op. Opnieuw scannen opent het resultaat, geen tweede score.",
  "Hints kosten punten. Het bedrag en het aantal hints stelt de instructeur in.",
  "De klok loopt vanaf de officiële start en is voor elk team dezelfde. Verversen zet de tijd niet terug.",
  "De finale opent als alle zeven bewijsstukken in de zaakmap zitten, of in de laatste twintig minuten.",
  "Overleg binnen je team mag. Andere teams hinderen hoort er niet bij.",
];

export const SECRET_DEFAULT =
  "Dit slot hoort bij het spel. Er is geen echt standbeeld gestolen en geen echte persoon beschuldigd.\n\nRichard Bosman nam het standbeeld van Bok de Korver mee om het met winst door te verkopen. Hij vervoerde het in een grote sporttas en gebruikte een donkere bestelbus. Het beeld lag tijdelijk op een verborgen opslagplek tot de overdracht.\n\nDe polaroid toont de tas. De camera toont de bus. De betaling draagt de initialen R.B. De chat spreekt over een overdracht. De tweede polaroid koppelt de bus aan de opslag. Het transportdocument noemt een bronzen sportobject en een naam op …sman. De advertentie van RB Collectibles wijst naar dezelfde plek.\n\nSamen leiden die aanwijzingen naar Richard Bosman. Het standbeeld van Bok de Korver komt terug.";

export const FINALE_PROMPT =
  "Wijs aan wie het standbeeld van Bok de Korver heeft meegenomen. Gebruik de zeven bewijsstukken in de zaakmap. De verdachten zijn verzonnen.";

export const FINALE_HINT =
  "Kijk naar de initialen bij het geld en naar de achternaam op het transportdocument. De zaakmap noemt ze allebei.";
