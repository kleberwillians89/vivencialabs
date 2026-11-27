# Cadastro de interesse no estudo — 26/11/2026

## Comportamento implementado

Os CTAs “Quero receber o estudo” abrem o formulário existente. A API valida os campos, consentimento e UUID; grava somente o interesse `estudo` via Apps Script; exige a confirmação com o mesmo requestId, aba Leads, nove colunas e número da linha. Newsletter é opcional. A confirmação só aparece após essa resposta. Uma falha preserva os campos e o ID para retry. A confirmação abaixo do botão diz: “Cadastro confirmado! Em breve, seu material será enviado por e-mail.” O fluxo apenas registra o interesse; o envio do material permanece para a etapa de disponibilização.

Nenhum cadastro consulta armazenamento, gera recibo de download, assina URL ou retorna PDF. Chamadas legadas para brandbook/recibo retornam 409 sem chamar serviços externos. Não existe opção de habilitar download por parâmetro do visitante.

## Atualização na Locaweb

Substituir **apenas** estes arquivos em `public_html/hibridismoneotropical/`:

- `entrega/locaweb/hibridismoneotropical/.htaccess`
- `entrega/locaweb/hibridismoneotropical/index.php`

O proxy admite GET/HEAD da landing e de arquivos públicos. A única exceção é POST JSON de até 16 KiB em `/hibridismoneotropical/api/leads`, para `https://vivencialabs.vercel.app/api/leads`. Exige material `estudo`, bloqueia recibos legados, valida a origem quando presente e não encaminha cookies ou credenciais do visitante. TLS permanece validado. PDFs, demais endpoints e outros métodos continuam bloqueados.

O JavaScript resolve `api/leads` a partir da URL do próprio app.js: funciona na raiz da Vercel e na subpasta do cliente, sem chamar `/api/leads` na raiz da hospedagem.

## Configuração obrigatória na Vercel

O projeto `vivencialabs` não possui variáveis configuradas em produção. A API já publicada retornou HTTP 503 `APPS_SCRIPT_NOT_CONFIGURED` para o TESTE; a chamada direta de brandbook retornou HTTP 409 `DOWNLOAD_DISABLED`.

Configurar `GOOGLE_APPS_SCRIPT_URL` e `LEADS_SECRET` somente no servidor, no ambiente Production do projeto correto, e republicar a implantação. Os valores existem no `.env.local`, mas a revisão automática rejeitou sua transferência para a Vercel sem autorização explícita para esse destino. Nenhum valor foi transferido. Não incluir essas variáveis no PHP nem no build público.

## Atualização obrigatória no Apps Script

1. Substituir o conteúdo do arquivo do script por `apps-script/Code.gs`.
2. Preservar as propriedades existentes `SPREADSHEET_ID` e `LEADS_SECRET`, com o mesmo segredo usado no servidor. Não copiar segredos para PHP ou JavaScript público.
3. Não executar `setupLeads()` numa aba preenchida; os cabeçalhos A:I e os cadastros existentes são preservados.
4. Em Implantar → Gerenciar implantações → Editar, selecionar **Nova versão** e atualizar a implantação Web App existente, executando como proprietário e com acesso para chamadas sem login. Manter o mesmo /exec evita trocar GOOGLE_APPS_SCRIPT_URL.
5. O GET de diagnóstico deve informar versão 2, `materials: ["estudo"]` e `downloadsEnabled: false`.

A coluna G recebe `estudo`, H recebe o consentimento obrigatório e I o booleano opcional da newsletter. O UUID e o resumo dos dados ficam em uma nota da coluna A para deduplicação, sem acrescentar colunas.

## Validação e limite atual

- 15 testes automatizados de API e Code.gs: aprovação de `estudo`, validação, confirmações recusadas, origens, corpo limitado, retry/deduplicação, newsletter e bloqueio de brandbook sem assinatura ou acesso a armazenamento.
- Navegador local, 390 e 1440 px: CTAs, formulário, validação, erro com campos preservados, mesma tentativa após resposta perdida, uma linha na aba **simulada**, confirmação e zero downloads. Evidência em `study-interest-browser-validation.json` e `study-interest-confirmation-mobile.png`.
- A tentativa TESTE real, usando o mesmo UUID em todas as verificações, recebeu HTTP 200 do Apps Script com `ok:false` e mensagem de que a gravação não foi confirmada. O GET ainda informou versão 1. Não é possível afirmar que uma linha real foi gravada ou que a implantação aceita `estudo`.
- Proxy executado em Apache/PHP/cURL reais: GET/HEAD públicos aprovados; POST exclusivo chega à API Vercel e preserva status, Content-Type e corpo JSON; origem indevida, método alternativo, PDF, recibo legado e corpo acima de 16 KiB recusados. Teste com consentimento inválido não cria cadastro.
- Nenhuma planilha de destino Vivência foi identificada nas fontes conectadas. É necessário o link correto para conferir a linha real.
- A versão de cadastro já está publicada na Vercel via commit `9b70d01`, mas ainda sem variáveis de produção: a API recusa o envio sem configuração.
- Após configurar as variáveis de produção e publicar o Code.gs, repetir o mesmo TESTE/UUID e conferir uma única linha real, `estudo`, newsletter false e resposta duplicate no retry.
- Após upload WebFTP, validar POST pelo domínio do cliente, confirmação visual e ausência de links/downloads. Sem upload, o proxy antigo ainda rejeita POST.

DNS e os demais arquivos da hospedagem não foram alterados.
