import { describe, expect, it, vi } from "vitest";
import { Autosalvador } from "./autosalvar";

describe("salvamento automático", () => {
  it("salva o último texto sem precisar avançar a etapa", async () => {
    vi.useFakeTimers();
    const gravar = vi.fn(async (_: string) => {});
    const salvar = new Autosalvador(gravar, vi.fn());
    salvar.agendar("Primeiro texto");
    salvar.agendar("Texto atualizado");
    await vi.advanceTimersByTimeAsync(600);
    expect(gravar).toHaveBeenCalledExactlyOnceWith("Texto atualizado");
    vi.useRealTimers();
  });
  it("serializa pedidos para não sobrescrever dados recentes", async () => {
    let terminar: (() => void) | undefined;
    const gravar = vi.fn((value: string) => value === "antigo" ? new Promise<void>((resolve) => { terminar = resolve; }) : Promise.resolve());
    const salvar = new Autosalvador(gravar, vi.fn());
    const primeiro = salvar.agendar("antigo", true);
    await Promise.resolve();
    const segundo = salvar.agendar("novo", true);
    expect(gravar).toHaveBeenCalledTimes(1);
    terminar?.();
    await primeiro;
    await segundo;
    expect(gravar.mock.calls.map(([v]) => v)).toEqual(["antigo", "novo"]);
  });
  it("mantém alterações pendentes e tenta novamente quando a conexão volta", async () => {
    const gravar = vi.fn<(value: string) => Promise<void>>().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce();
    const status = vi.fn();
    const salvar = new Autosalvador(gravar, status);
    expect(await salvar.agendar("rascunho", true)).toBe(false);
    expect(status).toHaveBeenLastCalledWith("erro");
    expect(await salvar.flush()).toBe(true);
    expect(gravar).toHaveBeenNthCalledWith(2, "rascunho");
    expect(status).toHaveBeenLastCalledWith("salvo");
  });
});