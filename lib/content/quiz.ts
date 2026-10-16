export type QuizKind = "choice" | "open" | "creative";

export interface QuizOption {
  id: string;
  label: string;
}

export interface QuizQuestion {
  id: string;
  locationId: string;
  prompt: string;
  kind: QuizKind;
  options: QuizOption[];
  answer: string;
  accept: string[];
  inputLabel: string;
  minLines: number;
  minLength: number;
  correctFeedback: string;
}

export interface QuizLocation {
  id: string;
  name: string;
  intro: string;
}

export interface ReviewItem {
  location: string;
  text: string;
  reason: string;
}

const LETTERS = ["a", "b", "c", "d", "e", "f"] as const;

function choice(id: string, locationId: string, prompt: string, options: string[], answer: string): QuizQuestion {
  return {
    id,
    locationId,
    prompt,
    kind: "choice",
    options: options.map((label, index) => ({ id: LETTERS[index], label })),
    answer,
    accept: [],
    inputLabel: "Jullie antwoord",
    minLines: 0,
    minLength: 0,
    correctFeedback: "Goed.",
  };
}

function open(id: string, locationId: string, prompt: string, answer: string, accept: string[] = []): QuizQuestion {
  return {
    id,
    locationId,
    prompt,
    kind: "open",
    options: [],
    answer,
    accept: [answer, ...accept],
    inputLabel: "Jullie antwoord",
    minLines: 0,
    minLength: 0,
    correctFeedback: "Goed.",
  };
}

function creative(id: string, locationId: string, prompt: string, minLines: number, minLength: number, feedback: string): QuizQuestion {
  return {
    id,
    locationId,
    prompt,
    kind: "creative",
    options: [],
    answer: "",
    accept: [],
    inputLabel: "Jullie tekst",
    minLines,
    minLength,
    correctFeedback: feedback,
  };
}

export const QUIZ_LOCATIONS: QuizLocation[] = [
  {
    id: "bestuurskamer",
    name: "Bestuurskamer",
    intro:
      "Welkom in de bestuurskamer van Sparta Rotterdam. Hier worden belangrijke beslissingen genomen over de club. Denk aan financiën, transfers, beleid en de toekomst van Sparta. De bestuurskamer is het centrum van de organisatie. Bestuurders en directieleden bespreken hier hoe de club geleid wordt en hoe Sparta zich blijft ontwikkelen, zowel sportief als maatschappelijk. Sparta Rotterdam is opgericht in 1888 en is daarmee de oudste betaaldvoetbalclub van Nederland. In deze ruimte wordt gewerkt aan het behouden van die rijke geschiedenis én aan de toekomst van de club.",
  },
  {
    id: "perskamer",
    name: "Perskamer",
    intro:
      "Welkom in de perskamer van Sparta Rotterdam. Dit is de plek waar trainers, spelers en journalisten samenkomen na wedstrijden. Hier worden interviews gegeven, wedstrijden geanalyseerd en belangrijke momenten besproken. De perskamer speelt een grote rol binnen het moderne voetbal. Supporters, televisie en media krijgen via deze ruimte informatie over de club en de prestaties op het veld. Woorden zijn hier belangrijk: één uitspraak kan nieuws worden. Ook Jules Deelder stond bekend om zijn sterke manier van spreken. Met korte, directe zinnen wist hij mensen te raken, net zoals Sparta via deze ruimte zijn verhaal vertelt aan de buitenwereld.",
  },
  {
    id: "tribune",
    name: "Tribune",
    intro:
      "Welkom aan het veld van Sparta Rotterdam. Dit is de plek waar alles samenkomt: training, tactiek, spanning en strijd. Op dit veld spelen de voetballers van Sparta hun wedstrijden. Hier wordt gevochten voor punten, overwinningen en clubtrots. Iedere wedstrijd vraagt om techniek, conditie, samenwerking en doorzettingsvermogen. Het veld van Het Kasteel heeft door de jaren heen veel belangrijke wedstrijden gezien. Grote spelers, bijzondere doelpunten en historische momenten maakten hier deel uit van de geschiedenis van Sparta. Voor spelers is dit het belangrijkste deel van het stadion. Hier laten zij zien waar ze voor getraind hebben. Voor supporters is het de plek waar hoop, spanning en emotie samenkomen. Jules Deelder beschreef Sparta vaak als meer dan sport alleen. Volgens hem hoorde de club bij Rotterdam zoals de haven bij de stad hoort: stevig, eerlijk en vol karakter.",
  },
  {
    id: "museum",
    name: "Sparta Museum",
    intro:
      "Welkom in het Sparta Museum. Hier wordt de geschiedenis van Sparta Rotterdam bewaard en verteld. In het museum zijn oude shirts, foto’s, bekers, documenten en andere bijzondere voorwerpen te zien. Deze collectie laat zien hoe Sparta zich door de jaren heen heeft ontwikkeld. Het museum vertelt niet alleen het verhaal van voetbalwedstrijden, maar ook van supporters, spelers en belangrijke personen rondom de club. Zo ontdek je hoe Sparta een belangrijk onderdeel werd van de geschiedenis van Rotterdam. Ook de band tussen Jules Deelder en Sparta krijgt hier aandacht. Hij was niet alleen supporter, maar groeide uit tot een cultureel symbool van zowel de club als de stad Rotterdam.",
  },
  {
    id: "kasteel",
    name: "Het Kasteel",
    intro:
      "Welkom op Het Kasteel, het stadion van Sparta Rotterdam. Het stadion werd geopend in 1916 en is een van de oudste stadions in het Nederlandse betaalde voetbal dat nog in gebruik is. De bijnaam “Het Kasteel” komt door de opvallende torens aan de voorkant van het stadion. Deze torens zijn uitgegroeid tot een symbool van Sparta Rotterdam en van de voetbalgeschiedenis van Nederland. Voor supporters is Het Kasteel meer dan alleen een stadion. Het is een plek vol herinneringen, tradities en clubliefde. Ook Jules Deelder voelde zich sterk verbonden met deze plek en noemde Sparta een belangrijk onderdeel van de Rotterdamse identiteit.",
  },
  {
    id: "kleedkamer",
    name: "Kleedkamer",
    intro:
      "Welkom in de kleedkamer van Sparta Rotterdam. Dit is de plek waar spelers zich voorbereiden op wedstrijden. Hier worden wedstrijdbesprekingen gehouden, tactieken uitgelegd en laatste instructies gegeven voordat het team het veld op gaat. De kleedkamer is belangrijk voor het teamgevoel. Hier ontstaat saamhorigheid en motivatie. Voor veel spelers is dit een van de meest intense ruimtes van het stadion, omdat hier de spanning voor een wedstrijd duidelijk voelbaar is. Voetbal draait niet alleen om talent, maar ook om samenwerking, discipline en vertrouwen in elkaar. In de kleedkamer begint dat proces.",
  },
  {
    id: "deelderzaal",
    name: "Jules Deelder",
    intro:
      "Wanneer jullie deze ruimte binnenkomen, stappen jullie niet zomaar een kamer binnen. Jullie stappen Rotterdam binnen. De nacht binnen. De wereld van Jules Deelder. Een wereld van neonlichten, jazz, zwarte pakken en harde woorden. Een wereld waar poëzie klinkt als straatgeluid. Waar Rotterdam geen stad is, maar een gevoel. Jules Deelder was dichter, performer, schrijver en nachtburgemeester van Rotterdam. Maar boven alles was hij zichzelf. Onmiskenbaar. Direct. Rauw. Rotterdams. Zijn woorden leven nog altijd voort in de stad. Op muren. In cafés. In herinneringen. En in de mensen die Rotterdam begrijpen. In deze ruimte gaan jullie ontdekken wie Deelder écht was. Niet alleen via feiten en verhalen, maar via sfeer, ritme en verbeelding. “De omgeving van de mens is de medemens.” – Jules Deelder",
  },
  {
    id: "veld",
    name: "Het Veld",
    intro:
      "Op het veld staan verschillende spelers, elk op de eigen positie: Jan van Beveren, Denzel Dumfries, John de Wolf, Danny Blind, Bok de Korver, Louis van Gaal, Kevin Strootman, Wout Holverda, Winston Bogarde, Tinus Bosselaar en Ronald Lengkeek. Het Veld is een aparte opdracht en geen extra ruimte in het stadion.",
  },
];

