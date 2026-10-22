export interface ClubPortrait {
  id: string;
  name: string;
  image: string;
}

export const CLUB_PORTRAITS: ClubPortrait[] = [
  { id: "aad", name: "Aad Andriessen", image: "/portretten/aad-andriessen.png" },
  { id: "abdou", name: "Abdou Harroui", image: "/portretten/abdou-harroui.png" },
  { id: "bok", name: "Bok de Korver", image: "/portretten/bok-de-korver.png" },
  { id: "achraf", name: "Achraf Madi", image: "/portretten/achraf-madi.png" },
  { id: "tinus", name: "Tinus Bosselaar", image: "/portretten/tinus-bosselaar.png" },
  { id: "jan", name: "Jan van Beveren", image: "/portretten/jan-van-beveren.png" },
];

export const BOK_PORTRAIT_ID = "bok";
