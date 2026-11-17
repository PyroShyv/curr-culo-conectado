# Escolher modelo antes de exportar o currículo em PDF

## O que a pessoa vai ver
Na página do currículo (a do próprio cuidador e a que as famílias abrem pela busca) aparece o botão **"Baixar / imprimir PDF"**. Ao tocar, abre uma janela com dois modelos lado a lado, cada um com uma miniatura:

1. **Clássico**: o visual atual do site (tons de verde, foto redonda, contato em destaque), arrumado para caber numa folha A4.
2. **Minimalista profissional**: o modelo novo, seguindo o documento enviado.

A pessoa escolhe, vê como fica e toca em **"Exportar PDF"**. Abre a janela de impressão do aparelho, já em A4 retrato, onde dá para escolher "Salvar como PDF" ou imprimir. O texto do PDF pode ser selecionado e pesquisado.

O botão "Imprimir" da tela "Seu currículo está pronto!" passa a abrir essa mesma escolha, em vez de imprimir a tela com o QR code.

## Modelo Minimalista: como ele fica
- Uma coluna só, fundo branco, tudo alinhado à esquerda, sem caixas, ícones, gráficos ou rodapé.
- **Cabeçalho:** nome bem grande em azul-marinho, "Cuidador(a) de idosos" em dourado e uma linha simples com telefone · e-mail · cidade/bairro. A foto é opcional e pequena, à direita, e só aparece se a pessoa tiver enviado uma.
- **Resumo profissional:** o texto "Sobre mim", começando pelo tempo de experiência.
- **Competências:** as habilidades separadas por "•".
- **Experiência profissional:** tempo de experiência + o texto de experiência.
- **Formação acadêmica:** a formação marcada, seguida dos cursos.
- **Informações adicionais:** certificados, outras informações e disponibilidade (dias e horários).
- Divisórias finas em cinza-claro entre as seções. Seções vazias não aparecem.
- Cores: azul-marinho #17263B, dourado #C58A22, cinza-escuro #3F4852, cinza-claro #D9DEE5 e fundo branco. Fonte Arial, com os tamanhos do documento (nome 28pt, títulos 14pt, cargo 12pt, texto 10pt, detalhes 8,5pt).
- Pensado para caber em 1 página A4 quando o texto não for muito longo.

## Limitação
O cadastro guarda a experiência e a formação como texto livre, e não como uma lista de "empresa, período e cidade". Por isso o modelo mostra esse texto organizado, mas não separa cada emprego em itens. Se quiser itens separados, dá para mudar a etapa 2 do cadastro depois.

## Detalhes técnicos
- Novo componente `CurriculoImpressao` com as variantes `classico` e `minimalista`, que recebe o currículo (`Rec`) e fica numa área `#area-impressao` escondida na tela.
- Novo componente `EscolherModelo` (janela de escolha com miniaturas em escala reduzida das duas variantes).
- Ao exportar: guardar o modelo escolhido, renderizar a área e chamar `window.print()`.
- Estilos de impressão em `src/cuidadores.css`: `@page { size: A4 portrait; margin: 16mm }` e `@media print`, que esconde todo o resto do site e mostra só `#area-impressao`. O modelo minimalista usa classes próprias (`.cvm-*`) e unidades em pt.
- Nome do arquivo sugerido: definir `document.title` como "Currículo - <nome>" durante a impressão e restaurar depois.
- Não muda nada no banco de dados.
