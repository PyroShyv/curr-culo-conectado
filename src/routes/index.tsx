import { createFileRoute } from "@tanstack/react-router";
import { CuidadoresApp } from "@/components/CuidadoresApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cuidadores de Idosos — currículos e busca" },
      { name: "description", content: "Cuidadores cadastram seu currículo com CPF; famílias encontram cuidadores de idosos por cidade, habilidade e disponibilidade." },
      { property: "og:title", content: "Cuidadores de Idosos — currículos e busca" },
      { property: "og:description", content: "Encontre ou seja um cuidador de idosos. Currículos com contato direto por telefone e e-mail." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CuidadoresApp,
});
