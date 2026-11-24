import { createFileRoute } from "@tanstack/react-router";
import { Administracao } from "@/components/Administracao";

// Public entry displays an inline sign-in CTA; all data and mutations are protected RPCs.
export const Route = createFileRoute("/administracao")({
  head: () => ({ meta: [
    { title: "Administração — Cuidadores de Idosos" },
    { name: "description", content: "Área da coordenação para gerenciar alunos, currículos e administradores." },
    { property: "og:title", content: "Administração — Cuidadores de Idosos" },
    { property: "og:description", content: "Área de acesso restrito à coordenação de Cuidadores de Idosos." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: Administracao,
});