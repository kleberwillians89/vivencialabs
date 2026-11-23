# Conferência visual local — 23/11/2026

Referência principal: `/Users/k/Desktop/Vivência Lab - Landing Page.fig`, preservado fora do projeto público.

Foram lidos separadamente os frames **Landing Page 1:4 (1440 × 11493)** e **iPhone 16 Plus 2:2 (430 × 15855)**. O conector Figma recusou acesso à conta conectada, inclusive para screenshots. Em vez de usar só a miniatura, o arquivo local foi decodificado com seu próprio schema Kiwi; foram extraídos estilos, hierarquia, posições, fills, tamanhos efetivos de glifos e baselines.

As referências de comparação são renderizações auxiliares locais dessas camadas, não exports oficiais do Figma. Usam as imagens internas e os contornos de texto apenas para QA, sem incorporar os contornos como fontes ou texto de produção. Efeitos, cores mistas e alguns detalhes do renderer podem diferir de um export oficial. Texto e controles do site continuam sendo HTML.

## Arquivos e comparações

- `design.css`: fontes e regras de fidelidade por largura; carregado depois de `styles.css`.
- `index.html`: camadas independentes, transições e quebras desktop.
- `styles.css` e `assets/star.svg`: tokens de cor e área visível do separador existente.
- `app.js`: conceitos lado a lado no desktop, alternância por abas no mobile e atualização ao cruzar o breakpoint; integrações de formulário mantidas.
- `assets/fonts/`: WOFF2 Merriweather e licença OFL.
- `scripts/build.mjs` e `scripts/dev.mjs`: incluem o novo CSS.
- `docs/figma-typography-audit.json`: inventário por bloco de texto dos dois frames, incluindo fonte declarada, variantes efetivas, tamanhos, entrelinhas e tracking.

Capturas e comparações ficam em `.private/visual-review/`, excluídas do build e do envio futuro à Vercel:

- `comparison-1440.html` / `.png`: frame desktop à esquerda, site à direita, na mesma escala.
- `comparison-430.html` / `.png`: frame mobile à esquerda, site à direita, na mesma escala.
- `site-320.png`: conferência adicional de legibilidade.
- `browser-report.json`: medidas e fontes efetivamente renderizadas pelo Chrome.

## Tipografia

O arquivo tem diferenças entre estilos-base declarados e o resultado efetivamente composto: por exemplo, o título desktop declara 64 px, mas seus glifos e baselines estão compostos em **41 px / 48 px**. O inventário registra ambos para evitar confundir esses valores. O título usa a família Head solicitada pelo cliente; o `.fig` também contém referências ligadas ao estilo Body nesse bloco.

| Aplicação | Desktop | Mobile 430 | Implementação |
| --- | --- | --- | --- |
| Título principal | 41 / 48 px, quatro linhas | 28 / 32,76 px, quatro linhas aprovadas | Sequel Head pretendida; Arial Bold temporária |
| Títulos principais de seção | 41 / 48 px | 28 / 33 px | Sequel Body pretendida; Arial Bold temporária |
| Subtítulos de metodologia / movimentos | 36 / 42 px | 28 / 33 px | Sequel Head/Body conforme bloco; fallback Arial |
| Texto principal | 19 / 24 px | 16 / 20 px | Merriweather Light/Regular |
| Cards de movimentos | 16 / 20 px | 16 / 20 px | Merriweather Regular |
| Números | 72 / 91 px | 64 / 78 px, compactação aprovada | Merriweather SemiBold |
| Texto dos conceitos | 19 / 24 px | 16 / 20 px | Light no desktop; Regular no mobile |

O tracking dos blocos conferidos é 0. As quebras desktop foram aplicadas nos títulos de conceitos, metodologia, pressão, travessia e serviços. O título mobile continua **JUVENTUDE / BRASILEIRA / E O HIBRIDISMO / TROPICAL**, com o resumo abaixo compacto. Em 320 px, o título cai para 25 px, sem quebrar “E O HIBRIDISMO”.

### Fontes realmente carregadas

A inspeção usou `CSS.getPlatformFontsForNode` do Chrome, e não apenas o valor de `font-family`:

- Título e títulos sans: **Arial-BoldMT**, fonte local, enquanto a Sequel não estiver disponível.
- Textos Light: **MerriweatherLight18pt-Light**, WOFF2 local.
- Textos Regular: variante Regular da mesma distribuição Merriweather, WOFF2 local.
- Números: **MerriweatherLight18pt-SemiBold**, WOFF2 local.
- Citação: Merriweather Light Italic local; peso e estilo explícitos.
- Sinais “+”, setas e alguns controles podem usar Arial/Sans, conforme seu seletor, enquanto as legendas permanecem serifadas.