export const LOCATION_CLUES: Record<string, { title: string; text: string }> = {
  bestuurskamer: {
    title: "Vóór negen uur",
    text: "Het dossier was al weg vóór negen uur. Een verklaring die pas om negen uur begint, mist het moment.",
  },
  perskamer: {
    title: "Geen dader gezien",
    text: "De pers zag alleen het lege vak. Niemand heeft daar een persoon met de map zien weglopen.",
  },
  tribune: {
    title: "08:40",
    text: "Op het rondleidingsschema staat 08:40, vertrek vanuit het museum.",
  },
  museum: {
    title: "Rood lint",
    text: "Iemand haalde een map met een rood lint weg, zonder archiefstempel. Dat is een kopie voor een rondleiding.",
  },
  deelderzaal: {
    title: "Eerst de rondleiding",
    text: "Eerst de rondleiding om 08:40, daarna pas het lege vak. De map is niet door een supporter meegenomen.",
  },
  kleedkamer: {
    title: "Het verhaal",
    text: "In de kleedkamer ligt een rode map tussen de trainingshesjes. Het is een kopie, geen origineel archiefstuk.",
  },
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  choice("bk-1", "bestuurskamer", "Er staat hier in deze ruimte een standbeeld van een echte Sparta-legende. Welke oud-Sparta-speler wordt hier afgebeeld?", ["Danny Blind", "Kevin Strootman", "Bok de Korver", "John de Wolf"], "c"),
  choice("bk-2", "bestuurskamer", "Wie was tijdelijk eigenaar van Sparta’s stadion “Het Kasteel”?", ["De gemeente Rotterdam", "Een groep supporters", "Een extern vastgoedfonds", "De KNVB"], "a"),
  choice("bk-3", "bestuurskamer", "Voor welke clubonderdelen heeft de houder van het “bijzondere aandeel” een vetorecht of verplichte goedkeuring?", ["Ticketprijzen", "Clubnaam, logo, clubkleuren en locatie van de jeugdopleiding", "Transfersommen", "Cateringprijzen"], "b"),
  choice("bk-6", "bestuurskamer", "Welke twee vernieuwingen kwamen in de zomer van 2022 samen op Het Kasteel?", ["Een nieuw logo en een nieuw supportershome", "Natuurgras en een verbouwde kleedkamer van de A-selectie", "Een extra tribune en een parkeergarage", "Nieuwe torens en een bredere gracht"], "b"),
  choice("bk-7", "bestuurskamer", "Wat was in 1916 bijzonder aan Bok de Korver?", ["Hij werd bondscoach van Oranje", "Er verscheen als eerste over een Nederlandse voetballer een biografie over hem", "Hij ontwierp het Sparta-logo", "Hij werd de eerste betaalde speler van Nederland"], "b"),
  choice("bk-8", "bestuurskamer", "In welk deel van het elftal maakte John de Wolf vooral naam?", ["Als keeper", "Als verdediger", "Als middenvelder", "Als spits"], "b"),
  choice("bk-9", "bestuurskamer", "Welke rol had Wout Holverda vooral bij Sparta?", ["Doelman", "Aanvaller", "Trainer", "Clubarts"], "b"),
  choice("bk-10", "bestuurskamer", "Welke Spartaan is volgens officiële clubcijfers topscorer van Sparta in de Eredivisie?", ["Wout Holverda", "Ronald Lengkeek", "Tinus Bosselaar", "John de Wolf"], "b"),
  choice("bk-11", "bestuurskamer", "Tegen welke club speelt Sparta de bekendste Rotterdamse stadsderby?", ["Excelsior", "Feyenoord", "PSV", "ADO Den Haag"], "b"),

  choice("ps-4", "perskamer", "Over welke tegenstander sprak Maurice Steijn toen hij zei: “We moeten over onze grenzen heen gaan om een resultaat te behalen”?", ["Ajax", "PSV", "Feyenoord", "AZ"], "c"),
  choice("ps-5", "perskamer", "Waarom noemde Maurice Steijn de 3–4 overwinning in De Kuip “een legendarische overwinning”?", ["Omdat Sparta kampioen werd", "Omdat Sparta een uitderby won bij Feyenoord", "Omdat Sparta de bekerfinale won", "Omdat Sparta voor het eerst Europees voetbal behaalde"], "b"),
  choice("ps-6", "perskamer", "Welke officiële reden gaf Sparta op 1 november 2024 voor het schorsen van hoofdtrainer Jeroen Rijsdijk en zijn assistent?", ["Slechte financiële resultaten", "Problemen met supporters", "Het gebrek aan perspectief in de sportieve ontwikkeling", "Een conflict met de KNVB"], "c"),
  choice("ps-7", "perskamer", "Wat kun je zien op de Hall of Fame-muur?", ["Sponsors", "Trainers", "Spelers", "Fans"], "b"),
  choice("ps-8", "perskamer", "Wat gebeurt er meestal direct na een wedstrijd in de perskamer?", ["Contractonderhandelingen", "Persconferenties en interviews", "Teamtrainingen", "Ticketverkoop"], "b"),
  choice("ps-9", "perskamer", "Wie staat meestal centraal tijdens een persconferentie na een wedstrijd?", ["De groundsman", "De supporters", "De trainer en spelers", "De scheidsrechter"], "c"),
  choice("ps-10", "perskamer", "Waarom is de perskamer belangrijk voor een voetbalclub?", ["Hier worden spelers verkocht", "Hier communiceert de club met media en supporters", "Hier trainen de jeugdteams", "Hier worden wedstrijden gespeeld"], "b"),
  choice("ps-11", "perskamer", "Welke bekende Rotterdammer werd sterk verbonden met Sparta én de mediawereld?", ["Jules Deelder", "André Hazes", "Louis van Gaal", "Willem van Hanegem"], "a"),
  choice("ps-12", "perskamer", "Wat proberen trainers vaak te doen tijdens interviews na moeilijke wedstrijden?", ["Spelers ontslaan", "Rust bewaren en uitleg geven", "Nieuwe shirts presenteren", "Het stadion sluiten"], "b"),

  choice("tr-1", "tribune", "Wat is uniek aan het ontwerp van het stadion van Sparta?", ["Het ligt onder de grond", "Het heeft een kasteelachtige structuur", "Het heeft geen zitplaatsen", "Het bestaat volledig uit glas"], "b"),
  choice("tr-2", "tribune", "Hoe waren voetbaldoelen opgebouwd in de beginjaren van de sport?", ["Twee palen met een lat en net", "Twee palen met een touw of lint ertussen", "Eén paal en een net", "Volledig houten doelen met muren"], "b"),
  choice("tr-3", "tribune", "Waarom werd de vrouwenwedstrijd afgelast?", ["Slecht weer", "Geen speelsters beschikbaar", "Het werd als ongepast beschouwd", "Problemen met het stadion"], "c"),
  choice("tr-4", "tribune", "Wanneer werd vrouwenvoetbal officieel toegestaan in Nederland?", ["1950", "1965", "1971", "1980"], "c"),
  choice("tr-5", "tribune", "Welke van deze innovaties introduceerde Sparta?", ["VAR", "Doelnetten", "Kunstgras", "Strafschoppenseries"], "b"),
  choice("tr-6", "tribune", "Welke bijnaam wordt vaak gebruikt voor de supporters van een voetbalclub vanwege hun invloed vanaf de tribune?", ["De reservespelers", "De vierde official", "De twaalfde man", "De veldwachters"], "c"),
  choice("tr-7", "tribune", "In welk jaar werd Het Kasteel geopend?", ["1916", "1888", "1925", "1959"], "a"),
  choice("tr-8", "tribune", "Welke Engelse club inspireerde het rood-witte tenue van Sparta?", ["Arsenal", "Liverpool", "Manchester United", "Sunderland"], "d"),
  choice("tr-9", "tribune", "Hoe vaak werd Sparta landskampioen?", ["4 keer", "6 keer", "8 keer", "10 keer"], "b"),
  choice("tr-10", "tribune", "In welk jaar won Sparta voor het eerst de landstitel?", ["1888", "1916", "1909", "1959"], "c"),
  choice("tr-11", "tribune", "In welk jaar stond bij Sparta al een vrouwenvoetbalwedstrijd gepland?", ["1896", "1920", "1954", "1971"], "a"),
  choice("tr-12", "tribune", "Welke term wordt in het voetbal gebruikt voor een tribune langs de lange zijde van het veld?", ["Achterlijn", "Middencirkel", "Doelvak", "Lange zijde"], "d"),
  choice("tr-13", "tribune", "Over welke lijn moet de bal volledig zijn gegaan voordat een ingooi wordt gegeven?", ["Doellijn", "Zijlijn", "Middenlijn", "Strafschopgebied"], "b"),
  choice("tr-14", "tribune", "Hoe lang duurt een reguliere voetbalwedstrijd zonder blessuretijd en verlenging?", ["60 minuten", "80 minuten", "90 minuten", "100 minuten"], "c"),
  choice("tr-15", "tribune", "Hoeveel toeschouwers passen er ongeveer in Het Kasteel?", ["Ruim 11.000", "Ruim 25.000", "Ruim 40.000", "Ruim 55.000"], "a"),

  choice("mu-1", "museum", "Waarom waren oude voetballen moeilijk om mee te spelen?", ["Ze waren te klein", "Ze werden zwaar in de regen", "Ze stuiterden niet", "Ze waren gemaakt van metaal"], "b"),
  open("mu-2", "museum", "Wat was de bijnaam van de oude leren voetbal?", "Het bruine monster", ["bruine monster", "het bruine monster"]),
  open("mu-3", "museum", "Met welke sport werd Sparta oorspronkelijk opgericht?", "Cricket", ["cricket"]),
  open("mu-4", "museum", "Wat zijn de hoofdkleuren van Sparta?", "Rood en wit", ["rood en wit", "rood wit", "rood-wit"]),
  choice("mu-5", "museum", "Wat gebeurde er met de meeuw waardoor dit object hier wordt tentoongesteld?", ["Het werd de mascotte van de club", "De meeuw vloog het stadion binnen en vertrok nooit meer", "De meeuw werd tijdens een wedstrijd neergeschoten en later opgezet", "De meeuw werd uit een ander stadion meegenomen"], "c"),
  choice("mu-6", "museum", "Welke van deze sporten maakten allemaal deel uit van de geschiedenis van Sparta?", ["Cricket, Voetbal, Rugby, Hockey, Softbal", "Voetbal, Basketbal, Tennis, Volleybal", "Cricket, IJshockey, Honkbal, Handbal", "Voetbal, Zwemmen, Wielrennen, Boksen"], "a"),
  choice("mu-7", "museum", "In welke periode beleefde Sparta zijn eerste gouden tijdperk?", ["1888–1895", "1909–1915", "1920–1930", "1950–1960"], "b"),
  choice("mu-8", "museum", "In welk jaar won Sparta voor het eerst de landstitel?", ["1899", "1905", "1909", "1916"], "c"),
  choice("mu-9", "museum", "Wat maakte Het Kasteel bij de opening in 1916 bijzonder in Nederland?", ["Het was het eerste stadion met kunstlicht", "Het was het eerste voetbalstadion met een stenen hoofdgebouw", "Het was volledig van hout gebouwd", "Het lag midden in het centrum"], "b"),
  open("mu-10", "museum", "Welke speler stond bekend om zijn lange haar?", "De Wolf", ["John de Wolf", "de Wolf"]),
  open("mu-11", "museum", "Welke speler groeide bij Sparta uit tot rechtsback?", "Dumfries", ["Denzel Dumfries"]),

  open("ka-1", "kasteel", "Waarom wordt het stadion “Het Kasteel” genoemd?", "Vanwege de torens", ["de torens", "torens", "vanwege de torens"]),
  choice("ka-3", "kasteel", "Welke dieren staan boven de ingang van Het Kasteel als symbolische bewakers?", ["Apen", "Adelaars", "Leeuwen", "Honden"], "a"),
  choice("ka-5", "kasteel", "Wat is het belangrijkste doel van “De Betrokken Spartaan” binnen Sparta Rotterdam?", ["Meer wedstrijden winnen", "Het stadion verbeteren", "De maatschappij en kansen in de gemeenschap verbeteren", "Nieuwe spelers scouten"], "c"),
  open("ka-6", "kasteel", "Noem één van de oprichters van Sparta Rotterdam.", "Pieter van der Kooij"),
  choice("ka-7", "kasteel", "Wat is het belangrijkste doel van De Betrokken Spartaan?", ["Meer wedstrijden winnen in de Eredivisie", "Nieuwe spelers scouten voor het eerste elftal", "Kansengelijkheid en leefbaarheid verbeteren in en rond Delfshaven", "Alleen het stadion moderner maken"], "c"),
  choice("ka-8", "kasteel", "Welke vier pijlers gebruikt De Betrokken Spartaan nu officieel?", ["Veiligheid, Media, Scouting en Hospitality", "Sport & Bewegen, Werk & Inkomen, Leefbaarheid & Ontwikkeling en Educatie", "Jeugdopleiding, Ticketing, Sponsoring en Transfers", "Eredivisie, Amateurvoetbal, Business en Fanshop"], "b"),
  choice("ka-9", "kasteel", "Wat gebeurt er vooral binnen Streetrulez?", ["Kinderen en jongeren sporten in hun eigen wijk onder begeleiding van sportcoaches", "Alleen esports-toernooien voor supporters", "Alleen huiswerkbegeleiding in de business lounge", "Een eliteprogramma voor profvoetballers"], "a"),
  choice("ka-10", "kasteel", "Voor wie is Community Champions bedoeld en hoe lang duurt het traject meestal?", ["Voor 9- tot 14-jarigen, 6 weken", "Voor 14- tot 27-jarigen, 16 weken", "Voor 55-plussers, één volledig seizoen", "Voor 17- tot 27-jarigen, 12 weken"], "b"),
  choice("ka-11", "kasteel", "Wat maakt Rug-dekking vooral praktijkgericht?", ["Deelnemers leren alleen wedstrijdverslagen schrijven", "Deelnemers bezoeken vooral het museum en de Hall of Fame", "Deelnemers volgen workshops, halen certificaten en doen ervaring op bij thuiswedstrijden", "Deelnemers trainen voor een halve marathon"], "c"),
  choice("ka-11b", "kasteel", "Welke beschrijving van Walking Football klopt het best?", ["Een gratis project voor 55-plussers, elke woensdagochtend bij Het Kasteel", "Een betaald programma voor profspelers op vrijdagavond", "Een lesprogramma voor basisschoolkinderen tijdens schooltijd", "Een online training voor supporters in het buitenland"], "a"),
  choice("ka-12", "kasteel", "Welke rol past het best bij stagiairs of vrijwilligers binnen De Betrokken Spartaan?", ["Sportcoach of ondersteuner bij wijkactiviteiten zoals Streetrulez", "Videoscheidsrechter in de Eredivisie", "Internationale scout in Zuid-Amerika", "Transferonderhandelaar van de A-selectie"], "a"),
  choice("ka-13", "kasteel", "Wat is voor de meeste geïnteresseerden de logischste eerste stap?", ["Wachten tot een speler je persoonlijk belt", "Eerst kijken welk project past, en daarna contact opnemen via formulier of projectcoördinator", "Alleen een seizoenkaart kopen en hopen dat je geplaatst wordt", "Alleen een bericht sturen via sociale media"], "b"),
  choice("ka-14", "kasteel", "Hoe worden seizoenkaarthouders in 2026/2027 automatisch Betrokken Spartaan?", ["Door verplicht vrijwilligersdiensten te draaien", "Door automatisch 1,888% van de seizoenkaartprijs als maatschappelijke bijdrage op te nemen", "Door een apart museumticket te kopen", "Door zich eerst in te schrijven voor een businessclub-event"], "b"),
  choice("ka-15", "kasteel", "Welke samenwerking is echt?", ["Rotterdam.Protected. met onder meer ESET Nederland, Politie Eenheid Rotterdam en de Gemeente Rotterdam", "Community Champions met NASA en UEFA", "Walking Football met Wimbledon", "Rug-dekking zonder externe partners"], "a"),
  choice("ka-16", "kasteel", "Welke reeks bestaat uit echte voorbeelden van recente initiatieven van De Betrokken Spartaan?", ["FC Oost, FC Nieuwland, FC Ambacht en FC Holy", "Sparta Ski Team, FC Londen en Sparta Surf Lab", "Alleen tv-programma’s rond het eerste elftal", "Internationale stages voor buitenlandse topscouts"], "a"),
  choice("ka-17", "kasteel", "Hoe maakt De Betrokken Spartaan zijn maatschappelijke impact zichtbaar?", ["Alleen door likes en volgers op sociale media te tellen", "Via Social Handprint, gekoppeld aan SDG’s en omgerekend naar impactwaarde in euro’s", "Alleen via competitiepunten van het eerste elftal", "Via transfersommen van oud-spelers"], "b"),
  creative("ka-18", "kasteel", "Noem twee manieren waarop De Betrokken Spartaan zowel de gemeenschap als Sparta Rotterdam helpt.", 0, 20, "Jullie antwoord is bewaard. In de bron staat geen enkel goed antwoord."),
  creative("ka-19", "kasteel", "Stel: je bent supporter, student of buurtbewoner en wilt meedoen. Welk project zou jij kiezen, en welke eerste stap zou je zetten?", 0, 20, "Jullie antwoord is bewaard. In de bron staat geen enkel goed antwoord."),
  creative("ka-20", "kasteel", "Waarom past De Betrokken Spartaan volgens jou goed bij de identiteit van Sparta Rotterdam?", 0, 20, "Jullie antwoord is bewaard. In de bron staat geen enkel goed antwoord."),

  choice("kl-1", "kleedkamer", "Wat was het doel van de lagere stoelen voor tegenstanders?", ["Om meer supporters in de kleedkamer te laten passen", "Om tegenstanders comfortabeler te laten zitten", "Om Sparta een mentaal voordeel te geven", "Om de kleedkamer moderner te maken"], "c"),
  choice("kl-3", "kleedkamer", "Als je naar deze opstelling op het bord kijkt, voor welk type wedstrijd zou deze opstelling waarschijnlijk worden gebruikt?", ["Een zeer verdedigende wedstrijd, alleen gericht op verdedigen", "Een aanvallende of gebalanceerde wedstrijd met zowel aanval als verdediging", "Een training zonder tegenstanders", "Een strafschoppenserie"], "b"),
  choice("kl-4", "kleedkamer", "Na welke wedstrijd en in welke stad vierde Sparta promotie in 2019?", ["Na een 1–0 overwinning op NAC Breda in Breda", "Na een 2–1 overwinning op FC Twente in Enschede", "Na een 0–2 overwinning tegen De Graafschap in Doetinchem", "Na een 3–0 overwinning op Excelsior in Rotterdam"], "c"),
  choice("kl-5", "kleedkamer", "Welke speler draagt tijdens een voetbalwedstrijd officieel de aanvoerdersband?", ["De speler die als laatste scoorde", "De aanvoerder van het team", "Altijd de doelman", "De oudste speler van het team"], "b"),
  choice("kl-6", "kleedkamer", "Wat was het directe gevolg van Sparta’s 0–2 zege bij De Graafschap op 28 mei 2019?", ["Sparta won de KNVB Beker", "Sparta plaatste zich voor Europees voetbal", "Sparta promoveerde terug naar de Eredivisie", "Sparta werd kampioen van de Eerste Divisie"], "c"),
  choice("kl-7", "kleedkamer", "Welke oud-Sparta speler stond bekend om zijn harde muziek in de kleedkamer vóór wedstrijden?", ["Danny Blind", "Nourdin Boukhari", "Rick van Drongelen", "Kevin Strootman"], "b"),
  choice("kl-8", "kleedkamer", "Welk intern detail noemde Thomas Verhaar als iets dat vooral spelers en staf aan de kleedkamer waarderen?", ["De massagetafel", "Het bubbelbad", "De muziekinstallatie", "De ijsmachine"], "b"),
  choice("kl-9", "kleedkamer", "Wat vertelde Ragnar Ache dat Sparta in de rust deed voor de tactiekbespreking?", ["Strafschoppen oefenen", "De warming-up herhalen", "Beelden van de eerste helft terugkijken", "Meteen het veld op gaan"], "c"),
  choice("kl-10", "kleedkamer", "Wie noemde Thomas Verhaar als iemand die de kleedkamer in de rust wakker kon schudden?", ["Lars Veldwijk", "Adil Auassar", "Denzel Dumfries", "Bart Vriends"], "c"),
  choice("kl-11", "kleedkamer", "Wat gebeurde er volgens Robert Mühren in de rust van Sparta–ADO Den Haag in maart 2018?", ["Er werd gezongen voor een debutant", "Dick Advocaat ging fel tekeer", "De spelers keken rustig televisie", "De keeper raakte geblesseerd"], "b"),
  choice("kl-12", "kleedkamer", "Waarom werd de jonge supporter Mads door de club in de kleedkamer uitgenodigd?", ["Om een contract te tekenen", "Om de periodetitel mee te vieren", "Om een persconferentie te geven", "Om het nieuwe shirt te onthullen"], "b"),
  choice("kl-13", "kleedkamer", "Wat vierde Sparta in de kleedkamer in Doetinchem na 28 mei 2019?", ["De winst van de KNVB Beker", "Een periodetitel", "Promotie naar de Eredivisie", "Een plaats in Europa"], "c"),
  choice("kl-14", "kleedkamer", "Wat zei Bart Vriends dat op herhaling in de Sparta-kleedkamer zou komen?", ["Een lied van de supporters", "Een toespraak van Maurice Steijn", "Een fragment met uitspraken van Joey Veerman", "Een samenvatting van NOS"], "c"),
  choice("kl-15", "kleedkamer", "Wie is normaal gesproken verantwoordelijk voor het bepalen en uitleggen van de wedstrijdtactiek?", ["De hoofdtrainer", "De stadionspeaker", "De materiaalman", "De scheidsrechter"], "a"),
  choice("kl-16", "kleedkamer", "Welke positie staat in een traditionele 4-3-3-opstelling het verst naar voren?", ["Centrale verdediger", "Keeper", "Centrumspits", "Verdedigende middenvelder"], "c"),
  choice("kl-17", "kleedkamer", "Hoe lang duurt de rust tussen de twee helften van een reguliere voetbalwedstrijd maximaal volgens de spelregels?", ["10 minuten", "15 minuten", "20 minuten", "30 minuten"], "b"),
  choice("kl-18", "kleedkamer", "Welk onderdeel moeten voetballers verplicht dragen tijdens een officiële wedstrijd?", ["Polsbandjes", "Handschoenen", "Een hoofdband", "Scheenbeschermers"], "d"),
  choice("kl-19", "kleedkamer", "Wie bepaalt normaal gesproken welke speler tijdens de wedstrijd wordt gewisseld?", ["De trainer", "De stadionspeaker", "De tegenstander", "De grensrechter"], "a"),

  open("jd-1", "deelderzaal", "In welke stad werd Jules Deelder geboren?", "Rotterdam"),
  choice("jd-2", "deelderzaal", "Waarom werd Jules Deelder de “nachtburgemeester” genoemd?", ["Hij werkte officieel voor de gemeente", "Hij was vooral actief in het nachtleven van Rotterdam", "Hij schreef alleen ’s nachts", "Hij was burgemeester van Rotterdam"], "b"),
  choice("jd-3", "deelderzaal", "Welke muziekstijl beïnvloedde zijn werk het meest?", ["Klassiek", "Rock", "Jazz", "Pop"], "c"),
  choice("jd-4", "deelderzaal", "Wat bedoelt Jules Deelder met deze uitspraak: “De omgeving van de mens is de medemens”?", ["Dat mensen het liefst alleen leven", "Dat technologie het belangrijkst is in de samenleving", "Dat mensen elkaar beïnvloeden en samen de samenleving vormen", "Dat steden belangrijker zijn dan mensen"], "c"),
  creative("jd-5", "deelderzaal", "Schrijf een kort gedicht van 4–6 regels in de stijl van Jules Deelder. Focus op ritme (kort en staccato), stedelijke beelden en een gevoel van beweging of tijd.", 4, 0, "Jullie gedicht is bewaard."),
  choice("jd-6", "deelderzaal", "Welke clubonderscheiding kreeg Jules Deelder op zijn 75e verjaardag van Sparta?", ["Erelid van de KNVB", "Lid van Verdienste van Sparta Rotterdam", "Trainer van het Jaar", "Voorzitter van de supportersvereniging"], "b"),
  choice("jd-7", "deelderzaal", "Welk bekend citaat van Jules Deelder gebruikt Rotterdam om gemeenschapszin te verwoorden?", ["Geen woorden maar daden", "De omgeving van de mens is de medemens", "Rotterdam durft", "Sterker door strijd"], "b"),
  choice("jd-8", "deelderzaal", "Welke bijzondere rol had Jules Deelder in 1985 voor Sparta?", ["Hij scoorde de openingstreffer in een jubileumwedstrijd", "Hij speelde de hoofdrol in een tv-spot voor een UEFA-Cupwedstrijd", "Hij ontwierp het clublogo voor een Europees seizoen", "Hij werd tijdelijk stadionomroeper"], "b"),
  choice("jd-9", "deelderzaal", "Welke Rotterdamse eretitel hoorde het meest bij Jules Deelder?", ["Stadsdichter", "Nachtburgemeester", "Havenmeester", "Wijkwethouder"], "b"),
  open("jd-10", "deelderzaal", "In welk jaar werd Jules Deelder geboren?", "1944"),
  open("jd-11", "deelderzaal", "In welk jaar overleed Jules Deelder?", "2019"),
  open("jd-12", "deelderzaal", "Hoe heette het gedicht waarmee Deelder in 1962 in het Algemeen Handelsblad debuteerde?", "Straat"),
  open("jd-13", "deelderzaal", "In welk jaar verscheen Deelders debuutbundel Gloria Satoria?", "1969"),
  open("jd-14", "deelderzaal", "Maak af: “Het gedicht is een ____.”", "bericht"),
  open("jd-15", "deelderzaal", "Maak af: “Hoe langer je leeft / hoe ____ het duurt.”", "korter"),
  open("jd-16", "deelderzaal", "Welk woord stond op het visitekaartje dat hij al op zijn veertiende liet zetten: “Jules Deelder. ____”?", "dichter"),
  open("jd-17", "deelderzaal", "In welk jaar was Deelder voor acht uur dagburgemeester van Rotterdam?", "2014"),
  open("jd-18", "deelderzaal", "Onder welk pseudoniem publiceerde hij in 1968: “Julian the ____”?", "Joint", ["joint"]),
  open("jd-19", "deelderzaal", "Volgens Esquire was Jules Deelder in 2010 Best ____ man van Nederland.", "Geklede", ["geklede"]),
  open("jd-20", "deelderzaal", "In welk jaar schreef Deelder het Poëziegeschenk?", "2017"),
  open("jd-21", "deelderzaal", "Hoe noemde Deelder volgens eigen zeggen de staat van zijn aangeleverde werk?", "foutloos"),
  choice("jd-22", "deelderzaal", "Wat was kenmerkend voor de kledingstijl van Jules Deelder?", ["Kleurrijke trainingspakken", "Zwarte pakken en een donkere zonnebril", "Een leren motorjack en pet", "Rood-witte voetbalshirts"], "b"),
  choice("jd-23", "deelderzaal", "Welke bijnaam kreeg Deelder vanwege zijn opvallende uiterlijk?", ["De Zwarte Tulp", "De Zwarte Prins", "De Rotterdamse Raaf", "De Nachtdichter"], "b"),
  choice("jd-24", "deelderzaal", "Welk instrument speelde Jules Deelder zelf?", ["Drums", "Saxofoon", "Trompet", "Piano"], "a"),
  choice("jd-25", "deelderzaal", "Welke titel hoort bij een dichtbundel van Jules Deelder?", ["Rotterdam Centraal", "Dag en nacht geopend", "De Haven", "Zwart Rotterdam"], "b"),
  choice("jd-26", "deelderzaal", "Met welke kunstvorm trad Deelder naast poëzie regelmatig op?", ["Klassiek ballet", "Schilderkunst", "Jazzmuziek", "Opera"], "c"),
  choice("jd-27", "deelderzaal", "Welke titel kreeg de verzamelbundel die in 2004 verscheen?", ["Deelder Compleet", "Nachtwerk", "Vrijwel alle gedichten", "Rotterdamse Gedichten"], "c"),
  choice("jd-28", "deelderzaal", "In welk Rotterdams theater vond in 1966 de beroemde manifestatie Poetry International/Poëzie in Carré-achtige poëzieavond plaats waar Deelder optrad?", ["Theater Zuidplein", "De Doelen", "Luxor Theater", "Rotterdamse Schouwburg"], "b"),
  choice("jd-29", "deelderzaal", "Welke omschrijving past het beste bij Deelders manier van voordragen?", ["Langzaam en plechtig", "Zacht en romantisch", "Ritmisch, direct en energiek", "Alleen voorgelezen zonder performance"], "c"),
  choice("jd-30", "deelderzaal", "Welke stad was het belangrijkste decor en inspiratiepunt in het werk en imago van Jules Deelder?", ["Rotterdam", "Den Haag", "Amsterdam", "Utrecht"], "a"),
  choice("jd-31", "deelderzaal", "Waar was Jules Deelder een groot liefhebber en verzamelaar van?", ["Oude voetbalshirts", "Jazzplaten", "Schilderijen", "Oude typemachines"], "b"),

  choice("vd-bogarde", "veld", "Winston Bogarde. Voor welke grote Europese club speelde Winston Bogarde?", ["Real Madrid", "FC Barcelona", "Liverpool", "Bayern München"], "b"),
  open("vd-bosselaar", "veld", "Tinus Bosselaar. In welk decennium speelde Tinus Bosselaar een belangrijke rol voor Sparta Rotterdam?", "Jaren 50", ["jaren 50", "de jaren 50"]),
  choice("vd-beveren", "veld", "Jan van Beveren stond bekend om zijn rol in het Nederlandse voetbal, maar ook om een groot conflict. Waar werd hij het meest mee geassocieerd?", ["Het winnen van het WK in 1974", "Een conflict met Johan Cruyff en het Nederlands elftal", "Bondscoach van Oranje", "Speler van Ajax"], "b"),
  choice("vd-dumfries", "veld", "Denzel Dumfries speelde voor Sparta tijdens een belangrijk moment in zijn carrière. Wat maakte zijn periode bij Sparta bijzonder?", ["Hij won de Champions League", "Hij ontwikkelde zich tot een aanvallende rechtsback en verdiende een transfer naar een topclub", "Hij speelde als spits", "Hij werd 10 jaar lang aanvoerder"], "b"),
  choice("vd-dewolf", "veld", "John de Wolf stond bekend als een unieke en herkenbare speler. Waar viel hij het meest door op tijdens zijn carrière?", ["Zijn technische dribbels", "Zijn lange haar en harde verdedigende speelstijl", "Zijn kwaliteiten als doelman", "Zijn rol als spits"], "b"),
  choice("vd-blind", "veld", "Danny Blind begon bij Sparta voordat hij een legende werd bij Ajax. Welke eigenschap typeerde zijn speelstijl het best, ook in zijn jonge jaren?", ["Snelle en aanvallende vleugelspeler", "Pure doelpuntenmaker", "Tactisch inzicht en leiderschap vanuit de verdediging", "Fysieke spits"], "c"),
  choice("vd-korver", "veld", "Bok de Korver is één van de grootste legendes van Sparta. Waarom was hij zo belangrijk voor de club in de beginjaren?", ["Hij leidde Sparta tijdens de eerste successen en hielp de identiteit van de club vormen", "Hij was de eerste keeper van Sparta", "Hij introduceerde betaald voetbal in Nederland", "Hij was de eerste trainer van Sparta"], "a"),
  open("vd-vangaal", "veld", "Louis van Gaal begon zijn spelerscarrière bij Sparta Rotterdam. Welke rol maakte hem later wereldberoemd in het voetbal?", "Trainer"),
  open("vd-strootman", "veld", "Kevin Strootman begon zijn profcarrière bij Sparta. Welke stap zette hij na zijn vertrek bij de club die hem naar de top van het voetbal bracht?", "Hij maakte de overstap naar FC Utrecht", ["FC Utrecht", "Utrecht", "de overstap naar FC Utrecht"]),
  choice("vd-holverda", "veld", "Wout Holverda wordt herinnerd als een echte Spartaan. Waar stond hij vooral om bekend tijdens zijn periode bij de club?", ["Zijn snelheid als vleugelspeler", "Zijn carrière als trainer", "Zijn loyaliteit en toewijding aan Sparta", "Zijn vele buitenlandse transfers"], "c"),
  choice("vd-lengkeek", "veld", "Ronald Lengkeek wordt herinnerd als een echte Sparta-speler. Waar stond hij vooral om bekend tijdens zijn tijd bij de club?", ["Zijn kwaliteiten als doelman", "Zijn harde werk en zijn rol als spits", "Zijn carrière als trainer", "Zijn technische dribbels op het middenveld"], "b"),
];

