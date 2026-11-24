import { describe, expect, it } from "vitest";
import { linkCurriculo, linkWhatsapp, podeEditarCurriculo } from "./curriculo";

describe("edição do currículo", () => {
  it("permite editar somente o currículo do usuário logado", () => {
    expect(podeEditarCurriculo("dono-1", { user_id: "dono-1" })).toBe(true);
    expect(podeEditarCurriculo("dono-1", { user_id: "outra-pessoa-2" })).toBe(false);
    expect(podeEditarCurriculo(null, { user_id: "dono-1" })).toBe(false);
  });
});

describe("contato por WhatsApp", () => {
  it("leva à conversa pelo número com DDD e não duplica o código do Brasil", () => {
    expect(linkWhatsapp("(63) 91234-5678")).toBe("https://wa.me/5563912345678");
    expect(linkWhatsapp("+55 (63) 91234-5678")).toBe("https://wa.me/5563912345678");
    expect(linkWhatsapp("91234")).toBeNull();
  });
});

describe("link individual do currículo", () => {
  it("aponta para o identificador do currículo, sem levar à busca geral", () => {
    expect(linkCurriculo("https://cuidadores.app/#buscar", "abc-123")).toBe(
      "https://cuidadores.app/#curriculo=abc-123",
    );
  });
});
