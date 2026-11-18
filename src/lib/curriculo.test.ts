import { describe, expect, it } from "vitest";
import { linkCurriculo, podeEditarCurriculo } from "./curriculo";

describe("edição do currículo", () => {
  it("permite editar somente o currículo do usuário logado", () => {
    expect(podeEditarCurriculo("dono-1", { user_id: "dono-1" })).toBe(true);
    expect(podeEditarCurriculo("dono-1", { user_id: "outra-pessoa-2" })).toBe(false);
    expect(podeEditarCurriculo(null, { user_id: "dono-1" })).toBe(false);
  });
});

describe("link individual do currículo", () => {
  it("aponta para o identificador do currículo, sem levar à busca geral", () => {
    expect(linkCurriculo("https://cuidadores.app/#buscar", "abc-123")).toBe(
      "https://cuidadores.app/#curriculo=abc-123",
    );
  });
});