Merriweather é autohospedada com `@font-face`, em pesos 300, 400, 500, 600 e 700 normais, e 300, 400 e 700 itálicos. Origem: distribuição `@fontsource/merriweather` 5.3.0, sob SIL Open Font License, incluída em `assets/fonts/Merriweather-LICENSE.txt`. Não há requisição de fonte a serviços externos durante a navegação. Essa edição se identifica internamente como “Light 18pt”; a versão binária exata usada pelo designer ainda pode ter métricas diferentes.

### Arquivos que precisam vir do designer

Pedir os **WOFF2 licenciados para incorporação web** destas quatro variantes, com os seguintes nomes de destino sugeridos:

1. `assets/fonts/SequelSans-BoldHead.woff2` — **Sequel Sans Bold Head**, título principal e títulos Head.
2. `assets/fonts/SequelSans-BoldBody.woff2` — **Sequel Sans Bold Body**, títulos de seção e rótulos Body.
3. `assets/fonts/SequelSans-BoldOblHead.woff2` — **Sequel Sans Bold Obl Head**, números inclinados das etapas.
4. `assets/fonts/SequelSans-BoldOblBody.woff2` — **Sequel Sans Bold Obl Body**, rótulos inclinados do Triângulo.

Essas variantes foram encontradas nos dois frames. O nome físico pode ser diferente, mas a variante e a licença precisam corresponder. Não foi baixada nem reconstruída uma cópia da Sequel a partir dos contornos do `.fig`. O CSS usa `local()` para variantes instaladas e Arial como fallback explícito; não referencia URLs de WOFF2 ausentes, evitando erros 404. Quando chegarem os arquivos, trocar `src` dessas quatro faces por `url(...woff2) format('woff2')` e repetir a conferência de quebras.

Para identidade tipográfica exata também vale pedir os WOFF2 usados no projeto para **Merriweather Light, Regular, Medium, SemiBold, Bold e suas variantes itálicas presentes no inventário**, ou confirmar que a edição aberta incorporada corresponde à versão do designer. As fontes abertas já carregam e não estão em fallback Georgia no Chrome testado.

## Camadas e imagens corrigidas

- **Banner:** composição desktop de 801 px, imagem local original em escala independente do texto, resumo antes do título no desktop e enquadramento próprio para mobile. A arte mobile é maior que o viewport e recortada dentro da própria abertura, sem gerar rolagem horizontal.
- **Conceitos:** personagem desktop em camada absoluta atravessando o limite superior e passando por trás do título e dos cards. O frame mobile não contém essa instância; ela não é exibida no mobile. Os dois blocos aparecem lado a lado no desktop, azul e rosa; as abas e seus estados seguem funcionando, com um painel por vez no mobile.
- **Autocuidado:** bloco azul de introdução sobre fundo claro, faixa rosa abaixo e jovem central em camada independente atravessando a borda. Textos laterais no desktop; composição vertical própria no mobile. A transparência original foi mantida.
- **Travessia:** fundo degradê em camada própria, nuvem de borda sobre a transição anterior, nuvem intermediária e nuvem inferior atrás da ponte no desktop. O mobile tem as duas instâncias que aparecem no seu frame. Cada instância tem posicionamento, tamanho e recorte próprios. Ponte sem opacidade artificial, balões escalonados em relação aos três jovens, com “+”, foco e conteúdo HTML preservados.
- **Anéis:** recuperadas as transições de abrangência→conceitos, metodologia→pressão e movimentos→serviços, tanto no desktop quanto no mobile.
- **Pressão e tabela:** dados reposicionados ao redor do Triângulo no desktop, mantendo o tamanho reduzido; rótulos da tabela em pílulas rosa e cabeçalhos azuis. A faixa linear mobile foi preservada.
- **Paleta:** azul `#0211a6`, azul escuro `#0a1a4f`, rosa `#e533af`, vermelho `#e5191d`, amarelo `#ecb610` e cinza `#ececec`, lidos dos estilos ligados no arquivo.
- **Separadores:** corrigidos viewport e cor do SVG existente para que o desenho ocupe a área visual esperada.

