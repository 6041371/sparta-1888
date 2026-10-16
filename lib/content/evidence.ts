export interface EvidenceItem {
  id: string;
  order: number;
  title: string;
  text: string;
  image: string;
}

export const EVIDENCE_ITEMS: EvidenceItem[] = [
  {
    id: "polaroid_1",
    order: 1,
    title: "Polaroidfoto",
    text: "Een polaroidfoto toont een persoon met een donkere jas en een grote sporttas. Het tijdstip op de foto is 21:47. Op de achtergrond is gedeeltelijk een donker voertuig zichtbaar.",
    image: "/bewijs/polaroid-1.jpg",
  },
  {
    id: "security_camera",
    order: 2,
    title: "Bewakingscamera",
    text: "Een wazig beeld van een beveiligingscamera toont een donkere bestelbus. De laatste twee tekens van het kenteken lijken B7, maar de foto is niet scherp genoeg om het hele kenteken vast te stellen.",
    image: "/bewijs/camera.jpg",
  },
  {
    id: "bank_transaction",
    order: 3,
    title: "Verdachte banktransactie",
    text: "Een transactie van €450 heeft als omschrijving “Historisch Sparta-object – reservering”. Bij de transactie staan de initialen R.B.",
    image: "/bewijs/bank.png",
  },
  {
    id: "secret_chat",
    order: 4,
    title: "Geheim chatgesprek",
    text: "“Het object is geregeld. Ik heb alleen nog een veilige plek nodig tot de overdracht.” “Zorg dat niemand weet waar het vandaan komt. De koper betaalt alleen als alles klopt.”",
    image: "/bewijs/chat.jpg",
  },
  {
    id: "polaroid_2",
    order: 5,
    title: "Tweede polaroidfoto",
    text: "Een tweede polaroid toont dezelfde donkere bestelbus bij een opslaglocatie. Gedeeltelijk is het logo “Historische Sportcollecties” zichtbaar.",
    image: "/bewijs/polaroid-2.jpg",
  },
  {
    id: "transport_document",
    order: 6,
    title: "Transportdocument",
    text: "Gewicht: 18 kg. Omschrijving: “Bronzen sportobject”. De achternaam eindigt op “…sman”.",
    image: "/bewijs/transport.jpg",
  },
  {
    id: "sale_ad",
    order: 7,
    title: "Online verkoopadvertentie",
    text: "Een advertentie toont een bronzen voetbalbeeldje, geplaatst onder de naam “RB Collectibles”, en verwijst naar dezelfde opslaglocatie.",
    image: "/bewijs/advertentie.jpg",
  },
];

const EVIDENCE_IDS = new Set(EVIDENCE_ITEMS.map((item) => item.id));

export function distributeEvidence(evidenceItems: EvidenceItem[], roomIds: string[]): Record<string, string[]> {
  const rooms = [...roomIds].sort((a, b) => a.localeCompare(b));
  const evidence = [...evidenceItems].sort((a, b) => a.order - b.order);
  if (rooms.length === 0) return {};
  const assignments = Object.fromEntries(rooms.map((id) => [id, [] as string[]]));
  evidence.forEach((item, index) => {
    assignments[rooms[index % rooms.length]].push(item.id);
  });
  return assignments;
}

export function collectRoomEvidence(roomId: string, assignments: Record<string, string[]>, collectedEvidenceIds: string[]) {
  const collected = new Set(collectedEvidenceIds.filter((id) => EVIDENCE_IDS.has(id)));
  const newlyCollected: string[] = [];
  for (const evidenceId of assignments[roomId] ?? []) {
    if (!EVIDENCE_IDS.has(evidenceId) || collected.has(evidenceId)) continue;
    collected.add(evidenceId);
    newlyCollected.push(evidenceId);
  }
  return { collectedEvidenceIds: [...collected], newlyCollectedEvidenceIds: newlyCollected };
}

export function evidenceProgress(collectedEvidenceIds: string[]) {
  const collected = new Set(collectedEvidenceIds.filter((id) => EVIDENCE_IDS.has(id)));
  return {
    collected: collected.size,
    total: EVIDENCE_ITEMS.length,
    complete: EVIDENCE_ITEMS.every((item) => collected.has(item.id)),
  };
}

export function finaleByEvidence(collectedEvidenceIds: string[]): boolean {
  const collected = new Set(collectedEvidenceIds);
  return collected.size >= EVIDENCE_ITEMS.length && EVIDENCE_ITEMS.every((item) => collected.has(item.id));
}

export const FINALE_WINDOW_MS = 20 * 60 * 1000;

export function finaleUnlocked(collectedEvidenceIds: string[], remainingMs: number, status: string): boolean {
  if (status !== "active" && status !== "paused") return false;
  if (finaleByEvidence(collectedEvidenceIds)) return true;
  return status === "active" && remainingMs <= FINALE_WINDOW_MS && remainingMs >= 0;
}
