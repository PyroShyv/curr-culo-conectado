import { describe, expect, it } from "vitest";
import { emailValido, formatarFone } from "./cpf";

describe("dados de acesso e contato", () => {
  it("aceita um e-mail válido para o acesso", () => {
    expect(emailValido("cuidador@email.com")).toBe(true);
    expect(emailValido("  cuidador@email.com  ")).toBe(true);
  });

  it("recusa e-mail incompleto ou sem domínio", () => {
    expect(emailValido("cuidador@")).toBe(false);
    expect(emailValido("cuidador.email.com")).toBe(false);
  });

  it("formata o telefone com DDD enquanto a pessoa digita", () => {
    expect(formatarFone("63912345678")).toBe("(63) 91234-5678");
  });
});
