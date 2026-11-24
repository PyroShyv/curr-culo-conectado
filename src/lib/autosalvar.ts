export type EstadoSalvamento = "salvo" | "pendente" | "salvando" | "erro";

// Serialize writes so an older request cannot overwrite a newer draft.
export class Autosalvador<T> {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private proximo: { valor: T; versao: number } | undefined;
  private versao = 0;
  private fila: Promise<boolean> = Promise.resolve(true);
  constructor(
    private gravar: (valor: T) => Promise<void>,
    private status: (estado: EstadoSalvamento) => void,
    private atraso = 600,
  ) {}
  agendar(valor: T, imediato = false) {
    clearTimeout(this.timer);
    this.proximo = { valor, versao: ++this.versao };
    this.status("pendente");
    if (imediato) return this.flush();
    this.timer = setTimeout(() => { void this.flush(); }, this.atraso);
    return undefined;
  }
  flush(): Promise<boolean> {
    clearTimeout(this.timer);
    const item = this.proximo;
    if (!item) return this.fila;
    this.proximo = undefined;
    this.fila = this.fila.then(async () => {
      this.status("salvando");
      try {
        await this.gravar(item.valor);
        if (item.versao === this.versao) this.status("salvo");
        return true;
      } catch {
        if (item.versao === this.versao) {
          this.proximo = item;
          this.status("erro");
        }
        return false;
      }
    });
    return this.fila;
  }
}