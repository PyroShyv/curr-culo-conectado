export function podeEditarCurriculo(
  userId: string | null,
  curriculo: { user_id: string | null },
) {
  return Boolean(userId && curriculo.user_id === userId);
}

export function linkCurriculo(base: string, id: string) {
  return `${base.split("#")[0]}#curriculo=${encodeURIComponent(id)}`;
}

export function linkWhatsapp(telefone: string) {
  const numero = telefone.replace(/\D/g, "");
  if (/^\d{10,11}$/.test(numero)) return `https://wa.me/55${numero}`;
  if (/^55\d{10,11}$/.test(numero)) return `https://wa.me/${numero}`;
  return null;
}
