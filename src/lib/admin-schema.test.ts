import { describe, expect, it } from "vitest";
import { criarContaSchema, exigirAdministrador, papelSchema } from "./admin-schema";

describe("permissões administrativas", () => {
  it("exige acesso de administrador para gerenciar contas e currículos", () => {
    expect(() => exigirAdministrador(false)).toThrow();
    expect(() => exigirAdministrador(true)).not.toThrow();
  });
  it("valida e-mail individual, senha e tipo de acesso no cadastro manual", () => {
    expect(criarContaSchema.safeParse({ nome: "Aluno", email: "não é email", senha: "abcdef123", administrador: false, ativar: false }).success).toBe(false);
    expect(criarContaSchema.safeParse({ nome: "Aluno", email: "aluno@teste.com", senha: "abcdef123", administrador: true, ativar: true }).success).toBe(true);
    expect(papelSchema.safeParse({ id: "não-uuid", habilitar: true }).success).toBe(false);
  });
});