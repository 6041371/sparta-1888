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
  title: "Het geheim van Het Kasteel",
  lead: "Dit dossier is een spelverhaal. Het beschrijft geen echt archiefstuk en geen historische vondst.",
  body: [
    "Er liggen aanwijzingen verspreid over Het Kasteel. Ze gaan over de oorsprong, de identiteit en de mentaliteit van Sparta — zoals dit spel die verzint, niet zoals een archief ze zou bewaren.",
    "Jullie kiezen zelf de route langs de open stations. Elke voltooide opdracht levert punten op en kan een aanwijzing openen.",
    "Aan het eind leggen jullie die aanwijzingen naast elkaar en kraken jullie de eindcode.",
  ],
  facts:
    "De historische feiten in dit spel blijven beperkt tot wat openbaar bekend is: Sparta Rotterdam is opgericht in 1888, de clubkleuren zijn rood en wit, en de thuishaven staat bekend als Het Kasteel. Al het andere in dit dossier is fictie voor het teamspel.",
};

export const RULES = [
  "Blijf bij je team en volg de aanwijzingen van de begeleiders en de huisregels van het stadion.",
  "Kies zelf een route. Alleen ruimtes die de organisatie heeft opengesteld, zijn speelstations.",
  "Scan de QR-code bij het station of vul de stationcode met de hand in.",
  "Een station levert één keer punten op. Opnieuw scannen opent het resultaat, geen tweede score.",
  "Hints kosten punten. Het bedrag en het aantal hints stelt de organisatie in.",
  "De klok loopt vanaf de officiële start en is voor elk team dezelfde. Verversen zet de tijd niet terug.",
  "De finale gaat open wanneer de organisatie die vrijgeeft. Eerder insturen kan niet.",
  "Overleg binnen je team mag. Andere teams hinderen of hun code afkijken hoort er niet bij.",
];

export const SECRET_DEFAULT =
  "Dit geheim hoort bij het spel. Er is geen echt document gevonden en dit verhaal voegt niets toe aan de clubhistorie.\n\nHet geheim van Het Kasteel is de manier waarop jullie vandaag speelden. Samenwerken, inzicht, initiatief en doorzettingsvermogen: wie dat deelt, houdt het kasteel overeind. Niet als muur van steen, maar als team.";

export const FINALE_PROMPT =
  "Combineer de aanwijzingen tot één eindcode. Gebruik hoofdletters of kleine letters; spaties en streepjes tellen niet mee.";

export const FINALE_HINT =
  "Jullie zoeken één reeks zonder spatie. De aanwijzingen van de stations horen achter elkaar.";
