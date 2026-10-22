import { describe, expect, it } from "vitest";
import { EVIDENCE_ITEMS, distributeEvidence } from "@/lib/content/evidence";
import {
  DOSSIER_CODE,
  dossierUnlocked,
  requiredEvidenceIds,
  scorePenalty,
  scoreSpot,
  scoreVar,
  VAR_ROUNDS,
} from "@/lib/content/minigames";

const rooms = ["bestuurskamer", "perskamer", "tribune", "museum", "kasteel", "kleedkamer", "deelderzaal"];

describe("minigames", () => {
  it("houdt crack the code op vier haalbare hints en één code", () => {
    const assigned = distributeEvidence(EVIDENCE_ITEMS, rooms);
    const required = requiredEvidenceIds(assigned, "kasteel");
    expect(required).toEqual(["polaroid_1", "security_camera", "bank_transaction", "transport_document"]);
    expect(dossierUnlocked(required, required.slice(0, 3))).toBe(false);
    expect(dossierUnlocked(required, required)).toBe(true);
    expect(DOSSIER_CODE).toBe("7088");
    expect(new Set(DOSSIER_CODE).size).toBe(3);
  });

  it("maakt de code nog oplosbaar als het transportdocument aan de codekamer zelf hangt", () => {
    const assigned = distributeEvidence(EVIDENCE_ITEMS, ["kasteel", "perskamer"]);
    const required = requiredEvidenceIds(assigned, "kasteel");
    expect(required.length).toBeGreaterThan(0);
    expect(required.length).toBeLessThanOrEqual(4);
    expect(required).toContain("security_camera");
    expect(required).toContain("bank_transaction");
    expect(required).not.toContain("transport_document");
  });

  it("telt exact vijf penalty's", () => {
    const scored = scorePenalty(
      ["links", "midden", "rechts", "links", "midden"],
      ["rechts", "midden", "links", "links", "rechts"],
      100,
    );
    expect(scored.goals).toBe(3);
    expect(scored.saves).toBe(2);
    expect(scored.points).toBe(60);
    expect(() => scorePenalty(["links"], ["rechts"], 100)).toThrow(/vijf/i);
  });

  it("beoordeelt de VAR op de beelden en spot op de verdachte, ongeacht de kaartvolgorde", () => {
    const answers = VAR_ROUNDS.map((round) => round.answer);
    expect(scoreVar(answers, 90).correct).toBe(3);
    expect(scoreVar(["geen", "b", "correct"], 90).correct).toBe(2);
    expect(scoreSpot("cam-5", 100).correct).toBe(true);
    expect(scoreSpot("cam-1", 100).correct).toBe(false);
    expect(scoreSpot("cam-5", 100).points).toBeGreaterThan(scoreSpot("cam-1", 100).points);
  });
});
