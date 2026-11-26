> **Fluxo atual — cadastro sem download (26/11/2026):** CTAs “Quero receber o estudo” → POST api/leads relativo à landing → Apps Script → confirmação de interesse `estudo` na aba Leads. PDFs e brandbook estão bloqueados. A publicação da versão 2 do Code.gs e o upload do proxy POST na Locaweb são necessários para o fluxo real. Consulte [a entrega e as validações atuais](docs/study-interest-release.md). Os relatos abaixo sobre downloads são históricos e não descrevem o fluxo atual.

> Revisão mais recente: formulário preenchido → **Baixar** → download automático, sem mensagem de sucesso/nova aba. LEADS_SECRET foi configurado e o servidor reiniciado. O servidor envia o campo `secret`. Chrome passou com serviços simulados (desktop/mobile), mas a única tentativa TESTE real recebeu 401 HTML do Google, sem confirmação de gravação. É necessário comparar a URL /exec da implantação ativa. Consulte docs/integration-verification.md; os relatos abaixo são históricos.

> Estado atual (23/11/2026): ver [verificação da Versão 2](docs/integration-verification.md). Uma tentativa TESTE foi feita pela API local em localhost:8081 e recusada pelo Apps Script com HTTP 401. LEADS_SECRET está ausente no ambiente local. As afirmações de testes reais anteriores abaixo são históricas. A rota agora fixa bucket e caminho exatos no servidor, independentemente das variáveis antigas de caminho.

# Vivência Lab — integração local

Fluxo atual: formulário → `POST /api/leads` → Apps Script → confirmação explícita de gravação na aba `Leads` → link temporário do brandbook no armazenamento privado. O estudo sobre juventude continua sendo outro PDF e não resolve para o brandbook.

Tudo nesta entrega foi feito localmente: sem commit, push, deploy, upload remoto ou cadastro de teste na planilha real. O código publicado do Apps Script não foi fornecido e não pode ser inspecionado apenas pela URL `/exec`; por isso a implementação completa está em [apps-script/Code.gs](apps-script/Code.gs). Nenhum POST de verificação foi enviado à implantação real.

## Rodar localmente

- Node 22+; `npm ci`, `npm test` e `npm run build`.
- `npm run dev` serve o site e a API em `http://localhost:8081`. A sessão de revisão atual usa `http://localhost:8084` (`PORT=8084 npm run dev`). Um servidor estático Python não executa `/api/leads`.
- `.env.local` já contém a URL fornecida em `GOOGLE_APPS_SCRIPT_URL` e uma chave compartilhada gerada localmente em `LEADS_SECRET`. O arquivo é privado e ignorado. A chave não aparece no navegador ou no build.
- Armazenamento ainda sem credenciais: a rota retorna configuração pendente, preserva os campos e não grava um cadastro que não poderia receber o material.

## Atualizar o Apps Script

1. Abra o projeto Apps Script associado à planilha e cole o conteúdo completo de [apps-script/Code.gs](apps-script/Code.gs), preservando quaisquer funções não relacionadas do seu projeto.
2. Em **Configurações do projeto → Propriedades do script**, configure:
   - `SPREADSHEET_ID`: ID da planilha de destino (o trecho entre `/d/` e `/edit` na URL da planilha, não o `gid`).
   - `LEADS_SECRET`: o mesmo valor de `LEADS_SECRET` em `.env.local`. Para a futura Vercel, copiar o mesmo valor para a variável de servidor com esse nome.
3. Confirme que a aba se chama exatamente `Leads`, com os cabeçalhos A1:I1 abaixo, na mesma ordem. `setupLeads()` pode ser executada manualmente apenas se a aba estiver vazia; ela se recusa a sobrescrever dados existentes. Não execute `doPost` manualmente e não envie um cadastro real nesta etapa.
4. Autorize o script na conta proprietária da planilha. Na implantação Web App, executar como proprietário e permitir o acesso necessário às chamadas do servidor; o `doPost` valida a chave compartilhada no JSON. Uma implantação que exige login interativo retorna HTML e será recusada pela rota.
5. Em **Implantar → Gerenciar implantações → Editar**, selecione **Nova versão** e atualize a implantação existente. Assim é possível manter o mesmo `/exec`. Se criar outra implantação, atualize `GOOGLE_APPS_SCRIPT_URL` no servidor depois. Nenhuma implantação foi alterada por esta entrega.