export const REVIEW_ITEMS: ReviewItem[] = [
  { location: "Bestuurskamer", text: "Picture Challenge: in welk decennium is deze Sparta-foto genomen? Bron noemt 60’s.", reason: "Alleen te beantwoorden door naar de foto te kijken. Niet omgezet naar een andere vraag." },
  { location: "Bestuurskamer", text: "Maak een foto van de klok.", reason: "Foto-opdracht verwijderd." },
  { location: "Perskamer", text: "Maak een foto van dit schilderij.", reason: "Foto-opdracht verwijderd." },
  { location: "Perskamer", text: "Maak een foto van de oude trainers van Sparta.", reason: "Foto-opdracht verwijderd." },
  { location: "Perskamer", text: "Foto-uitdaging: welke oud-speler staat op deze foto? Bron noemt Bok de Korver.", reason: "Alleen te beantwoorden door naar de foto te kijken." },
  { location: "Het Kasteel", text: "Picture Challenge: welke oude speler is dit? Bron noemt Tinus Bosselaar.", reason: "Alleen te beantwoorden door naar de foto te kijken." },
  { location: "Het Kasteel", text: "Picture Challenge: welke oude speler staat op deze foto? Bron noemt Denzel Dumfries.", reason: "Alleen te beantwoorden door naar de foto te kijken." },
  { location: "Kleedkamer", text: "Picture Challenge: van welk jaar is deze foto? Bron noemt 1911.", reason: "Alleen te beantwoorden door naar de foto te kijken." },
  { location: "Jules Deelder", text: "Waar stond Jules Deelder in 1966 als jonge deelnemer op het podium? Opties: De Doelen, Carré, Ahoy, Paradiso.", reason: "Geen juist antwoord aangegeven in de bron." },
  { location: "Jules Deelder", text: "Welke literaire prijs kreeg Jules Deelder in 1988?", reason: "Geen juist antwoord aangegeven in de bron." },
  { location: "Jules Deelder", text: "Wat gebeurde er ter ere van Deelders 70e verjaardag in Rotterdam?", reason: "Geen juist antwoord aangegeven in de bron." },
  { location: "Jules Deelder", text: "Welke combinatie past volgens officiële bronnen het best bij Jules Deelder naast dichter?", reason: "Geen juist antwoord aangegeven in de bron." },
  { location: "Jules Deelder", text: "Welke uitspraak gaf zijn naam aan het project met dichtregels op veeg- en vuilniswagens?", reason: "Geen juist antwoord aangegeven in de bron." },
  { location: "Jules Deelder", text: "Welke bundel verscheen als eerste? Opties: Ruisch, Transeuropa, Dag en nacht geopend, Gloria Satoria.", reason: "Geen juist antwoord aangegeven in de bron." },
  { location: "Kleedkamer", text: "Vraag over de opstelling op het bord.", reason: "Opgenomen met het aangegeven antwoord. De bron verwijst wel naar een fysiek bord in de ruimte." },
  { location: "Het Veld", text: "De opstelling noemt één keer “Bob de Korver”; de vraag zelf heet “Bok de Korver”.", reason: "De vraagtekst gebruikt Bok. De spelling Bob is niet overgenomen." },
  { location: "Het Veld", text: "Link naar beste-bookmakers.nl.", reason: "Geen vraag. Niet als opdracht opgenomen." },
];

