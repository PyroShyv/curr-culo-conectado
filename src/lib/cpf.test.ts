import { describe, expect, it } from "vitest";
import { cpfParaLogin, cpfValido, formatarCpf } from "./cpf";

describe("login por CPF", () => {
  it("aceita CPF válido com ou sem pontuação", () => {
    expect(cpfValido("529.982.247-25")).toBe(true);
    expect(cpfValido("52998224725")).toBe(true);
  });
  it("recusa CPF com dígito errado, curto ou repetido", () => {
    expect(cpfValido("529.982.247-24")).toBe(false);
    expect(cpfValido("1234567890")).toBe(false);
    expect(cpfValido("111.111.111-11")).toBe(false);
  });
  it("o mesmo CPF sempre entra na mesma conta", () => {
    expect(cpfParaLogin("529.982.247-25")).toBe(cpfParaLogin("52998224725"));
  });
  it("formata enquanto digita", () => {
    expect(formatarCpf("52998224725")).toBe("529.982.247-25");
  });
});
