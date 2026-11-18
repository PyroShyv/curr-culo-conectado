export function podeEditarCurriculo(
  userId: string | null,
  curriculo: { user_id: string | null },
) {
  return Boolean(userId && curriculo.user_id === userId);
}

export function linkCurriculo(base: string, id: string) {
  return `${base.split("#")[0]}#curriculo=${encodeURIComponent(id)}`;
}
