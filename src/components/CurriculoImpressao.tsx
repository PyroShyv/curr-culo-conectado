import type { Database } from "@/integrations/supabase/types";

type Rec = Database["public"]["Tables"]["curriculos"]["Row"];
export type Modelo = "classico" | "minimalista";

const t = (s?: string | null) => (s || "").trim();
const iniciais = (n: string) => (n || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

function Classico({ r }: { r: Rec }) {
  const local = [r.cidade, r.bairro].filter(Boolean).join(" · ");
  const sec = (titulo: string, texto: string) => texto ? <section className="cvc-sec"><h2>{titulo}</h2><p>{texto}</p></section> : null;
  const form = [r.formacao_opc?.join(", "), t(r.cursos) && `Cursos: ${t(r.cursos)}`, t(r.certs) && `Certificados: ${t(r.certs)}`, t(r.form_extra)].filter(Boolean).join("\n");
  return (
    <div className="cvc">
      <header className="cvc-topo">
        {r.foto ? <img src={r.foto} alt="" className="cvc-foto" /> : <div className="cvc-foto">{iniciais(r.nome)}</div>}
        <div>
          <h1>{r.nome}</h1>
          <p className="cvc-papel">Cuidador(a) de idosos{r.idade ? ` · ${r.idade} anos` : ""}</p>
          {local && <p>{local}</p>}
          {(r.disp_opc || []).length > 0 && <div className="cvc-chips">{r.disp_opc.map((d) => <span key={d}>{d}</span>)}</div>}
        </div>
      </header>
      <section className="cvc-contato"><p><b>Telefone:</b> {r.telefone}</p><p><b>E-mail:</b> {r.email}</p></section>
      {sec("Sobre mim", t(r.sobre))}
      {sec("Experiência profissional", [t(r.tempo) && `Tempo de experiência: ${r.tempo}`, t(r.exp)].filter(Boolean).join("\n"))}
      {sec("Formação e cursos", form)}
      {sec("Habilidades", t(r.habil))}
      {sec("Disponibilidade", [(r.disp_opc || []).join(", "), t(r.disp)].filter(Boolean).join("\n"))}
    </div>
  );
}

function Minimalista({ r }: { r: Rec }) {
  const contato = [r.telefone, r.email, [r.bairro, r.cidade].filter(Boolean).join(", ")].filter((x) => t(x));
  const resumo = [t(r.tempo) && r.tempo !== "Sem experiência profissional" ? `${r.tempo} de experiência no cuidado de idosos.` : "", t(r.sobre)].filter(Boolean).join(" ");
  const comps = t(r.habil).split(/[,;\n]+/).map((s) => s.trim().replace(/\.$/, "")).filter(Boolean);
  const adicionais = [t(r.certs) && ["Certificações", t(r.certs)], t(r.form_extra) && ["Outras informações", t(r.form_extra)], ((r.disp_opc || []).length || t(r.disp)) && ["Disponibilidade", [(r.disp_opc || []).join(", "), t(r.disp)].filter(Boolean).join(". ")]].filter(Boolean) as [string, string][];
  return (
    <div className="cvm">
      <header className="cvm-topo">
        <div>
          <h1>{r.nome}</h1>
          <p className="cvm-cargo">Cuidador(a) de idosos</p>
          <p className="cvm-contato">{contato.join("  ·  ")}</p>
        </div>
        {r.foto && <img src={r.foto} alt="" className="cvm-foto" />}
      </header>
      {resumo && <section><h2>Resumo profissional</h2><p>{resumo}</p></section>}
      {comps.length > 0 && <section><h2>Competências</h2><p>{comps.join("  •  ")}</p></section>}
      {(t(r.exp) || t(r.tempo)) && <section><h2>Experiência profissional</h2>{t(r.tempo) && <p className="cvm-cargo">Cuidador(a) de idosos · {r.tempo}</p>}{t(r.exp) && <p>{r.exp}</p>}</section>}
      {((r.formacao_opc || []).length > 0 || t(r.cursos)) && <section><h2>Formação acadêmica</h2>{(r.formacao_opc || []).length > 0 && <p><b>{r.formacao_opc.join(", ")}</b></p>}{t(r.cursos) && <p className="cvm-peq">Cursos: {r.cursos}</p>}</section>}
      {adicionais.length > 0 && <section><h2>Informações adicionais</h2>{adicionais.map(([k, v]) => <p key={k} className="cvm-peq"><b>{k}:</b> {v}</p>)}</section>}
    </div>
  );
}

export function CurriculoImpressao({ r, modelo }: { r: Rec; modelo: Modelo }) {
  return modelo === "minimalista" ? <Minimalista r={r} /> : <Classico r={r} />;
}

export function EscolherModelo({ r, modelo, setModelo, onFechar, onExportar }: { r: Rec; modelo: Modelo; setModelo: (m: Modelo) => void; onFechar: () => void; onExportar: () => void }) {
  const ops: [Modelo, string, string][] = [["classico", "Clássico", "Visual do site, com tons de verde e foto em destaque."], ["minimalista", "Minimalista profissional", "Uma coluna, limpo e objetivo, bom para empresas."]];
  return (
    <div className="modal-fundo" role="dialog" aria-modal="true" aria-labelledby="t-modelo" onClick={onFechar}>
      <div className="card modal" onClick={(e) => e.stopPropagation()}>
        <h2 id="t-modelo">Escolha o modelo do currículo</h2>
        <div className="modelos">
          {ops.map(([id, nome, desc]) => (
            <button key={id} type="button" className="modelo-op" aria-pressed={modelo === id} onClick={() => setModelo(id)}>
              <div className="miniatura"><div className="folha"><CurriculoImpressao r={r} modelo={id} /></div></div>
              <strong>{nome}</strong>
              <span className="dica">{desc}</span>
            </button>
          ))}
        </div>
        <p className="dica">Na janela que vai abrir, escolha "Salvar como PDF" para baixar ou selecione uma impressora.</p>
        <div className="linha">
          <button className="btn sec" type="button" onClick={onFechar}>Cancelar</button>
          <button className="btn" type="button" onClick={onExportar}>Exportar PDF</button>
        </div>
      </div>
    </div>
  );
}