As dimensões intrínsecas foram reservadas no HTML para evitar saltos durante o carregamento tardio. Todas as ilustrações do site continuam usando os PNGs originais de `assets/originals/`. Os arquivos foram preservados, sem conversão ou alteração de transparência. Nenhum frame inteiro virou imagem do site.

## Diferenças deliberadas e limites restantes

Os frames não substituem os ajustes já aprovados: metodologia e Triângulo menores, faixas horizontais mobile com indicação e controles, três movimentos lado a lado no desktop e em faixa no mobile, depoimento bastante reduzido, título mobile em quatro linhas, formulário de brandbook, estudo pendente e contato configurável. Por isso a altura total da página e as coordenadas acumuladas das seções não são iguais às dos frames.

O cabeçalho explicativo dos conceitos mobile foi preservado do site aprovado; o frame 2:2 não tem uma composição equivalente ao cabeçalho desktop nessa área. A tabela mantém rolagem interna para não reduzir o texto aos 8 px encontrados no frame mobile. Essas escolhas preservam conteúdo e legibilidade em 320 px.

A Sequel Sans ainda impede fechar a conferência de kerning, largura e quebras com precisão final. Algumas imagens fornecidas são recortes com proporções distintas das imagens internas do `.fig` (banner, personagem e nuvens); a composição foi ajustada usando os originais solicitados, sem deformar as figuras humanas. Para confirmação pixel a pixel, ainda faltam as fontes exatas e exports oficiais PNG dos dois frames, já que o conector não conseguiu acessá-los.

## Validação

- Chrome em 1440, 430 e 320 px: página inteira capturada, CSS/JS/fontes/favicon/imagens sem falhas; largura do documento igual à largura do viewport, sem rolagem horizontal global.
- Carrosséis por toque e botões; abas por clique e setas do teclado; balões por clique e Enter; diálogos de brandbook e estudo, Escape e foco.
- Contador começou em 0, mostrou valor intermediário, chegou a 2300 e não reiniciou ao retornar. As três metas finais continuam 2300, 1385 e 915.
- Fade-in observado nas imagens; com `prefers-reduced-motion`, animação ausente e números finais imediatos.
- Formulário exercitado com Sheets e Storage simulados: erro preserva campos e bloqueia download; nova tentativa só libera PDF após confirmação da linha. PDF original completo conferido por SHA-256. Nenhum lead real foi gravado.
- `npm test`: oito testes da rota passaram. `npm run build`: concluído; arquivos internos e credenciais fora de `dist/`.

Nenhum commit, push, deploy ou alteração de domínio foi realizado.

## Ajuste posterior — hover da ponte e referências do modal

A partir das imagens enviadas, os três balões agora abrem um cartão rosa em sobreposição à ponte ao passar o mouse, com borda branca e escurecimento leve da cena. O conteúdo fica na própria área do balão, em vez de aparecer abaixo da ponte. O ponteiro pode entrar no cartão sem fechá-lo. Clique fixa/fecha, toque funciona no celular, foco de teclado abre e Escape fecha. Somente uma etapa fica aberta por vez.

O modal de download recebeu logo institucional, título rosa, texto explicativo do estudo, campos arredondados (nome/e-mail em linhas completas e empresa/cargo lado a lado), checkboxes separados e fechamento vermelho. Os rótulos dos campos continuam associados aos controles, embora visualmente os nomes sejam exibidos como placeholders. O campo de necessidade continua sendo texto livre, pois não foram fornecidas opções para um menu. A newsletter permanece desmarcada. O estudo abre seu formulário, mas seu envio continua bloqueado e a pendência do PDF é informada. O brandbook usa o mesmo modal com conteúdo próprio e preserva Sheets/Storage.

Na seção de parceiros, logos alinhados, linhas rosa e CTA amplo seguem a terceira referência. O contato configurável continua funcional.

Testes em 1440, 430 e 320: hover, permanência do cursor no conteúdo, fechamento ao sair, toque, foco, Enter/Escape, abertura do modal por clique, estudo pendente e campos preservados após erro de envio do brandbook. Sem overflow horizontal ou erros JavaScript. Capturas `bridge-hover-1440.png`, `bridge-tap-430.png`, `bridge-tap-320.png` e `study-modal-*.png` em `.private/visual-review/`. Nenhum lead real foi gravado.


## Ajuste posterior — header, abrangência e alinhamento do personagem

