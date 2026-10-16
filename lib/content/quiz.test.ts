import { describe, expect, it } from "vitest";
import { QUIZ_LOCATIONS, QUIZ_QUESTIONS, REVIEW_ITEMS, gradeQuiz, questionsFor } from "@/lib/content/quiz";

const ROOMS = ["bestuurskamer", "perskamer", "tribune", "museum", "kasteel", "kleedkamer", "deelderzaal"];

describe("vragen uit de bron", () => {
  it("heeft zeven ruimtes en het veld apart", () => {
    expect(QUIZ_LOCATIONS.map((location) => location.id)).toEqual([...ROOMS, "veld"]);
    for (const room of ROOMS) expect(questionsFor(room).length).toBeGreaterThan(0);
    expect(questionsFor("veld").map((question) => question.id)).toHaveLength(11);
  });

  it("gebruikt unieke vragen en bestaande antwoordopties", () => {
    const ids = QUIZ_QUESTIONS.map((question) => question.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const question of QUIZ_QUESTIONS) {
      expect(question.prompt).not.toMatch(/maak een foto|picture challenge|foto-uitdaging/i);
      if (question.kind === "choice") {
        expect(question.options.some((option) => option.id === question.answer)).toBe(true);
      }
    }
  });

  it("keurt het bronantwoord goed en een ander antwoord af", () => {
    const bok = QUIZ_QUESTIONS.find((question) => question.id === "bk-1");
    const cricket = QUIZ_QUESTIONS.find((question) => question.id === "mu-3");
    const poem = QUIZ_QUESTIONS.find((question) => question.id === "jd-5");
    expect(bok && gradeQuiz(bok, "c").correct).toBe(true);
    expect(bok && gradeQuiz(bok, "a").correct).toBe(false);
    expect(cricket && gradeQuiz(cricket, "cricket").correct).toBe(true);
    expect(cricket && gradeQuiz(cricket, "voetbal").correct).toBe(false);
    expect(poem && gradeQuiz(poem, "een\ntwee\ndrie").correct).toBe(false);
    expect(poem && gradeQuiz(poem, "Nacht.\nRotterdam.\nNeon.\nDoor.").correct).toBe(true);
  });

  it("zet fotovragen en vragen zonder aangegeven antwoord apart", () => {
    expect(REVIEW_ITEMS.some((item) => /klok/i.test(item.text))).toBe(true);
    expect(REVIEW_ITEMS.some((item) => /1988/i.test(item.text))).toBe(true);
    expect(QUIZ_QUESTIONS.some((question) => question.prompt.includes("1988"))).toBe(false);
  });
});
