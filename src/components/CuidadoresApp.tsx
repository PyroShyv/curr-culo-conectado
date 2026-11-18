import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import qrcode from "qrcode-generator";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { CurriculoImpressao, EscolherModelo, type Modelo } from "@/components/CurriculoImpressao";
import { emailValido, formatarFone, soDigitos } from "@/lib/cpf";
import { linkCurriculo, podeEditarCurriculo } from "@/lib/curriculo";

type Rec = Database["public"]["Tables"]["curriculos"]["Row"];
type View = "inicio" | "cadastro" | "pronto" | "curriculo" | "buscar";

const ETAPAS = ["Dados pessoais", "Experiência profissional", "Formação e cursos", "Habilidades e disponibilidade", "Apresentação pessoal"];
const TEMPO = ["Sem experiência profissional", "Menos de 1 ano", "De 1 a 2 anos", "De 3 a 5 anos", "De 6 a 10 anos", "Mais de 10 anos"];
const FORMACAO = ["Ensino fundamental incompleto", "Ensino fundamental completo", "Ensino médio incompleto", "Ensino médio completo", "Ensino técnico", "Ensino superior incompleto", "Ensino superior completo", "Pós-graduação", "Outra formação"];
const DISP = ["Diurno", "Noturno", "Plantões 12x36", "Finais de semana", "Feriados", "Disponibilidade para dormir no local", "A combinar"];
const CURTO: Record<string, string> = { Diurno: "Dia", Noturno: "Noite", "Plantões 12x36": "Plantão 12x36", "Finais de semana": "Fins de semana", "Disponibilidade para dormir no local": "Dorme no local" };