- Header azul compacto com logo branco. Desktop: O estudo, Sobre a Vivência Lab e contato. Mobile: logo e contato em uma linha. Links internos apontam às seções corretas; contato mantém a configuração central e o e-mail alternativo.
- Título e introdução da abrangência foram colocados abaixo dos 65 px da faixa de estrelas, com respiro. A fonte efetiva do `.fig` para o título é **Sequel Sans Bold Body**, 41 px / 48,38 px no desktop e 28 px / 33,04 px no mobile, tracking 0. O navegador ainda renderiza **Arial-BoldMT**, porque **SequelSans-BoldBody.woff2** não foi fornecida. A variante foi configurada, mas não se afirma equivalência visual com o fallback. O título principal também aguarda **SequelSans-BoldHead.woff2**.
- Corrigido o resumo da abertura: agora usa **Merriweather Light 300 / 19 px / 24 px**, confirmada como WOFF2 customizada pelo Chrome. A introdução da abrangência usa Merriweather Light Italic; no mobile ambos passam para 16 px / 20 px.
- A transparência do PNG do personagem foi medida: limites horizontais úteis de x=37 a x=547 em 649 px, além do letterbox de 37 px gerado pelo slot. O deslocamento final é de **16 px para a esquerda em 1440 px**, alinhando o limite pintado à borda do card rosa (x=1360), preservando escala, recorte, transparência e sobreposição. A instância continua ausente no mobile, como no frame correspondente.
- Acrescentado **Site desenvolvido pela Mugô** como último texto do rodapé.

Capturas desta revisão: `header-1440.png`, `header-430.png`, `header-320.png`, `concepts-aligned-*.png` e medidas/fontes em `header-report.json`, dentro de `.private/visual-review/`. As comparações de página inteira anteriores permanecem como histórico da etapa anterior ao novo header.

Verificado em 1440, 430 e 320 px: largura do documento igual à do viewport, título abaixo das estrelas, logo e contato alinhados no mobile, links internos e ausência de erros JavaScript ou arquivos quebrados.


### Refinamento do personagem

Deslocamento atualizado para **18 px no total à esquerda** em relação à posição original (mais 2 px sobre os 16 px anteriores). Mantidos tamanho, recorte, transparência, sobreposição e comportamento mobile.

### Alinhamento responsivo do enquadramento

O ajuste fixo anterior foi substituído pela margem real do contêiner de 1280 px. A borda pintada do PNG agora acompanha a borda direita do card rosa também em telas largas, preservando escala e sobreposição.

### Revisão pela imagem completa enviada pelo cliente

Referência: imagem integral enviada nesta conversa. Preservados header compacto, título/intro após estrelas e crédito da Mugô, por serem pedidos explícitos posteriores ao layout.

Corrigidos: balões escalonados e conectores da ponte (a camada absoluta precisava de altura explícita), depoimento central de 1030 px com estrelas ao redor e cauda maior, títulos dos movimentos separados em rótulo e assunto, listas e conclusões coloridas, títulos dos conceitos na mesma linha no desktop, divisórias dos serviços, títulos e etapas da metodologia com conectores e divisórias da tabela.

Verificação: Chrome a 1440, 430 e 320 px, sem imagens quebradas e sem overflow horizontal. Capturas revised-bridge, revised-movements e revised-services em .private/visual-review. Build e oito testes de API passaram. A fonte Sequel Sans continua ausente. A referência contém duas notas editoriais sem afirmação completa no Movimento 1 (48,2% e 28,1%); pedida a redação final ao cliente, sem publicar notas de edição como conteúdo.

### Referência mobile enviada pelo cliente

Aplicados estilos específicos até 720 px: abertura centralizada com enquadramento da ilustração e nuvens; cards de estatísticas horizontais; perfilamento centralizado; conceitos em abas sem repetir a abertura desktop; tabela compacta; metodologia em trilho com uma ilustração por etapa; pesquisa em três cards verticais com setas; triângulo com percentuais ao redor; notas de autocuidado centralizadas; balões escalonados e conectores longos; depoimento com estrelas; movimentos em trilho; serviços e parceiros em coluna; seção Sobre centralizada. Mantidos header compacto, dois materiais existentes na seção Sobre e crédito Mugô por instruções anteriores.

Conferência Chrome em 430 e 320 px e regressão geométrica em 1440 px: sem overflow de página nem imagens quebradas. Capturas mobile-ref-*.png em .private/visual-review. Hover, toque, foco/teclado e modais passaram em três larguras. Oito testes de API e build passaram. A fonte Sequel Sans e as redações completas de 48,2% e 28,1% seguem pendentes, sem conteúdo inventado.


