export function podeEditarCurriculo(
  userId: string | null,
  curriculo: { user_id: string | null },
) {
  return Boolean(userId && curriculo.user_id === userId);
}
