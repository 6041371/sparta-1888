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

function counts(assignments: Record<string, string[]>, ids: string[]) {
  return [...ids].sort((a, b) => a.localeCompare(b)).map((id) => assignments[id].length);
}

describe("bewijsverdeling", () => {
  const ids = ["bestuurskamer", "perskamer", "tribune", "museum", "kasteel", "kleedkamer", "deelderzaal"];

  it("geeft bij zeven kamers één bewijsstuk per kamer", () => {
    const assigned = distributeEvidence(EVIDENCE_ITEMS, rooms(ids));
    expect(counts(assigned, ids)).toEqual([1, 1, 1, 1, 1, 1, 1]);
  });

  it("verdeelt zes, vier, drie en één kamer gelijkmatig", () => {
    expect(counts(distributeEvidence(EVIDENCE_ITEMS, ids.slice(0, 6)), ids.slice(0, 6))).toEqual([2, 1, 1, 1, 1, 1]);
    expect(counts(distributeEvidence(EVIDENCE_ITEMS, ids.slice(0, 4)), ids.slice(0, 4))).toEqual([2, 2, 2, 1]);
    expect(counts(distributeEvidence(EVIDENCE_ITEMS, ids.slice(0, 3)), ids.slice(0, 3))).toEqual([3, 2, 2]);
    expect(counts(distributeEvidence(EVIDENCE_ITEMS, ["museum"]), ["museum"])).toEqual([7]);
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