const norm = (s: string) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const iniciais = (n: string) => (n || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const juntar = (p: (string | false | null | undefined)[]) => p.filter((x) => x && String(x).trim()).join("\n\n");

function qrSvg(texto: string) {
  try {
    const q = qrcode(0, "M");
    q.addData(texto);
    q.make();
    const n = q.getModuleCount(), m = 2;
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
    const t = n + 2 * m;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect width="${t}" height="${t}" fill="#fff"/><path d="${d}" fill="#29483D"/></svg>`;
  } catch {
    return null;
  }
}
function Qr({ texto }: { texto: string }) {
  const s = useMemo(() => qrSvg(texto), [texto]);
  return s ? <div className="qr" dangerouslySetInnerHTML={{ __html: s }} /> : <div className="qr"><p className="centro dica">Não foi possível gerar o QR code agora.</p></div>;
}

function baixarQr(texto: string, nome: string) {
  const svg = qrSvg(texto);
  if (!svg) return false;
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `qrcode-${nome.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "curriculo"}.svg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return true;
}

function Avatar({ r, cls = "" }: { r: Pick<Rec, "foto" | "nome">; cls?: string }) {
  if (r.foto) return <img className={`av ${cls}`} src={r.foto} alt={`Foto de ${r.nome}`} />;
  return <div className={`av ${cls}`} aria-hidden="true">{iniciais(r.nome)}</div>;
}

function Chips({ r }: { r: Rec }) {
  const o = r.disp_opc || [];
  if (!o.length) {
    const t = (r.disp || "").replace(/\s+/g, " ").trim();
    return <div className="chips"><span className="chip claro">{t ? (t.length > 26 ? t.slice(0, 24) + "…" : t) : "Não informada"}</span></div>;
  }
  return <div className="chips">{o.map((v, i) => <span key={v} className={`chip${i >= 2 ? " claro" : ""}`}>{CURTO[v] || v}</span>)}</div>;
}

function lerFoto(file: File): Promise<string | null> {
  return new Promise((ok) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 280 / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        ok(c.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => ok(null);
      img.src = String(fr.result);
    };
    fr.onerror = () => ok(null);
    fr.readAsDataURL(file);
  });
}

function Bloco({ titulo, texto, children }: { titulo: string; texto?: string; children?: ReactNode }) {
  const t = (texto || "").trim();
  return (
    <section className="card">
      <h2>{titulo}</h2>
      {children ?? <p className="texto-livre">{t || <span className="dica">Não informado.</span>}</p>}
    </section>
  );
}

export function CuidadoresApp() {
  const [view, setView] = useState<View>("inicio");
  const [userId, setUserId] = useState<string | null>(null);
  const [emailLogado, setEmailLogado] = useState("");
  const [rec, setRec] = useState<Rec | null>(null);
  const [step, setStep] = useState(1);
  const [voltou, setVoltou] = useState(false);
  const [vendo, setVendo] = useState<Rec | null>(null);
  const [origem, setOrigem] = useState<View>("inicio");
  const [filtros, setFiltros] = useState({ cidade: "", habil: "", disp: "" });
  const [lista, setLista] = useState<Rec[]>([]);
  const [aviso, setAviso] = useState("");
  const [escolhendo, setEscolhendo] = useState<Rec | null>(null);
  const [modelo, setModelo] = useState<Modelo>("classico");
  const [imprimindo, setImprimindo] = useState<Rec | null>(null);
  const exportar = () => {
    const r = escolhendo;
    if (!r) return;
    setEscolhendo(null);
    setImprimindo(r);
    const tituloAntes = document.title;
    document.title = `Currículo - ${r.nome}`;
    setTimeout(() => { window.print(); document.title = tituloAntes; }, 150);
  };
  const [erro, setErro] = useState("");
  const [base, setBase] = useState("");
  const [emailLogin, setEmailLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [cadastroEnviado, setCadastroEnviado] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fotoRef = useRef<HTMLInputElement>(null);
  const salvarT = useRef<ReturnType<typeof setTimeout>>(undefined);
  const avisoT = useRef<ReturnType<typeof setTimeout>>(undefined);

  const mostrarAviso = (m: string) => {
    setAviso(m);
    clearTimeout(avisoT.current);
    avisoT.current = setTimeout(() => setAviso(""), 4200);
  };

  const ir = useCallback((v: View) => {
    setView(v);
    setErro("");
    try { if (location.hash.slice(1) !== v) history.replaceState(null, "", "#" + v); } catch { /* */ }
    window.scrollTo(0, 0);
  }, []);

  const carregarLista = useCallback(async () => {
    const { data, error } = await supabase.from("curriculos").select("*").eq("done", true).order("created_at", { ascending: false });
    if (!error && data) setLista(data);
  }, []);

  const carregarMeu = useCallback(async (uid: string, entrouAgora: boolean, email?: string | null) => {
    let { data } = await supabase.from("curriculos").select("*").eq("user_id", uid).maybeSingle();
    if (!data) {
      const ins = await supabase.from("curriculos").insert({ user_id: uid, email: email || "" }).select("*").single();
      if (ins.error) { mostrarAviso("Não foi possível criar seu cadastro. Tente de novo."); return; }
      data = ins.data;
      setVoltou(false);
      setStep(1);
    } else {
      setVoltou(true);
      setStep(data.done ? 1 : data.passo || 1);
    }
    setRec(data);
    if (entrouAgora) ir("cadastro");
  }, [ir]);

  useEffect(() => {
    setBase(location.href.split("#")[0] ?? "");
    const hash = location.hash.slice(1);
    if (hash.startsWith("curriculo=")) {
      const id = decodeURIComponent(hash.slice("curriculo=".length));
      void supabase.from("curriculos").select("*").eq("id", id).eq("done", true).maybeSingle().then(({ data }) => {
        if (data) {
          setVendo(data);
          setOrigem("inicio");
          setView("curriculo");
        } else {
          setView("buscar");
          mostrarAviso("Este currículo não está disponível. Veja os cuidadores na busca.");
        }
      });
    } else if (hash === "buscar") setView("buscar");
    carregarLista();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
      setEmailLogado(session?.user.email ?? "");
      if (!session) setRec(null);
    });
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        setEmailLogado(data.user.email ?? "");
        carregarMeu(data.user.id, false, data.user.email);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [carregarLista, carregarMeu]);

  // grava alterações no banco (com pequeno atraso para não salvar a cada letra)
  const salvar = useCallback((r: Rec, imediato = false) => {
    clearTimeout(salvarT.current);
    const run = async () => {
      const { id, user_id, exemplo, created_at, updated_at, ...campos } = r;
      void user_id; void exemplo; void created_at; void updated_at;
      const { error } = await supabase.from("curriculos").update(campos).eq("id", id);
      if (error) mostrarAviso("Não foi possível salvar agora. Verifique sua internet.");
    };
    if (imediato) return run();
    salvarT.current = setTimeout(run, 600);
    return undefined;
  }, []);

  const mudar = (patch: Partial<Rec>, imediato = false) => {
    setRec((atual) => {
      if (!atual) return atual;
      const novo = { ...atual, ...patch };
      salvar(novo, imediato);
      return novo;
    });
  };

  async function autenticar(modo: "entrar" | "criar") {
    setErro("");
    setCadastroEnviado("");
    const email = emailLogin.trim().toLowerCase();
    if (!emailValido(email)) return setErro("Digite um e-mail válido, por exemplo voce@email.com.");
    if (senha.length < 6) return setErro("A senha precisa ter pelo menos 6 caracteres.");
    setEnviando(true);

    if (modo === "criar") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { emailRedirectTo: window.location.origin },
      });
      setEnviando(false);
      if (error) {
        if (/email address is not allowed/i.test(error.message)) return setErro("Esse e-mail não é aceito. Use um endereço real que você consiga abrir.");
        if (/already|registered|exists/i.test(error.message)) return setErro("Este e-mail já tem cadastro. Escolha “Entrar” e use sua senha.");
        if (/weak|pwned|leaked/i.test(error.message)) return setErro("Essa senha é muito fácil de adivinhar. Escolha outra.");
        return setErro("Não foi possível criar sua conta agora. Tente novamente.");
      }
      setSenha("");
      if (data.session?.user) {
        await carregarMeu(data.session.user.id, true, email);
      } else {
        setCadastroEnviado(email);
      }
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setEnviando(false);
    if (error) {
      if (/email.*confirm|confirm.*email/i.test(error.message)) return setErro("Confirme seu e-mail antes de entrar. Procure nossa mensagem na sua caixa de entrada e no spam.");
      if (/invalid|credentials|password/i.test(error.message)) return setErro("E-mail ou senha incorretos. Confira os dados e tente de novo.");
      return setErro("Não foi possível entrar agora. Tente novamente.");
    }
    setSenha("");
    if (data.user) await carregarMeu(data.user.id, true, email);
  }

  async function sair() {
    await supabase.auth.signOut();
    setRec(null);
    setEmailLogin("");
    setCadastroEnviado("");
    ir("inicio");
  }

  async function proxima(e: FormEvent) {
    e.preventDefault();
    if (!rec) return;
    setErro("");
    if (step === 1) {
      if (!rec.nome.trim()) return setErro("Digite seu nome completo para continuar.");
      if (!emailValido(rec.email)) return setErro("Digite um e-mail válido para as famílias entrarem em contato.");
      if (soDigitos(rec.telefone).length < 10) return setErro("Digite o telefone com DDD, por exemplo (63) 91234-5678.");
    }
    if (step < 5) {
      const s = step + 1;
      mudar({ passo: Math.max(rec.passo || 1, s) }, true);
      setStep(s);
      setVoltou(false);
      window.scrollTo(0, 0);
      return;
    }
    if (!rec.nome.trim() || !emailValido(rec.email) || soDigitos(rec.telefone).length < 10) {
      setStep(1);
      return setErro("Complete nome, e-mail e telefone para concluir.");
    }
    const final = { ...rec, done: true };
    setRec(final);
    await salvar(final, true);
    await carregarLista();
    setVendo(final);
    ir("pronto");
  }

  const filtrados = useMemo(() => {
    const c = norm(filtros.cidade), h = norm(filtros.habil), d = norm(filtros.disp);
    return lista.filter((r) => {
      if (c && !norm(r.cidade).includes(c)) return false;
      if (h && !norm(`${r.habil} ${r.exp}`).includes(h)) return false;
      if (d && !norm(`${(r.disp_opc || []).join(" ")} ${r.disp}`).includes(d)) return false;
      return true;
    });
  }, [lista, filtros]);

  const abaAtiva = view === "buscar" || (view === "curriculo" && origem === "buscar") ? "buscar" : "inicio";
  const largo = view === "inicio" || view === "buscar";

  function verCurriculo(r: Rec, o: View) {
    setVendo(r);
    setOrigem(o);
    setView("curriculo");
    setErro("");
    history.replaceState(null, "", `#curriculo=${encodeURIComponent(r.id)}`);
    window.scrollTo(0, 0);
  }

  /* ---------- telas ---------- */
  function telaInicio() {
    const link = base + "#inicio";
    return (
      <div className="home-grade">
        <section className="intro" aria-labelledby="t-home">
          <p className="eyebrow">Currículo para cuidadores</p>
          <h1 id="t-home">Encontre ou seja um cuidador de idosos.</h1>
          <p className="apoio">Cadastre seu currículo para apresentar suas qualificações e disponibilidade às famílias.</p>
          <p className="nota">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#29483D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
            Seu e-mail e sua senha são a chave do seu cadastro.
          </p>
          {base && (
            <aside className="card desk qrmini" aria-labelledby="t-qr">
              <Qr texto={link} />
              <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
                <h2 id="t-qr">Acesse pelo celular</h2>
                <p>Aponte a câmera para o QR code ou copie o link do site.</p>
                <div className="link-copia"><code>{link}</code>
                  <button className="btn peq sec" type="button" onClick={() => navigator.clipboard?.writeText(link).then(() => mostrarAviso("Link copiado."), () => mostrarAviso("Não foi possível copiar."))}>Copiar link</button>
                </div>
              </div>
            </aside>
          )}
        </section>
        <section className="card" aria-labelledby="t-form">
          <p className="eyebrow">Acesso do cuidador</p>
          {userId && rec ? (
            <>
              <h2 id="t-form" className="h2g">Olá{rec.nome ? `, ${rec.nome.split(" ")[0]}` : ""}!</h2>
              <p className="dica">Você entrou com o e-mail {emailLogado}.</p>
              <div className="linha">
                <button className="btn" type="button" onClick={() => { setStep(rec.done ? 1 : rec.passo || 1); setVoltou(false); ir("cadastro"); }}>{rec.done ? "Editar meu currículo" : "Continuar meu currículo"}</button>
                <button className="btn sec" type="button" onClick={sair}>Sair</button>
              </div>
            </>
          ) : (
            <>
              <h2 id="t-form" className="h2g">Vamos começar?</h2>
              <form onSubmit={(e) => { e.preventDefault(); void autenticar("entrar"); }} noValidate style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="campo">
                  <label htmlFor="email-acesso">Seu e-mail</label>
                  <input id="email-acesso" type="email" inputMode="email" autoComplete="email" placeholder="voce@email.com" value={emailLogin} onChange={(e) => setEmailLogin(e.target.value)} />
                </div>
                <div className="campo">
                  <label htmlFor="senha">Senha</label>
                  <input id="senha" type="password" autoComplete="current-password" placeholder="Pelo menos 6 caracteres" value={senha} onChange={(e) => setSenha(e.target.value)} />
                  <p className="dica" style={{ marginTop: 6 }}>Use sua senha para entrar ou escolha uma senha para criar sua conta.</p>
                </div>
                <p className="erro" role="alert">{erro}</p>
                <div className="linha" role="group" aria-label="Entrar ou criar conta">
                  <button className="btn" type="submit" disabled={enviando}>{enviando ? "Aguarde…" : "Entrar"}</button>
                  <button className="btn sec" type="button" disabled={enviando} onClick={() => void autenticar("criar")}>{enviando ? "Aguarde…" : "Criar conta"}</button>
                </div>
              </form>
              {cadastroEnviado && <p className="nota" role="status">Enviamos um link de confirmação para {cadastroEnviado}. Abra seu e-mail e clique no link para ativar sua conta.</p>}
            </>
          )}
          <hr className="div" />
          <p className="dica centro">Você é de uma família? <button className="btn peq sec" type="button" onClick={() => ir("buscar")} style={{ marginLeft: 6 }}>Buscar cuidadores</button></p>
        </section>
      </div>
    );
  }

  function Texto({ f, rotulo, tipo = "text", cls = "", extra = {} }: { f: keyof Rec; rotulo: string; tipo?: string; cls?: string; extra?: Record<string, unknown> }) {
    return (
      <div className={`campo ${cls}`}>
        <label htmlFor={`f-${f}`}>{rotulo}</label>
        <input id={`f-${f}`} type={tipo} value={String(rec![f] ?? "")} onChange={(e) => mudar({ [f]: f === "telefone" ? formatarFone(e.target.value) : e.target.value } as Partial<Rec>)} {...extra} />
      </div>
    );
  }
  function Area({ f, rotulo, orient, linhas = 5, cls = "full" }: { f: keyof Rec; rotulo: string; orient?: string; linhas?: number; cls?: string }) {
    return (
      <div className={`campo ${cls}`}>
        <label htmlFor={`f-${f}`}>{rotulo}</label>
        {orient && <p className="dica" style={{ marginBottom: 8 }}>{orient}</p>}
        <textarea id={`f-${f}`} rows={linhas} value={String(rec![f] ?? "")} onChange={(e) => mudar({ [f]: e.target.value } as Partial<Rec>)} />
      </div>
    );
  }
  function Grupo({ g, rotulo, opcoes, dica }: { g: "tempo" | "formacao_opc" | "disp_opc"; rotulo: string; opcoes: string[]; dica: string }) {
    const sel = g === "tempo" ? [rec!.tempo] : rec![g] || [];
    return (
      <fieldset className="grupo full">
        <legend>{rotulo}</legend>
        <p className="dica">{dica}</p>
        <div className="ops">
          {opcoes.map((o) => (
            <label className="op" key={o}>
              <input type="checkbox" checked={sel.includes(o)} onChange={(e) => {
                if (g === "tempo") mudar({ tempo: e.target.checked ? o : "" });
                else {
                  const arr = (rec![g] || []).filter((v) => v !== o);
                  if (e.target.checked) arr.push(o);
                  mudar({ [g]: arr } as Partial<Rec>);
                }
              }} />
              <span>{o}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  function corpoEtapa() {
    const r = rec!;
    if (step === 1)
      return (
        <>
          <div className="foto-linha full">
            <Avatar r={r} />
            <div className="campo">
              <label htmlFor="foto" style={{ margin: 0 }}>Foto de perfil</label>
              <input ref={fotoRef} id="foto" type="file" accept="image/*" style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const url = await lerFoto(file);
                if (!url) return mostrarAviso("Não foi possível abrir essa foto. Tente outra imagem.");
                mudar({ foto: url }, true);
              }} />
              <button className="btn sec" type="button" onClick={() => fotoRef.current?.click()}>{r.foto ? "Trocar foto" : "Escolher foto"}</button>
            </div>
          </div>
          {Texto({ f: "nome", rotulo: "Nome completo", cls: "full", extra: { autoComplete: "name" } })}
          {Texto({ f: "idade", rotulo: "Idade", tipo: "number", extra: { inputMode: "numeric", min: 16, max: 99 } })}
          {Texto({ f: "cidade", rotulo: "Cidade", extra: { autoComplete: "address-level2" } })}
          {Texto({ f: "bairro", rotulo: "Bairro" })}
          {Texto({ f: "email", rotulo: "E-mail para contato", tipo: "email", extra: { autoComplete: "email", placeholder: "seuemail@exemplo.com" } })}
          {Texto({ f: "telefone", rotulo: "Telefone para contato", tipo: "tel", extra: { autoComplete: "tel", inputMode: "tel", placeholder: "(63) 91234-5678", maxLength: 16 } })}
          <p className="dica full">O e-mail e o telefone aparecem no seu currículo para as famílias entrarem em contato.</p>
        </>
      );
    if (step === 2)
      return <>{Grupo({ g: "tempo", rotulo: "Tempo de experiência", opcoes: TEMPO, dica: "Marque apenas uma opção." })}{Area({ f: "exp", rotulo: "Conte sua experiência como cuidador(a)", orient: "Descreva suas experiências, os tipos de cuidados que já realizou, os locais onde trabalhou e outras informações que considera importantes.", linhas: 10 })}</>;
    if (step === 3)
      return <>{Grupo({ g: "formacao_opc", rotulo: "Formação escolar ou profissional", opcoes: FORMACAO, dica: "Marque uma ou mais opções." })}{Area({ f: "cursos", rotulo: "Nome de cursos realizados", linhas: 4, cls: "" })}{Area({ f: "certs", rotulo: "Certificados e qualificações", linhas: 4, cls: "" })}{Area({ f: "form_extra", rotulo: "Outras informações sobre a formação", linhas: 3 })}</>;
    if (step === 4)
      return <>{Area({ f: "habil", rotulo: "Habilidades", orient: "Digite suas habilidades, qualificações e os tipos de cuidado que você sabe realizar." })}{Grupo({ g: "disp_opc", rotulo: "Disponibilidade", opcoes: DISP, dica: "Marque uma ou mais opções." })}{Area({ f: "disp", rotulo: "Dias, horários ou detalhes da disponibilidade", orient: "Se quiser, escreva com mais detalhes quando você pode trabalhar.", linhas: 3 })}</>;
    return Area({ f: "sobre", rotulo: "Fale um pouco sobre você", orient: "Apresente-se às famílias. Conte sobre seu jeito de trabalhar, suas qualidades e o que considera importante sobre seu atendimento.", linhas: 9 });
  }

  function telaCadastro() {
    const pct = Math.round((step / 5) * 100);
    return (
      <>
        {voltou && <section className="card verde" role="status"><h2>Que bom ver você de volta! Seu currículo foi carregado.</h2><p>Continue de onde parou ou toque em um número para editar qualquer etapa.</p></section>}
        <section className="card" aria-labelledby="t-etapa">
          <div className="passos" role="group" aria-label="Etapas do cadastro">
            {[1, 2, 3, 4, 5].map((i) => <button key={i} type="button" className="btn" aria-label={`Etapa ${i}: ${ETAPAS[i - 1]}`} aria-current={i === step ? "step" : undefined} onClick={() => { setStep(i); setVoltou(false); setErro(""); }}>{i}</button>)}
          </div>
          <div className="barra" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><i style={{ width: pct + "%" }} /></div>
          <p className="etapa" id="t-etapa">Etapa {step} de 5: {ETAPAS[step - 1]}</p>
          <form onSubmit={proxima} noValidate>
            <div className="form-grid">{corpoEtapa()}</div>
            <p className="erro" role="alert">{erro}</p>
            <div className="linha">
              <button className="btn sec" type="button" onClick={() => { setErro(""); if (step > 1) { setStep(step - 1); window.scrollTo(0, 0); } else ir("inicio"); }}>Voltar</button>
              <button className="btn" type="submit">{step === 5 ? "Concluir cadastro" : "Próxima etapa"}</button>
            </div>
          </form>
        </section>
      </>
    );
  }

  function telaPronto() {
    const link = linkCurriculo(base, rec!.id);
    return (
      <section className="card centro" aria-labelledby="t-pronto">
        <h1 id="t-pronto" className="h1m">Seu currículo está pronto!</h1>
        <Qr texto={link} />
        <p className="apoio"><strong>Mostre este QR code para as famílias abrirem diretamente o seu currículo.</strong></p>
        <div className="linha">
          <button className="btn" type="button" onClick={() => { if (!baixarQr(link, rec!.nome)) mostrarAviso("Não foi possível baixar o QR code."); }}>Baixar QR code</button>
          <button className="btn sec" type="button" onClick={() => navigator.clipboard?.writeText(link).then(() => mostrarAviso("Link do currículo copiado."), () => mostrarAviso("Não foi possível copiar."))}>Copiar link</button>
          <button className="btn" type="button" onClick={() => rec && setEscolhendo(rec)}>Imprimir / PDF</button>
          <button className="btn sec" type="button" onClick={() => rec && verCurriculo(rec, "pronto")}>Ver meu currículo</button>
          <button className="btn sec" type="button" onClick={() => { setStep(1); setVoltou(false); ir("cadastro"); }}>Editar currículo</button>
        </div>
      </section>
    );
  }

  function telaCurriculo() {
    const r = vendo;
    if (!r) return telaInicio();
    const exp = juntar([r.tempo && `Tempo de experiência: ${r.tempo}`, r.exp]);
    const form = juntar([(r.formacao_opc || []).length > 0 && `Formação: ${r.formacao_opc.join(", ")}`, r.cursos && `Cursos: ${r.cursos}`, r.certs && `Certificados e qualificações: ${r.certs}`, r.form_extra]);
    const disp = juntar([(r.disp_opc || []).join(", "), r.disp]);
    const local = [r.cidade, r.bairro].filter(Boolean).join(" · ");
    const zap = soDigitos(r.telefone);
    const link = linkCurriculo(base, r.id);
    const ehDono = podeEditarCurriculo(userId, r);
    return (
      <>
        <div><button className="btn sec peq" type="button" onClick={() => ir(origem === "pronto" && rec ? "pronto" : origem === "buscar" ? "buscar" : "inicio")}>← Voltar</button></div>
        <section className="card verde" aria-labelledby="t-cv">
          <div className="cv-topo"><span className="eyebrow">Currículo digital</span><span className="status"><i className="ponto" />Perfil público</span></div>
          <div className="perfil">
            <Avatar r={r} cls="gr" />
            <div>
              <h1 id="t-cv" className="h1m" style={{ fontSize: "1.9rem" }}>{r.nome || "Sem nome"}</h1>
              <p className="papel"><i className="ponto q" />Cuidador de idosos{r.idade ? ` · ${r.idade} anos` : ""}</p>
              <p>{local}</p>
            </div>
          </div>
          <Chips r={r} />
        </section>
        <div className="linha">
          {ehDono && <button className="btn sec" type="button" onClick={() => { setRec(r); setStep(1); setVoltou(false); ir("cadastro"); }}>Editar meu currículo</button>}
          <button className="btn" type="button" onClick={() => setEscolhendo(r)}>Baixar / imprimir PDF</button>
        </div>
        <Bloco titulo="Contato">
          <div className="contato">
            <p><span className="eyebrow">E-mail</span><br />{r.email ? <a href={`mailto:${r.email}`}>{r.email}</a> : <span className="dica">Não informado.</span>}</p>
            <p><span className="eyebrow">Telefone</span><br />{r.telefone ? <a href={`tel:+55${zap}`}>{r.telefone}</a> : <span className="dica">Não informado.</span>}</p>
          </div>
          {zap.length >= 10 && <div className="linha"><a className="btn" href={`https://wa.me/55${zap}`} target="_blank" rel="noreferrer">Chamar no WhatsApp</a>{r.email && <a className="btn sec" href={`mailto:${r.email}`}>Enviar e-mail</a>}</div>}
        </Bloco>
        <Bloco titulo="Sobre mim" texto={r.sobre} />
        <Bloco titulo="Experiência profissional" texto={exp} />
        <Bloco titulo="Formação e cursos" texto={form} />
        <Bloco titulo="Habilidades" texto={r.habil} />
        <Bloco titulo="Disponibilidade" texto={disp} />
        <Bloco titulo="QR code deste currículo">
          <div className="qrmini">
            <Qr texto={link} />
            <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0, flex: 1 }}>
              <p>Aponte a câmera do celular para abrir diretamente o currículo de <strong>{r.nome}</strong>.</p>
              <div className="link-copia">
                <code>{link}</code>
                <button className="btn peq sec" type="button" onClick={() => navigator.clipboard?.writeText(link).then(() => mostrarAviso("Link do currículo copiado."), () => mostrarAviso("Não foi possível copiar."))}>Copiar link</button>
              </div>
              <button className="btn sec" type="button" onClick={() => { if (!baixarQr(link, r.nome)) mostrarAviso("Não foi possível baixar o QR code."); }}>Baixar QR code</button>
            </div>
          </div>
        </Bloco>
      </>
    );
  }

  function frase(r: Rec) {
    const t = (r.sobre || r.exp || "").replace(/\s+/g, " ").trim();
    const m = t.match(/^.{15,140}?[.!?](\s|$)/);
    if (m) return m[0].trim();
    return t.length > 110 ? t.slice(0, 108).trim() + "…" : t;
  }
  const primeiro = (t: string) => { const x = (t || "").split(/[.\n]/)[0]?.trim() ?? ""; return x.length > 60 ? x.slice(0, 57).trim() + "…" : x; };
  const formTitulo = (r: Rec) => { let best = "", bi = -1; (r.formacao_opc || []).forEach((v) => { const i = FORMACAO.indexOf(v); if (i > bi) { bi = i; best = v; } }); return best; };

  function telaBusca() {
    return (
      <>
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="t-busca">
          <p className="eyebrow">Para famílias</p>
          <h1 id="t-busca" className="h1m">Buscar cuidadores</h1>
          <p className="apoio">Digite o que procura. Pode preencher só um campo.</p>
        </section>
        <section className="card filtros-card" aria-label="Filtros">
          <div className="filtros">
            {([["cidade", "Cidade", "Ex.: Palmas"], ["habil", "Habilidades ou tipo de cuidado", "Ex.: Alzheimer, curativos"], ["disp", "Disponibilidade", "Ex.: noturno, finais de semana"]] as const).map(([k, l, p]) => (
              <div className="campo" key={k}><label htmlFor={`b-${k}`}>{l}</label><input id={`b-${k}`} type="text" value={filtros[k]} placeholder={p} onChange={(e) => setFiltros({ ...filtros, [k]: e.target.value })} /></div>
            ))}
          </div>
        </section>
        <div aria-live="polite">
          {!filtrados.length ? (
            <div className="card"><p>Nenhum cuidador encontrado com esses filtros. Tente palavras mais simples ou deixe algum campo em branco.</p></div>
          ) : (
            <>
              <p className="etapa" style={{ marginBottom: 12 }}>{filtrados.length} {filtrados.length === 1 ? "cuidador encontrado" : "cuidadores encontrados"}</p>
              <div className="lista">
                {filtrados.map((r) => {
                  const best = formTitulo(r), sub = primeiro(r.cursos);
                  return (
                    <article className="card cv" key={r.id}>
                      <div className="cv-topo"><span className="eyebrow">Currículo digital</span><span className="status"><i className="ponto" />Perfil público</span></div>
                      <div className="cv-perfil"><Avatar r={r} cls="peq" /><div style={{ minWidth: 0 }}><h2>{r.nome}</h2><p className="papel"><i className="ponto q" />Cuidador de idosos{r.cidade ? ` · ${r.cidade}` : ""}</p></div></div>
                      <hr className="div" />
                      <div><p className="eyebrow">Disponibilidade</p><Chips r={r} /></div>
                      <hr className="div" />
                      <p className="cv-cit"><span className="asp" aria-hidden="true">“</span><span>{frase(r)}</span></p>
                      <hr className="div" />
                      <div><p className="eyebrow">Formação</p><p className="cv-tit">{best || sub || "Não informada"}</p>{best && sub && <p className="cv-sub">{sub}</p>}</div>
                      <div className="contato-mini">
                        {r.telefone && <p>📞 <a href={`tel:+55${soDigitos(r.telefone)}`}>{r.telefone}</a></p>}
                        {r.email && <p>✉️ <a href={`mailto:${r.email}`}>{r.email}</a></p>}
                      </div>
                      <button className="btn" type="button" onClick={() => verCurriculo(r, "buscar")}>Ver currículo</button>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </>
    );
  }

  let corpo: ReactNode;
  if (view === "cadastro" && rec) corpo = telaCadastro();
  else if (view === "pronto" && rec) corpo = telaPronto();
  else if (view === "curriculo") corpo = telaCurriculo();
  else if (view === "buscar") corpo = telaBusca();
  else corpo = telaInicio();

  return (
    <div className="cuid-body">
      <div className="wrap">
        <header className="topo">
          <p className="marca">
            <span className="logo" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg></span>
            Cuidadores de Idosos
          </p>
          <nav className="abas" aria-label="Principal">
            <button className="aba" type="button" aria-current={abaAtiva === "inicio" ? "page" : undefined} onClick={() => ir("inicio")}>Início</button>
            <button className="aba" type="button" aria-current={abaAtiva === "buscar" ? "page" : undefined} onClick={() => { carregarLista(); ir("buscar"); }}>Buscar cuidadores</button>
            {userId && <button className="aba" type="button" onClick={sair}>Sair</button>}
          </nav>
        </header>
        <main tabIndex={-1}><div className={`miolo${largo ? " largo" : ""}`}>{corpo}</div></main>
        <p className="rodape">Os currículos ficam salvos com segurança no nosso banco de dados.</p>
      </div>
      {escolhendo && <EscolherModelo r={escolhendo} modelo={modelo} setModelo={setModelo} onFechar={() => setEscolhendo(null)} onExportar={exportar} />}
      {imprimindo && <div id="area-impressao"><CurriculoImpressao r={imprimindo} modelo={modelo} /></div>}
      {aviso && <div className="aviso" role="status" aria-live="polite">{aviso}</div>}
    </div>
  );
}
