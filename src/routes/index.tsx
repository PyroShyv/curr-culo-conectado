import { createFileRoute } from "@tanstack/react-router";
import { CuidadoresApp } from "@/components/CuidadoresApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cuidadores de Idosos — currículos e busca" },
      { name: "description", content: "Cuidadores cadastram seu currículo com e-mail; famílias encontram cuidadores de idosos por cidade, habilidade e disponibilidade." },
      { property: "og:title", content: "Cuidadores de Idosos — currículos e busca" },
      { property: "og:description", content: "Encontre ou seja um cuidador de idosos. Currículos compartilháveis com contato direto por WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CuidadoresApp,
});
