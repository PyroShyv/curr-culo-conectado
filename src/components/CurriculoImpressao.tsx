import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { linkWhatsapp } from "@/lib/curriculo";

type Rec = Database["public"]["Tables"]["curriculos"]["Row"];
export type Modelo = "classico" | "minimalista" | "tradicional" | "essencial";
export const MODELOS: Modelo[] = ["classico", "minimalista", "tradicional", "essencial"];

function Contato({ r }: { r: Rec }) {
  const link = linkWhatsapp(r.telefone);
  return link ? <a href={link}>WhatsApp: {r.telefone}</a> : null;
}

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
      <section className="cvc-contato"><Contato r={r} /></section>
      {sec("Sobre mim", t(r.sobre))}
      {sec("Experiência profissional", [t(r.tempo) && `Tempo de experiência: ${r.tempo}`, t(r.exp)].filter(Boolean).join("\n"))}
      {sec("Formação e cursos", form)}
      {sec("Habilidades", t(r.habil))}
      {sec("Disponibilidade", [(r.disp_opc || []).join(", "), t(r.disp)].filter(Boolean).join("\n"))}
    </div>
  );
}

function Minimalista({ r }: { r: Rec }) {
  const local = [r.cidade, r.bairro].filter(Boolean).join(", ");
  const contato = [local].filter(Boolean);
  const tempoExp = t(r.tempo) && r.tempo !== "Sem experiência profissional" ? r.tempo : "";

  // Resumo profissional: combina tempo, sobre, qualidades
  const partesTempo = tempoExp ? `Profissional com ${tempoExp.toLowerCase()} de experiência no cuidado de idosos.` : "";
  const resumo = [partesTempo, t(r.sobre)].filter(Boolean).join(" ").trim();

  // Competências: quebra por vírgula, ponto-e-vírgula ou nova linha
  const comps = t(r.habil)
    .split(/[,;\n]+/)
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter(Boolean);

  // Atividades na experiência: quebra o texto em tópicos (linhas ou pontos)
  const expLinhas = t(r.exp)
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Cursos como lista
  const cursosLista = t(r.cursos)
    .split(/[;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Certificações como lista
  const certsLista = t(r.certs)
    .split(/[;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const dispTexto = [(r.disp_opc || []).join(", "), t(r.disp)].filter(Boolean).join(". ");

  return (
    <div className="cvm">
      {/* ─── Cabeçalho ─── */}
      <header className="cvm-topo">
        <div style={{ flex: 1 }}>
          <h1>{r.nome || "Nome completo"}</h1>
          <p className="cvm-cargo">Cuidador(a) de Idosos</p>
          <div className="cvm-contato-lista">
            <Contato r={r} />
            {contato.map((c, i) => <span key={i}>{c}</span>)}
          </div>
        </div>
        {r.foto && <img src={r.foto} alt="" className="cvm-foto" />}
      </header>

      {/* ─── Resumo profissional ─── */}
      {resumo && (
        <section className="cvm-sec">
          <h2 className="cvm-titulo-sec">Resumo Profissional</h2>
          <p className="cvm-resumo">{resumo}</p>
        </section>
      )}

      {/* ─── Competências ─── */}
      {comps.length > 0 && (
        <section className="cvm-sec">
          <h2 className="cvm-titulo-sec">Competências</h2>
          <ul className="cvm-comps">
            {comps.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </section>
      )}

      {/* ─── Experiência profissional ─── */}
      {(expLinhas.length > 0 || tempoExp) && (
        <section className="cvm-sec">
          <h2 className="cvm-titulo-sec">Experiência Profissional</h2>
          <div className="cvm-exp-bloco">
            <p className="cvm-exp-cargo">Cuidador(a) de Idosos</p>
            {tempoExp && <p className="cvm-exp-periodo">{tempoExp}</p>}
            {expLinhas.length > 0 && (
              <ul className="cvm-atividades">
                {expLinhas.map((linha, i) => <li key={i}>{linha}</li>)}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* ─── Formação acadêmica ─── */}
      {((r.formacao_opc || []).length > 0 || cursosLista.length > 0) && (
        <section className="cvm-sec">
          <h2 className="cvm-titulo-sec">Formação Acadêmica</h2>
          {(r.formacao_opc || []).map((f, i) => (
            <p key={i} className="cvm-form-item"><strong>{f}</strong></p>
          ))}
          {cursosLista.map((c, i) => (
            <p key={i} className="cvm-form-curso">{c}</p>
          ))}
        </section>
      )}

      {/* ─── Informações adicionais ─── */}
      {(certsLista.length > 0 || t(r.form_extra) || dispTexto) && (
        <section className="cvm-sec">
          <h2 className="cvm-titulo-sec">Informações Adicionais</h2>
          {certsLista.length > 0 && (
            <div className="cvm-adicional-grupo">
              <p className="cvm-adicional-rotulo">Certificações</p>
              <ul className="cvm-adicional-lista">
                {certsLista.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}
          {t(r.form_extra) && (
            <div className="cvm-adicional-grupo">
              <p className="cvm-adicional-rotulo">Outras informações</p>
              <p className="cvm-adicional-texto">{t(r.form_extra)}</p>
            </div>
          )}
          {dispTexto && (
            <div className="cvm-adicional-grupo">
              <p className="cvm-adicional-rotulo">Disponibilidade</p>
              <p className="cvm-adicional-texto">{dispTexto}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export function CurriculoImpressao({ r, modelo }: { r: Rec; modelo: Modelo }) {
  if (modelo === "minimalista") return <Minimalista r={r} />;
  if (modelo === "classico") return <Classico r={r} />;
  return <Comum r={r} modelo={modelo} />;
}

function Comum({ r, modelo }: { r: Rec; modelo: "tradicional" | "essencial" }) {
  const sec = (nome: string, texto: string) => texto ? <section className="cvn-sec"><h2>{nome}</h2><p>{texto}</p></section> : null;
  return <article className={`cvn cvn-${modelo}`}>
    <header className="cvn-topo"><div><h1>{r.nome}</h1><p className="cvn-cargo">Cuidador(a) de idosos</p><p>{[r.cidade, r.bairro, r.idade && `${r.idade} anos`].filter(Boolean).join(" · ")}</p><Contato r={r} /></div>{r.foto && <img className="cvn-foto" src={r.foto} alt={`Foto de ${r.nome}`} />}</header>
    {sec("Objetivo profissional", "Atuar como cuidador(a) de idosos.")}
    {sec("Apresentação", t(r.sobre))}
    {sec("Experiência profissional", [t(r.tempo), t(r.exp)].filter(Boolean).join("\n"))}
    {sec("Formação e cursos", [(r.formacao_opc || []).join("\n"), t(r.cursos), t(r.certs), t(r.form_extra)].filter(Boolean).join("\n"))}
    {sec("Habilidades", t(r.habil))}
    {sec("Disponibilidade", [(r.disp_opc || []).join(", "), t(r.disp)].filter(Boolean).join("\n"))}
  </article>;
}

export function EscolherModelo({ r, modelo, setModelo, onFechar, onExportar }: { r: Rec; modelo: Modelo; setModelo: (m: Modelo) => void; onFechar: () => void; onExportar: () => void }) {
  const ops: [Modelo, string][] = [["classico", "Clássico"], ["minimalista", "Minimalista Profissional"], ["tradicional", "Tradicional"], ["essencial", "Essencial"]];
  return (
    <div className="modal-fundo" role="dialog" aria-modal="true" aria-labelledby="t-modelo" onClick={onFechar}>
      <div className="card modal" onClick={(e) => e.stopPropagation()}>
        <h2 id="t-modelo">Escolha o modelo do currículo</h2>
        <div className="modelos">
          {ops.map(([id, nome]) => (
            <Button key={id} type="button" variant="outline" className="modelo-op" aria-label={nome} aria-pressed={modelo === id} onClick={() => setModelo(id)}>
              <div className="miniatura" aria-hidden="true"><div className="folha"><CurriculoImpressao r={r} modelo={id} /></div></div>
              <strong>{nome}</strong>
            </Button>
          ))}
        </div>
        <p className="dica">Na janela que vai abrir, escolha "Salvar como PDF" para baixar ou selecione uma impressora.</p>
        <div className="linha">
          <Button className="btn sec" type="button" onClick={onFechar}>Cancelar</Button>
          <Button className="btn" type="button" onClick={onExportar}>Exportar PDF</Button>
        </div>
      </div>
    </div>
  );
}
