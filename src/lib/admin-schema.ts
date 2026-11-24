import { z } from "zod";

export const criarContaSchema = z.object({
  nome: z.string().trim().min(1).max(150),
  email: z.string().trim().toLowerCase().email().max(254),
  senha: z.string().min(8).max(128),
  administrador: z.boolean(),
  ativar: z.boolean(),
});
export const papelSchema = z.object({ id: z.string().uuid(), habilitar: z.boolean() });
export const idSchema = z.object({ id: z.string().uuid() });
export const editarUsuarioSchema = z.object({
  id: z.string().uuid(),
  email: z.string().trim().toLowerCase().email().max(254),
  senha: z.union([z.literal(""), z.string().min(8).max(128)]),
});

export function exigirAdministrador(admin: boolean) {
  if (!admin) throw new Error("Acesso restrito à administração.");
}