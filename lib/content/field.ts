export interface FieldPlayer {
  questionId: string;
  name: string;
  image: string;
  top: string;
  left: string;
  keeper: boolean;
}

export const FIELD_PLAYERS: FieldPlayer[] = [
  { questionId: "vd-lengkeek", name: "Robert Lengkeek", image: "/spelers/lengkeek.png", top: "15%", left: "50%", keeper: false },
  { questionId: "vd-bosselaar", name: "Tinus Bosselaar", image: "/spelers/bosselaar.png", top: "26%", left: "20%", keeper: false },
  { questionId: "vd-holverda", name: "Wout Holverda", image: "/spelers/holverda.png", top: "26%", left: "80%", keeper: false },
  { questionId: "vd-bogarde", name: "Winston Bogarde", image: "/spelers/bogarde.png", top: "44%", left: "20%", keeper: false },
  { questionId: "vd-vangaal", name: "Louis van Gaal", image: "/spelers/vangaal.png", top: "48%", left: "50%", keeper: false },
  { questionId: "vd-strootman", name: "Kevin Strootman", image: "/spelers/strootman.png", top: "44%", left: "80%", keeper: false },
  { questionId: "vd-korver", name: "Bob de Korver", image: "/spelers/korver.png", top: "64%", left: "10%", keeper: false },
  { questionId: "vd-dumfries", name: "Denzel Dumfries", image: "/spelers/dumfries.png", top: "64%", left: "90%", keeper: false },
  { questionId: "vd-blind", name: "Danny Blind", image: "/spelers/blind.png", top: "70%", left: "36%", keeper: false },
  { questionId: "vd-dewolf", name: "John de Wolf", image: "/spelers/dewolf.png", top: "70%", left: "64%", keeper: false },
  { questionId: "vd-beveren", name: "Jan van Beveren", image: "/spelers/beveren.png", top: "84%", left: "50%", keeper: true },
];

export function assignPlayers(roomIds: string[]): Record<string, string[]> {
  const rooms = [...roomIds].sort((a, b) => a.localeCompare(b));
  if (rooms.length === 0) return {};
  const assignments = Object.fromEntries(rooms.map((id) => [id, [] as string[]]));
  FIELD_PLAYERS.forEach((player, index) => {
    assignments[rooms[index % rooms.length]].push(player.questionId);
  });
  return assignments;
}