Este é o procedimento de [implantações versionadas do Apps Script](https://developers.google.com/apps-script/concepts/deployments). Só salvar o código no editor não atualiza uma versão já publicada.

```tsv
Data e hora (São Paulo)	Nome completo	E-mail corporativo	Empresa	Cargo	Onde a marca precisa de apoio	Material solicitado	Autorização de uso dos dados	Aceite da newsletter
```

| Coluna | Valor |
| --- | --- |
| A | Data/hora criada pelo Apps Script em `America/Sao_Paulo`, `yyyy-MM-dd HH:mm:ss` |
| B | Nome completo |
| C | E-mail corporativo normalizado em minúsculas |
| D | Empresa |
| E | Cargo |
| F | Onde a marca precisa de apoio |
| G | `brandbook` |
| H | Autorização obrigatória (`true`) |
| I | Newsletter opcional (`true`/`false`, inicialmente desmarcada) |

A:G são gravadas como texto literal com `setRichTextValues`, sem interpretar `=`, `+`, `-`, `@` ou apóstrofos como fórmulas; H:I mantêm os consentimentos booleanos separados. A implementação segue a [API de Rich Text de Range](https://developers.google.com/apps-script/reference/spreadsheet/range#setRichTextValues(RichTextValue)). Depois da escrita, lê A:I e verifica valores e ausência de fórmulas antes da confirmação. Cabeçalhos diferentes bloqueiam a gravação.

JSON enviado pelo servidor (sem expor a chave ao navegador):

```json
{
  "requestId": "UUID v4 da solicitação",
  "name": "Nome completo",
  "email": "pessoa@empresa.com.br",
  "company": "Empresa",
  "role": "Cargo",
  "support": "Necessidade da marca",
  "material": "brandbook",
  "consent": true,
  "newsletter": false,
  "token": "chave compartilhada apenas entre os servidores"
}
```

O `doPost(e)` lê `e.postData.contents` e responde JSON pelo `ContentService`. O servidor segue o redirecionamento de resposta do Google, conforme a [documentação do Content Service](https://developers.google.com/apps-script/guides/content).

Confirmação emitida pelo código entregue:

```json
{ "ok": true, "requestId": "mesmo UUID", "sheet": "Leads", "columns": 9, "row": 2, "duplicate": false }
```

A rota exige `ok === true`; HTTP 200, HTML, objeto vazio, `ok: false` e a string `"true"` não liberam o PDF. Quando presentes, também confere o UUID, o nome da aba e as nove colunas. O contrato mínimo `{ "ok": true }` é aceito para compatibilidade, mas só é uma confirmação válida se o `doPost` publicado o emitir **depois** da gravação verificada. A implantação atual não foi considerada validada sem conhecer seu código ou gravar um lead real.

Cliques duplicados são bloqueados enquanto o envio está em andamento. Nova tentativa com os mesmos dados mantém o mesmo UUID. O script usa lock e uma nota técnica na célula A para reconhecer uma linha já concluída, sem criar colunas extras ou alterar A:I. Se o link falhar depois de salvar, a próxima tentativa pode reconhecer a linha e emitir outra assinatura. Uma interrupção entre escrita e nota ainda pode exigir conferência manual; não há transação distribuída entre Sheets e Storage.

## Brandbook privado de 70 MB

Arquivo oficial: `/Users/k/Desktop/BRANDBOOK_VIVENCIA LAB_VERSAO 1.pdf`.

- Tamanho: **70.407.277 bytes**; 45 páginas.
- SHA-256: `4b8c40fcd37b6704b9cc66e9d48709ea833c52d10908ea75ff20a22c6096e631`.
- Não copiar para `assets/`, `dist/`, Git ou uma pasta pública.
- Provedor preparado: **Supabase Storage**, somente para o PDF; não existe tabela Supabase de leads neste fluxo.

Ainda é necessário colocar o PDF no bucket **privado** `vivencia-materials`, objeto:

```text
brandbook/BRANDBOOK_VIVENCIA LAB_VERSAO.pdf
```

A migration existente `supabase/migrations/20261123142350_private_materials_storage_only.sql` cria esse bucket privado com limite de 100 MiB e MIME PDF, sem acesso público. Conferir também que o limite global/plano comporta 70 MB. Não aplicar a migration obsoleta em `docs/archive/`.

Variáveis de servidor em `.env.local` (e futuramente na Vercel):

| Variável | Preencher com |
| --- | --- |
| `GOOGLE_APPS_SCRIPT_URL` | `/exec` fornecido, já configurado localmente |
| `LEADS_SECRET` | Mesmo valor de `LEADS_SECRET` nas propriedades do script |
| `SUPABASE_URL` | URL HTTPS do projeto escolhido para Storage |
| `SUPABASE_SECRET_KEY` | Secret de servidor, ou JWT legado `service_role` |
| `MATERIALS_BUCKET` | `vivencia-materials` |
| `BRANDBOOK_OBJECT_PATH` | `brandbook/BRANDBOOK_VIVENCIA LAB_VERSAO.pdf` |
| `SITE_ORIGIN` | Origem exata do site, por exemplo `http://localhost:8084`; ajustar ao publicar |

O upload pode ser feito no painel Storage, nessa pasta e com bucket privado, ou, posteriormente, pelo utilitário que confere o checksum e não sobrescreve objetos:

```sh
node --env-file=.env.local scripts/upload-brandbook.mjs '/Users/k/Desktop/BRANDBOOK_VIVENCIA LAB_VERSAO 1.pdf'
```

Esse comando **não foi executado**. Não houve upload ou alteração remota nesta entrega. Se a conexão for instável, o provedor também oferece upload resumível.

Somente após a confirmação do Apps Script o servidor solicita um link assinado de **300 segundos** para o objeto exato configurado. A rota recusa outro host ou outro caminho de PDF. O download de 70 MB vai diretamente do Storage ao navegador, sem atravessar a função da Vercel. O formulário exibe o link, mantém os campos em caso de erro, oferece **Tentar novamente** e invalida a apresentação do link após cinco minutos.

`Baixar estudo` permanece separado e pendente até existir o PDF oficial do estudo. Nunca retorna o brandbook.

## Fontes e layout

As fontes normais são declaradas em `styles.css`, com `format("truetype")`, peso 700:

- `assets/fonts/Sequel Sans Bold Head.ttf` → `Sequel Sans Head` → título principal.
- `assets/fonts/Sequel Sans Bold Body.ttf` → `Sequel Sans Body` → “A abrangência do estudo” e títulos Body.

As duas variantes Bold Obl do mesmo ZIP fornecido também estão configuradas para as camadas em itálico. Os WOFF2 Sequel inexistentes e os aliases locais antigos foram removidos de `design.css`. As imagens, medidas de desktop/mobile e a estrutura visual foram preservadas; o botão `Baixar brandbook` está disponível também no mobile conforme o pedido atual.

Rodapé mantém os links oficiais:

- Instagram: https://www.instagram.com/vivencia.lab/
- LinkedIn: https://www.linkedin.com/company/viv%C3%AAncia-lab

## Validação local

- `npm test`: 16 testes simulados para a rota e para o `Code.gs`, sem rede real de leads.
- Casos: sucesso explícito; HTTP 200 sem confirmação; confirmação falsa/incompleta; HTML de login; 403/429; timeout; aba/cabeçalhos incorretos; texto literal; horário de São Paulo; consentimentos; retries; falha de Storage; caminho errado de PDF.
- Chrome: fontes efetivamente renderizadas por CDP em `h1` e `.scope h2`; formulário com falha/sucesso simulados; dados preservados; bloqueio de segundo envio; assinatura somente após confirmação; download do PDF original com verificação do checksum. Capturas e relatório em `.private/visual-review/`, fora do build.
- Nenhum teste escreveu na planilha real. Estes testes não substituem a publicação do `doPost` e a configuração real do Storage.

## Arquivos desta alteração

| Área | Arquivos |
| --- | --- |
| Formulário e CTA | `app.js`, `design.css`; `index.html` conserva `material=brandbook` e os links oficiais |
| Fontes | `styles.css`, quatro TTFs fornecidos em `assets/fonts/`, MIME TTF em `scripts/dev.mjs` |
| API | `server/leads.mjs`, novo `server/apps-script.mjs`; rota existente `api/leads.mjs` aponta para esse handler |
| Apps Script | novos `apps-script/Code.gs` e `apps-script/appsscript.json` |
| Configuração local | `.env.local` privado, `.env.example`, `vercel.json` (duração de 45s, sem deploy) |
| Dependências | `package.json`, `package-lock.json`; removidos conta de serviço/GoogleAuth e módulo antigo `server/google-sheets.mjs` |
| Testes | `tests/leads.test.mjs`, novo `tests/apps-script.test.mjs` |
| Documentação | `README.md`, `docs/visual-audit.md`, `docs/integration-verification.md` |

O utilitário `scripts/upload-brandbook.mjs` e a migration de Storage já existentes foram preservados.


## Modal e aviso do estudo pendente

O botão Baixar brandbook em Sobre abre o formulário diretamente com `material: "brandbook"`. Os botões Baixar estudo abrem apenas um aviso, sem campos e sem enviar cadastro, enquanto o PDF do estudo estiver pendente. O aviso oferece solicitar o brandbook como material separado.

O formulário está limitado à altura da janela/visualViewport, com rolagem interna; fechar fica fora do conteúdo rolável, com alvo de 44 px e suporte a Escape.

O caminho do PDF permanece no **servidor**, em `.env.local`:

```dotenv
MATERIALS_BUCKET=vivencia-materials
BRANDBOOK_OBJECT_PATH=brandbook/BRANDBOOK_VIVENCIA LAB_VERSAO.pdf
```

Em `app.js`, o link do botão de download é o `result.downloadUrl` confirmado por `/api/leads`. Não há constante com caminho público do PDF nem cópia em `assets/pdfs/`. O arquivo original continua no Desktop até o upload ao armazenamento privado. As pendências de acesso da implantação Apps Script e credenciais de Storage continuam documentadas acima.


## Diagnóstico atual e nova tentativa do PDF

A porta 8084 executa Node e a API; a falha real observada no Network é **503 JSON / STORAGE_NOT_CONFIGURED**, não 404/405. Nenhuma linha é enviada ao Google nessa situação. A consulta de leitura ao Apps Script ainda redireciona para accounts.google.com.

Quando Apps Script confirma a gravação, a rota passa a emitir `downloadReceipt`, uma confirmação HMAC de uma hora, vinculada ao UUID, ao material e aos dados normalizados. Se apenas a assinatura do PDF falhar, a API devolve `leadSaved:true` e essa confirmação mesmo com status 502. O modal mantém os dados confirmados, mostra **Tentar baixar PDF** e a nova chamada verifica a confirmação antes de acessar apenas o Storage: não chama Apps Script novamente. No sucesso, o visitante vê **Baixar PDF**, com **Gerar novo link** disponível. Se a confirmação expirar, a interface permite verificar novamente o mesmo UUID; o Apps Script entregue reconhece a linha concluída pela nota técnica.

A assinatura da confirmação usa `LEAD_RECEIPT_SECRET`, se configurado, ou a chave compartilhada `LEADS_SECRET` já existente (fallback legado: secret de Storage). Não é necessária uma nova variável para usar a configuração atual. Manter essa chave estável entre reinícios/deploys durante a validade da confirmação. Não existe gravação de PII na confirmação; ela contém hash, UUID, escopo e validade.

Os logs locais registram etapa, código, UUID e status upstream, sem nome, e-mail, corpo do formulário ou segredos. Erros ficam visíveis dentro da área rolável do modal. O servidor local agora usa `server/local-server.mjs`, compartilhado com a verificação HTTP isolada.

**Importante nesta checagem:** o arquivo `/Users/k/Desktop/BRANDBOOK_VIVENCIA LAB_VERSAO 1.pdf` não está mais presente nesse caminho e nenhuma cópia foi localizada nas pastas verificadas. O teste novo do retry usou somente um PDF explicitamente identificado como simulação. É necessário recolocar o PDF oficial ou informar sua localização, configurar o Storage privado e liberar as chamadas do servidor na implantação Apps Script para validar o download real. Os testes anteriores de checksum, registrados acima, ocorreram enquanto o arquivo estava disponível.

Validação nova: 16 testes unitários; Chrome em 1440 e 430 px com POST HTTP real para a API em um servidor isolado, Apps Script/Sheets e Storage simulados. Sequência 502 (cadastro recusado) → 502 (cadastro confirmado, assinatura falhou) → 200 (apenas assinatura repetida); uma única linha de nove colunas na aba Leads simulada. Relatório: `.private/visual-review/retry-pdf-report.json`. Nenhum cadastro real foi criado nesta revisão.

Arquivos adicionais desta correção: `server/download-receipt.mjs`, `server/local-server.mjs`, `server/leads.mjs`, `server/apps-script.mjs`, `scripts/dev.mjs`, `app.js`, `index.html`, `tests/download-receipt.test.mjs`, `tests/leads.test.mjs`.
