import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { criarContaSchema, editarUsuarioSchema, exigirAdministrador, idSchema, papelSchema } from "./admin-schema";

export const obterAdministracao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: admin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error) throw new Error("Não foi possível verificar o acesso.");
    exigirAdministrador(Boolean(admin));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const usuarios: { id: string; email: string; confirmado: boolean }[] = [];
    for (let page = 1; ; page++) {
      const result = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 });
      if (result.error) throw new Error("Não foi possível carregar as contas.");
      usuarios.push(...result.data.users.map((u) => ({ id: u.id, email: u.email || "", confirmado: Boolean(u.email_confirmed_at) })));
      if (result.data.users.length < 100) break;
    }
    const [curriculos, roles] = await Promise.all([
      context.supabase.from("curriculos").select("*").order("created_at", { ascending: false }),
      context.supabase.from("user_roles").select("user_id").eq("role", "admin"),
    ]);
    if (curriculos.error || roles.error) throw new Error("Não foi possível carregar os cadastros.");
    return { userId: context.userId, usuarios, curriculos: curriculos.data, administradores: roles.data.map((r) => r.user_id) };
  });

export const criarContaManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => criarContaSchema.parse(input))
  .handler(async ({ data, context }) => {
    const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    exigirAdministrador(!role.error && Boolean(role.data));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await supabaseAdmin.auth.admin.createUser({ email: data.email, password: data.senha, email_confirm: data.ativar });
    if (result.error || !result.data.user) {
      return { ok: false, mensagem: /already|registered|exists/i.test(result.error?.message || "") ? "Este e-mail já está cadastrado." : "Não foi possível criar a conta. Confira o e-mail e use uma senha mais forte." };
    }
    const user = result.data.user;
    const inserted = await supabaseAdmin.from("curriculos").insert({ user_id: user.id, nome: data.nome, email: data.email });
    if (inserted.error) {
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      return { ok: false, mensagem: "Não foi possível criar o currículo; a conta não foi mantida." };
    }
    if (data.administrador) {
      const granted = await context.supabase.rpc("set_admin_role", { _target: user.id, _enabled: true });
      if (granted.error) {
        await supabaseAdmin.from("curriculos").delete().eq("user_id", user.id);
        await supabaseAdmin.auth.admin.deleteUser(user.id);
        return { ok: false, mensagem: "Não foi possível atribuir a administração; o cadastro foi cancelado." };
      }
    }
    if (!data.ativar) {
      const sent = await supabaseAdmin.auth.resend({ type: "signup", email: data.email });
      if (sent.error) return { ok: true, mensagem: "Conta criada, mas a confirmação não foi enviada. Use Reenviar confirmação na lista." };
    }
    return { ok: true, mensagem: data.ativar ? "Conta criada e ativada." : "Conta criada. Enviamos a confirmação por e-mail." };
  });

export const alterarAdministrador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => papelSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("set_admin_role", { _target: data.id, _enabled: data.habilitar });
    if (error) return { ok: false, mensagem: error.message.includes("LAST_ADMIN") ? "Não é possível remover o último administrador." : "Não foi possível alterar o acesso administrativo." };
    return { ok: true, mensagem: data.habilitar ? "Administrador adicionado." : "Acesso administrativo removido. A conta continua sendo de aluno." };
  });

export const excluirCurriculo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    exigirAdministrador(!role.error && Boolean(role.data));
    const result = await context.supabase.from("curriculos").delete().eq("id", data.id).select("id").single();
    return { ok: !result.error, mensagem: result.error ? "Não foi possível excluir este currículo." : "Currículo excluído. A conta de acesso foi mantida." };
  });

export const reenviarConfirmacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    exigirAdministrador(!role.error && Boolean(role.data));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await supabaseAdmin.auth.admin.getUserById(data.id);
    if (!user.data.user?.email) return { ok: false, mensagem: "Conta não encontrada." };
    const sent = await supabaseAdmin.auth.resend({ type: "signup", email: user.data.user.email });
    return { ok: !sent.error, mensagem: sent.error ? "Não foi possível enviar. Aguarde e tente novamente." : "Confirmação enviada." };
  });

export const editarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => editarUsuarioSchema.parse(input))
  .handler(async ({ data, context }) => {
    const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    exigirAdministrador(!role.error && Boolean(role.data));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const atual = await supabaseAdmin.auth.admin.getUserById(data.id);
    if (atual.error || !atual.data.user) return { ok: false, mensagem: "Conta não encontrada." };

    const emailAtual = (atual.data.user.email || "").toLowerCase();
    const emailAlterado = data.email !== emailAtual;
    const attrs: { email?: string; email_confirm?: boolean; password?: string } = {};
    if (emailAlterado) {
      attrs.email = data.email;
      attrs.email_confirm = true;
    }
    if (data.senha) attrs.password = data.senha;
    if (!attrs.email && !attrs.password) return { ok: false, mensagem: "Nenhuma alteração informada." };

    const updated = await supabaseAdmin.auth.admin.updateUserById(data.id, attrs);
    if (updated.error) {
      return {
        ok: false,
        mensagem: /already|registered|exists/i.test(updated.error.message || "")
          ? "Este e-mail já está em uso por outra conta."
          : "Não foi possível atualizar a conta. Confira o e-mail e a senha.",
      };
    }

    if (emailAlterado) {
      await supabaseAdmin.from("curriculos").update({ email: data.email }).eq("user_id", data.id);
    }

    return { ok: true, mensagem: "Dados do usuário atualizados." };
  });