export interface FieldPlayer {
  questionId: string;
  name: string;
  top: string;
  left: string;
  keeper: boolean;
}

export const FIELD_PLAYERS: FieldPlayer[] = [
  { questionId: "vd-lengkeek", name: "Robert Lengkeek", top: "15%", left: "50%", keeper: false },
  { questionId: "vd-bosselaar", name: "Tinus Bosselaar", top: "26%", left: "20%", keeper: false },
  { questionId: "vd-holverda", name: "Wout Holverda", top: "26%", left: "80%", keeper: false },
  { questionId: "vd-bogarde", name: "Winston Bogarde", top: "44%", left: "20%", keeper: false },
  { questionId: "vd-vangaal", name: "Louis van Gaal", top: "48%", left: "50%", keeper: false },
  { questionId: "vd-strootman", name: "Kevin Strootman", top: "44%", left: "80%", keeper: false },
  { questionId: "vd-korver", name: "Bob de Korver", top: "64%", left: "10%", keeper: false },
  { questionId: "vd-dumfries", name: "Denzel Dumfries", top: "64%", left: "90%", keeper: false },
  { questionId: "vd-blind", name: "Danny Blind", top: "70%", left: "36%", keeper: false },
  { questionId: "vd-dewolf", name: "John de Wolf", top: "70%", left: "64%", keeper: false },
  { questionId: "vd-beveren", name: "Jan van Beveren", top: "84%", left: "50%", keeper: true },
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