export function questionsFor(locationId: string): QuizQuestion[] {
  return QUIZ_QUESTIONS.filter((question) => question.locationId === locationId);
}

export function getQuestion(id: string): QuizQuestion | undefined {
  return QUIZ_QUESTIONS.find((question) => question.id === id);
}

export function normAnswer(value: string): string {
  return answerTokens(value).join("");
}

const ANSWER_FILLER = new Set(["de", "het", "een", "en", "van", "der", "den", "te", "naar", "op", "in", "met", "voor"]);

export function answerTokens(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => word && !ANSWER_FILLER.has(word))
    .sort();
}

export function answersMatch(given: string, accepted: string): boolean {
  const left = answerTokens(given);
  const right = answerTokens(accepted);
  if (left.length === 0 || right.length === 0) return false;
  if (left.join(" ") === right.join(" ")) return true;
  const have = new Set(left);
  return right.every((word) => have.has(word));
}

export function gradeQuiz(question: QuizQuestion, response: string): { correct: boolean; feedback: string } {
  const text = response.trim();
  if (question.kind === "creative") {
    const lines = text.split(/\n/).map((line) => line.trim()).filter(Boolean);
    if (question.minLines > 0 && lines.length < question.minLines) {
      return { correct: false, feedback: `Schrijf minstens ${question.minLines} regels.` };
    }
    if (question.minLength > 0 && text.length < question.minLength) {
      return { correct: false, feedback: "Schrijf een iets langer antwoord." };
    }
    if (!text) return { correct: false, feedback: "Schrijf eerst een antwoord." };
    return { correct: true, feedback: question.correctFeedback };
  }
  if (question.kind === "choice") {
    const correct = text === question.answer;
    return { correct, feedback: correct ? question.correctFeedback : "Dat is niet het antwoord uit de bron." };
  }
  const correct = question.accept.some((item) => answersMatch(text, item));
  return { correct, feedback: correct ? question.correctFeedback : "Dat is niet het antwoord uit de bron." };
}

export function publicQuestion(question: QuizQuestion, solved: boolean, closed: boolean) {
  return {
    id: question.id,
    locationId: question.locationId,
    kind: question.kind,
    prompt: question.prompt,
    options: question.options,
    inputLabel: question.inputLabel,
    minLines: question.minLines,
    solved,
    closed,
  };
}

export function officialAnswer(question: QuizQuestion): string {
  if (question.kind === "choice") return question.options.find((option) => option.id === question.answer)?.label ?? "";
  if (question.kind === "open") return question.answer;
  return "";
}
