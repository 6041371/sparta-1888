import { describe, expect, it } from "vitest";
import {
  EVIDENCE_ITEMS,
  collectRoomEvidence,
  distributeEvidence,
  evidenceProgress,
  finaleByEvidence,
} from "@/lib/content/evidence";

function rooms(ids: string[]) {
  return ids;
}

function sequence(assignments: Record<string, string[]>, ids: string[]) {
  const order = ["bestuurskamer", "perskamer", "tribune", "museum", "kasteel", "kleedkamer", "deelderzaal"];
  return [...ids].sort((a, b) => order.indexOf(a) - order.indexOf(b) || a.localeCompare(b)).flatMap((id) => assignments[id]);
}

describe("bewijsverdeling", () => {
  const ids = ["bestuurskamer", "perskamer", "tribune", "museum", "kasteel", "kleedkamer", "deelderzaal"];

  it("geeft bij zeven kamers één bewijsstuk per kamer, op volgorde", () => {
    const assigned = distributeEvidence(EVIDENCE_ITEMS, rooms(ids));
    expect(sequence(assigned, ids)).toEqual(EVIDENCE_ITEMS.map((item) => item.id));
  });

  it("verdeelt zes, vier, drie en één kamer gelijkmatig en in volgorde", () => {
    const six = distributeEvidence(EVIDENCE_ITEMS, ids.slice(0, 6));
    expect(ids.slice(0, 6).map((id) => six[id].length).sort((a, b) => b - a)).toEqual([2, 1, 1, 1, 1, 1]);
    expect(sequence(six, ids.slice(0, 6)).slice(0, 2)).toEqual(["polaroid_1", "security_camera"]);
    expect(sequence(six, ids.slice(0, 6)).at(-1)).toBe("sale_ad");

    const four = distributeEvidence(EVIDENCE_ITEMS, ids.slice(0, 4));
    expect(ids.slice(0, 4).map((id) => four[id].length)).toEqual([2, 2, 2, 1]);
    expect(four.museum).toEqual(["sale_ad"]);
    expect(four.tribune).toEqual(["polaroid_2", "transport_document"]);

    const three = distributeEvidence(EVIDENCE_ITEMS, ids.slice(0, 3));
    expect(ids.slice(0, 3).map((id) => three[id].length)).toEqual([3, 2, 2]);
    expect(three.tribune).toEqual(["transport_document", "sale_ad"]);

    expect(distributeEvidence(EVIDENCE_ITEMS, ["museum"]).museum).toEqual(EVIDENCE_ITEMS.map((item) => item.id));
  });

  it("laat bij nul kamers een lege toewijzing achter", () => {
    expect(distributeEvidence(EVIDENCE_ITEMS, [])).toEqual({});
  });

  it("gebruikt elk bewijsstuk precies één keer", () => {
    const assigned = distributeEvidence(EVIDENCE_ITEMS, ids.slice(0, 4));
    const flat = Object.values(assigned).flat();
    expect(flat.sort()).toEqual(EVIDENCE_ITEMS.map((item) => item.id).sort());
    expect(new Set(flat).size).toBe(7);
  });

  it("geeft een kamer geen tweede keer hetzelfde bewijs", () => {
    const assigned = distributeEvidence(EVIDENCE_ITEMS, ["a", "b"]);
    const first = collectRoomEvidence("a", assigned, []);
    const second = collectRoomEvidence("a", assigned, first.collectedEvidenceIds);
    expect(second.newlyCollectedEvidenceIds).toEqual([]);
    expect(new Set(second.collectedEvidenceIds).size).toBe(first.collectedEvidenceIds.length);
  });

  it("opent de finale pas bij zeven geldige bewijsstukken", () => {
    const six = EVIDENCE_ITEMS.slice(0, 6).map((item) => item.id);
    expect(finaleByEvidence(six)).toBe(false);
    expect(evidenceProgress(six).collected).toBe(6);
    expect(finaleByEvidence([...six, "onzin"])).toBe(false);
    expect(finaleByEvidence(EVIDENCE_ITEMS.map((item) => item.id))).toBe(true);
    expect(evidenceProgress(["polaroid_1", "polaroid_1", "sale_ad"]).collected).toBe(2);
  });

  it("houdt de verdeling stabiel en bewaart al gevonden bewijs", () => {
    const rooms = ["museum", "kasteel", "tribune"];
    const first = distributeEvidence(EVIDENCE_ITEMS, rooms);
    const again = distributeEvidence(EVIDENCE_ITEMS, [...rooms].reverse());
    expect(again).toEqual(first);
    const collected = collectRoomEvidence("kasteel", first, []).collectedEvidenceIds;
    const moved = distributeEvidence(EVIDENCE_ITEMS, ["museum"]);
    const kept = collectRoomEvidence("museum", moved, collected);
    expect(collected.every((id) => kept.collectedEvidenceIds.includes(id))).toBe(true);
    expect(new Set([...kept.collectedEvidenceIds, ...Object.values(moved).flat()]).size).toBe(7);
  });
});
