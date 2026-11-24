import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Plus, RefreshCw, ShieldCheck, Trash2, UserMinus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { alterarAdministrador, criarContaManual, excluirCurriculo, obterAdministracao, reenviarConfirmacao } from "@/lib/admin.functions";
import { criarContaSchema } from "@/lib/admin-schema";
import { CurriculoImpressao, EscolherModelo, type Modelo } from "./CurriculoImpressao";

type Dados = Awaited<ReturnType<typeof obterAdministracao>>;
type Curriculo = Dados["curriculos"][number];
const vazio = { nome: "", email: "", senha: "", administrador: false, ativar: false };

export function Administracao() {
  const consultar = useServerFn(obterAdministracao);
  const criar = useServerFn(criarContaManual);
  const papel = useServerFn(alterarAdministrador);
  const excluir = useServerFn(excluirCurriculo);
  const reenviar = useServerFn(reenviarConfirmacao);
  const navigate = useNavigate();
  const [dados, setDados] = useState<Dados | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [restrito, setRestrito] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [aba, setAba] = useState<"curriculos" | "contas" | "admins">("curriculos");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [form, setForm] = useState(vazio);
  const [criando, setCriando] = useState(false);
  const [visualizando, setVisualizando] = useState<Curriculo | null>(null);
  const [escolhendo, setEscolhendo] = useState<Curriculo | null>(null);
  const [modelo, setModelo] = useState<Modelo>("classico");
  const [imprimindo, setImprimindo] = useState<Curriculo | null>(null);
  const [confirmacao, setConfirmacao] = useState<{ titulo: string; detalhe: string; executar: () => Promise<{ ok: boolean; mensagem: string }> } | null>(null);

  async function atualizar() {
    setCarregando(true);
    try {
      const result = await consultar();
      setDados(result);
      setRestrito(false);
    } catch {
      setDados(null);
      setRestrito(true);
      setMensagem("Acesso restrito à coordenação. Entre com uma conta administradora.");
    } finally { setCarregando(false); }
  }
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void atualizar();
      else { setRestrito(true); setCarregando(false); }
    });
  }, []);

  async function agir(fn: () => Promise<{ ok: boolean; mensagem: string }>) {
    setOcupado(true);
    try {
      const result = await fn();
      if (result.ok) await atualizar();
      setMensagem(result.mensagem);
      return result.ok;
    } catch {
      setMensagem("Não foi possível concluir. Verifique sua conexão e seu acesso.");
      return false;
    } finally { setOcupado(false); setConfirmacao(null); }
  }

  async function cadastrar(e: FormEvent) {
    e.preventDefault();
    const parsed = criarContaSchema.safeParse(form);
    if (!parsed.success) { setMensagem("Preencha nome, e-mail válido e senha com pelo menos 8 caracteres."); return; }
    if (await agir(() => criar({ data: parsed.data }))) { setForm(vazio); setCriando(false); }
  }

  function exportar() {
    if (!escolhendo) return;
    setImprimindo(escolhendo);
    setEscolhendo(null);
    const anterior = document.title;
    document.title = `Currículo - ${escolhendo.nome}`;
    setTimeout(() => { window.print(); document.title = anterior; }, 200);
  }

  const termo = busca.trim().toLowerCase();
  const registros = dados?.curriculos.filter((r) => `${r.nome} ${r.cidade}`.toLowerCase().includes(termo) && (filtro === "todos" || (filtro === "publicados" ? r.done : !r.done))) || [];
  const usuarios = dados?.usuarios.filter((u) => {
    const r = dados.curriculos.find((c) => c.user_id === u.id);
    return `${u.email} ${r?.nome || ""}`.toLowerCase().includes(termo) && (aba !== "admins" || dados.administradores.includes(u.id));
  }) || [];

  return <div className="cuid-body c-admin">
    <div className="wrap">
      <header className="topo">
        <Link to="/" className="marca">Cuidadores de Idosos</Link>
        <div className="linha">
          <Button asChild variant="outline"><Link to="/">Voltar ao site</Link></Button>
          {dados && <Button variant="outline" onClick={async () => { setDados(null); await supabase.auth.signOut(); await navigate({ to: "/", replace: true }); }}>Sair</Button>}
        </div>
      </header>
      <main className="c-admin-main">
        <header className="c-admin-heading"><div><p className="eyebrow">Coordenação</p><h1 className="h1m">Administração</h1></div>
          {dados && <Button className="btn" onClick={() => { setCriando(true); setForm({ ...vazio, administrador: aba === "admins" }); }}><Plus />{aba === "admins" ? "Novo administrador" : "Cadastrar usuário"}</Button>}
        </header>
        {mensagem && <p role="status" className="nota">{mensagem}</p>}
        {carregando && <p role="status">Carregando cadastros…</p>}
        {restrito && <div className="c-admin-empty"><ShieldCheck /><h2>Acesso administrativo</h2><Button asChild className="btn"><Link to="/">Entrar na minha conta</Link></Button><Button variant="outline" onClick={atualizar}>Tentar novamente</Button></div>}
        {dados && <>
          <div className="c-admin-counts"><span><strong>{dados.curriculos.length}</strong> currículos</span><span><strong>{dados.curriculos.filter((r) => !r.done).length}</strong> em preenchimento</span><span><strong>{dados.usuarios.length}</strong> contas</span><span><strong>{dados.administradores.length}</strong> administradores</span></div>
          <nav className="c-admin-tabs" aria-label="Cadastros">
            <Button variant={aba === "curriculos" ? "default" : "ghost"} onClick={() => { setAba("curriculos"); setBusca(""); }}>Currículos</Button>
            <Button variant={aba === "contas" ? "default" : "ghost"} onClick={() => { setAba("contas"); setBusca(""); }}><Users />Contas</Button>
            <Button variant={aba === "admins" ? "default" : "ghost"} onClick={() => { setAba("admins"); setBusca(""); }}><ShieldCheck />Administradores</Button>
          </nav>
          <div className="c-admin-toolbar"><div className="campo"><label htmlFor="admin-busca">Buscar {aba === "curriculos" ? "por nome ou cidade" : "por nome ou e-mail"}</label><input id="admin-busca" type="text" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
            {aba === "curriculos" && <div className="campo"><label htmlFor="admin-filtro">Situação</label><select id="admin-filtro" value={filtro} onChange={(e) => setFiltro(e.target.value)}><option value="todos">Todos</option><option value="publicados">Publicados</option><option value="rascunhos">Em preenchimento</option></select></div>}
            <Button variant="outline" size="icon" title="Atualizar lista" aria-label="Atualizar lista" disabled={ocupado || carregando} onClick={atualizar}><RefreshCw /></Button>
          </div>
          <div className="c-admin-table-wrap"><table className="c-admin-table">
            <thead><tr><th>{aba === "curriculos" ? "Aluno" : "Conta"}</th><th>{aba === "curriculos" ? "Cidade" : "Aluno"}</th><th>Situação</th><th>Ações</th></tr></thead>
            <tbody>{aba === "curriculos" ? registros.map((r) => <tr key={r.id}>
              <td>{r.nome || "Sem nome"}</td><td>{r.cidade || "—"}</td><td><span className="selo">{r.done ? "Publicado" : "Em preenchimento"}</span></td>
              <td><div className="c-admin-actions"><Button variant="outline" onClick={() => setVisualizando(r)}>Ver currículo</Button><Button variant="outline" onClick={() => setEscolhendo(r)}>PDF</Button><Button variant="destructive" size="icon" title="Excluir currículo" aria-label={`Excluir currículo de ${r.nome || "aluno"}`} disabled={ocupado} onClick={() => setConfirmacao({ titulo: "Excluir currículo?", detalhe: `O currículo de ${r.nome || "este aluno"} será apagado definitivamente. A conta de acesso será mantida.`, executar: () => excluir({ data: { id: r.id } }) })}><Trash2 /></Button></div></td>
            </tr>) : usuarios.map((u) => {
              const admin = dados.administradores.includes(u.id);
              const r = dados.curriculos.find((c) => c.user_id === u.id);
              return <tr key={u.id}><td>{u.email}{u.id === dados.userId && <small> · Você</small>}</td><td>{r?.nome || "—"}</td><td>{admin ? "Administrador" : "Aluno"}{!u.confirmado && <small> · Aguardando confirmação</small>}</td>
                <td><div className="c-admin-actions"><Button variant="outline" disabled={ocupado || (admin && dados.administradores.length === 1)} onClick={() => setConfirmacao({ titulo: admin ? "Remover administrador?" : "Adicionar administrador?", detalhe: admin ? "A conta será mantida, mas perderá acesso à coordenação." : "Esta conta poderá ver todos os currículos, excluir currículos e gerenciar administradores.", executar: () => papel({ data: { id: u.id, habilitar: !admin } }) })}>{admin ? <UserMinus /> : <ShieldCheck />}{admin ? "Remover acesso" : "Tornar admin"}</Button>
                  {!u.confirmado && <Button variant="outline" disabled={ocupado} onClick={() => void agir(() => reenviar({ data: { id: u.id } }))}>Reenviar confirmação</Button>}
                </div></td></tr>;
            })}</tbody>
          </table></div>
          {(aba === "curriculos" ? registros.length : usuarios.length) === 0 && <p className="c-admin-empty">Nenhum cadastro encontrado.</p>}
        </>}
      </main>
    </div>
    {criando && <div className="modal-fundo" role="dialog" aria-modal="true" aria-labelledby="admin-criar"><form className="card modal" onSubmit={cadastrar}>
      <h2 id="admin-criar">{form.administrador ? "Novo administrador" : "Cadastrar usuário"}</h2>
      <div className="form-grid"><div className="campo full"><label htmlFor="novo-nome">Nome completo</label><input id="novo-nome" type="text" autoComplete="off" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
        <div className="campo"><label htmlFor="novo-email">E-mail de acesso</label><input id="novo-email" type="email" autoComplete="off" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
        <div className="campo"><label htmlFor="novo-senha">Senha inicial</label><input id="novo-senha" type="password" autoComplete="new-password" minLength={8} value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} required /></div>
      </div>
      <label className="op"><input type="checkbox" checked={form.administrador} onChange={(e) => setForm({ ...form, administrador: e.target.checked })} />Acesso de administrador</label>
      <label className="op"><input type="checkbox" checked={form.ativar} onChange={(e) => setForm({ ...form, ativar: e.target.checked })} />Ativar conta imediatamente (cadastro conferido)</label>
      <p role="status" className="erro">{mensagem}</p>
      <div className="linha"><Button variant="outline" disabled={ocupado} type="button" onClick={() => { setCriando(false); setForm(vazio); }}>Cancelar</Button><Button className="btn" disabled={ocupado} type="submit">{ocupado ? "Cadastrando…" : "Salvar cadastro"}</Button></div>
    </form></div>}
    {confirmacao && <div className="modal-fundo" role="alertdialog" aria-modal="true" aria-labelledby="admin-confirmar"><div className="card modal"><h2 id="admin-confirmar">{confirmacao.titulo}</h2><p>{confirmacao.detalhe}</p><div className="linha"><Button variant="outline" disabled={ocupado} onClick={() => setConfirmacao(null)}>Cancelar</Button><Button variant="destructive" disabled={ocupado} onClick={() => void agir(confirmacao.executar)}>{ocupado ? "Aguarde…" : "Confirmar"}</Button></div></div></div>}
    {visualizando && <div className="modal-fundo" role="dialog" aria-modal="true" aria-label="Currículo do aluno"><div className="card modal"><div className="linha"><Button variant="outline" onClick={() => setVisualizando(null)}>Fechar</Button><Button className="btn" onClick={() => { setEscolhendo(visualizando); setVisualizando(null); }}>Baixar / imprimir PDF</Button></div><CurriculoImpressao r={visualizando} modelo="minimalista" /></div></div>}
    {escolhendo && <EscolherModelo r={escolhendo} modelo={modelo} setModelo={setModelo} onFechar={() => setEscolhendo(null)} onExportar={exportar} />}
    {imprimindo && <div id="area-impressao"><CurriculoImpressao r={imprimindo} modelo={modelo} /></div>}
  </div>;
}