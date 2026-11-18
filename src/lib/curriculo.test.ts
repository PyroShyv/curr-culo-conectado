import { describe, expect, it } from "vitest";
import { podeEditarCurriculo } from "./curriculo";

describe("edição do currículo", () => {
  it("permite editar somente o currículo do usuário logado", () => {
    expect(podeEditarCurriculo("dono-1", { user_id: "dono-1" })).toBe(true);
    expect(podeEditarCurriculo("dono-1", { user_id: "outra-pessoa-2" })).toBe(false);
    expect(podeEditarCurriculo(null, { user_id: "dono-1" })).toBe(false);
  });
});