### Revisão dimensional do desktop e configuração das fontes

As declarações fornecidas pelo cliente foram aplicadas a Sequel Sans Head e Sequel Sans Body, com os caminhos assets/fonts/sequel-sans-bold-head.woff2 e assets/fonts/sequel-sans-bold-body.woff2. Os arquivos binários não estavam presentes no projeto nem nas pastas de origem examinadas: enquanto ausentes, o navegador recebe 404 nesses dois URLs e renderiza Arial como fallback. Não foi criado arquivo fictício nem substituída a fonte por outra com o mesmo nome.

Medidas corrigidas com base no frame desktop local e na imagem enviada: títulos Bloco A/B/C 41/48.38 px; cartões de conceitos próximos de 654 px, listas e divisórias; ilustração de metodologia 1305×367 px; números das etapas 84×84 px; corpo da metodologia 19/24 px; triângulo 366×366 px, números 64/76 px e rótulos 28/33 px; anéis de transição azuis de 195 px; dimensões dos logos de parceiros; alinhamento do Sobre com título acima do logo e texto. Corrigidos ainda o espaço inicial do depoimento e o vazamento das nuvens para a seção seguinte. Ícones decorativos de território e bandeira e contato no rodapé seguem o desenho visual da referência, como SVGs locais.

Captura desktop-current-full.png em .private/visual-review contém a revisão integral. As diferenças explicitamente pedidas pelo cliente (header compacto, título da abrangência abaixo das estrelas, crédito Mugô e presença dos dois materiais na seção Sobre) foram mantidas. A redação dos dados 48,2% e 28,1% continua incompleta na referência e não foi inventada.

### Última referência mobile

A nova imagem substitui a composição mobile anterior: logo centralizado no topo e contato na abertura; título do perfilamento em destaque por linha; Bloco C centralizado; seta rosa junto à orientação da metodologia; card de autocuidado sobrepondo 140 px do fundo rosa; orientação "Clique em uma fase para ver mais" e pontos nas linhas da ponte; botão de próximo movimento em cada card, com retorno ao primeiro após o último; apenas o botão Baixar estudo visível na seção Sobre mobile. Os botões de materiais existentes no desktop foram mantidos. Crédito Mugô mantido conforme pedido anterior.

Verificados em 320 e 430 px: centro do logo exatamente no centro da viewport; sobreposição de 140 px; avanço do carrossel por toque; abertura da ponte por toque e fechamento por Escape. Sem overflow horizontal ou imagens quebradas. Registros latest-mobile-*.png e final-mobile-full.png em .private/visual-review. Sequel Sans continua indisponível nos dois caminhos WOFF2 configurados.


### Fontes oficiais e formulário Apps Script — atualização final

O ZIP fornecido foi usado para instalar os TTFs Bold Head, Bold Body e suas variantes Bold Obl em assets/fonts. As declarações agora estão em styles.css com format("truetype"), peso 700; foram removidos os WOFF2 Sequel inexistentes e aliases locais de design.css. Chrome/CDP confirmou SequelSans-BoldHead no h1 e SequelSans-BoldBody em “A abrangência do estudo”, ambos custom=true, em 1440, 430 e 320 px. Sem 404 de fontes ou erros de JavaScript, sem overflow horizontal.

O layout foi preservado, com o CTA de brandbook novamente visível no mobile por pedido explícito atual. Rodapé usa os links oficiais existentes. O formulário foi conferido com respostas simuladas da nova integração Apps Script: falha preserva campos e mostra Tentar novamente; duplicidade bloqueada durante envio; confirmação explícita precede assinatura; download do PDF oficial com checksum verificado. Nenhum POST ou cadastro na planilha real. Ver docs/integration-verification.md e README.md.


### Nova tentativa do PDF sem duplicar cadastro

Fluxo mantém layout e estudo separado. API local observada: 503 Storage ausente. Acrescentadas mensagens por etapa e confirmação HMAC após cadastro; retry da assinatura pula Apps Script. Chrome com HTTP real em servidor isolado, Sheets/Storage simulados: uma linha A:I, erro visível no modal e botão Baixar PDF funcional com fixture de teste. O brandbook oficial não estava mais no caminho do Desktop nesta revisão; a verificação atual não deve ser confundida com o checksum histórico. Ver docs/integration-verification.md.
