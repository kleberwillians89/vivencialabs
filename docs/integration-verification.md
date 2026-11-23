# Verificação mais recente — integração local (23/11/2026)

- Ambiente inspecionado sem imprimir valores: URL /exec igual à fornecida; LEADS_SECRET, SUPABASE_URL e SUPABASE_SECRET_KEY presentes. Nenhuma variável alterada nesta revisão.
- Corrigida normalização de support omitido para string vazia e adicionado teste de contrato. Backend mantém secret apenas no servidor, confirmação ok estritamente true, caminho exato com espaço, download e validade de 300 segundos. Retry mantém UUID; recibo confirmado evita novo POST ao Apps Script. A prevenção de duplicidade após perda da resposta também depende de o doPost publicado deduplicar requestId.
- Encontrados Node e Python do projeto usando a porta 8081; encerrados ambos e iniciado somente npm run dev (Node com /api/leads) em localhost:8081.
- Um envio real TESTE pelo site/Chrome: uma chamada POST /api/leads; HTTP local 502 APPS_SCRIPT_ACCESS, upstream 401 HTML, sem JSON ok:true. Sem downloadUrl e sem download. Campos preservados, erro no modal, zero alertas/popups. Sem confirmação de linha nem acesso independente identificado à planilha.
- GET separado a partir deste ambiente: HTTP 302 para accounts.google.com, sem JSON vivencia-leads. O relato do usuário de GET com serviço vivencia-leads não pôde ser reproduzido na chamada sem sessão Google do servidor. Não é possível concluir que a validação do segredo falhou: a resposta observada é HTML de acesso do Google.
- 19 testes automatizados passaram e build passou. Chrome com serviços simulados em desktop/mobile verifica download automático após preencher/enviar, bloqueio de envio duplicado, preservação de campos, ausência de mensagem de sucesso/nova aba e recuperação sem novo cadastro; fixture não é PDF oficial.
- Código alterado nesta revisão: server/leads.mjs, tests/leads.test.mjs; automação privada de QA atualizada. Layout e estudo preservados. Sem commit, push ou deploy.
- Pendente validar POST anônimo da implantação, única linha em Leads e download oficial. Não foram repetidos cadastros reais nesta revisão.

---

# Reteste da Versão 6 — 23/11/2026

Um cadastro TESTE submetido pelo site no Chrome: um único POST /api/leads; resposta local 502 APPS_SCRIPT_ACCESS, upstream HTTP 401 sem JSON. Sem confirmação de gravação ou download; campos preservados, zero alertas e popups. Sem conferência independente da planilha. GET diagnóstico separado, sem cadastro e com parâmetro para evitar cache: HTTP 302, Location para accounts.google.com. Isso confirma redirecionamento de autenticação no endpoint configurado. Nenhuma nova tentativa de cadastro nesta verificação adicional. Relatório privado do navegador atualizado. Sem alterações de código, commit, push ou deploy neste reteste.

---

# Reteste após publicação da Versão 5 — 23/11/2026

URL /exec informada pelo usuário permanece igual à configurada. Uma tentativa TESTE pelo formulário no Chrome, com serviços reais: exatamente um POST /api/leads; HTTP 502 APPS_SCRIPT_ACCESS, upstream Google HTTP 401 sem JSON; leadSaved:false, sem URL de download e sem download. Campos mantidos, erro no modal, zero alertas e novas abas. Não foi possível confirmar uma linha na planilha nem executar o download oficial. O código doPost da Versão 5 não pôde ser inspecionado remotamente. Nenhum novo ajuste de código ou publicação remota neste reteste. Relatório privado atualizado em .private/lead-tests/real-single-click-report.json.

---

# Verificação atual — formulário preenchido → Baixar (23/11/2026)

- LEADS_SECRET configurado pelo usuário no .env.local e carregado após reinício do servidor Node em localhost:8081. Nenhum valor de segredo foi registrado. GOOGLE_APPS_SCRIPT_URL continua no /exec da Versão 2 fornecida; não foi possível confirmar que essa implantação é a ativa com o doPost esperado.
- Corpo enviado pelo servidor usa `secret: process.env.LEADS_SECRET`; navegador continua apenas com POST /api/leads. Confirmação exige JSON com ok:true. Code.gs de referência passou a validar secret e preserva os cabeçalhos existentes A:I (sem executar setupLeads).
- Uma tentativa real TESTE pelo Chrome: formulário preenchido, consentimento marcado e um clique no envio; exatamente um POST /api/leads; HTTP 502 APPS_SCRIPT_HTTP, upstream HTTP 401; leadSaved:false; sem downloadUrl/download; zero alertas e novas abas; campos preservados e erro visível no modal. A linha na planilha não foi conferida independentemente.
- Diagnóstico separado sem dados de lead: GET redireciona para login do Google; POST com corpo vazio devolve HTTP 401 text/html (página de erro), sem JSON. Evidência de bloqueio de acesso/implantação pelo Google, não de rejeição JSON do campo secret. Não foi possível executar/inspecionar o doPost remoto para validar a igualdade dos segredos. A API agora identifica esse HTML 401 como APPS_SCRIPT_ACCESS; rejeição JSON INVALID_SECRET/UNAUTHORIZED tem código APPS_SCRIPT_SECRET_REJECTED.
- 18 testes automatizados passaram; build passou. Chrome 1440 e 430 px, com serviços simulados: formulário preenchido e um envio inicia download de fixture, sem sucesso intermediário, alerta, nova aba ou segundo clique; envio duplicado bloqueado; falha preserva campos; recuperação e nova assinatura não chamam Apps Script novamente. Fixture não é o PDF oficial. Relatório real privado: .private/lead-tests/real-single-click-report.json.
- Assinatura usa bucket vivencia-materials e objeto exato brandbook/BRANDBOOK_VIVENCIA LAB_VERSAO.pdf; parâmetro download define o nome do anexo. A entrega real do PDF e seu cabeçalho Content-Disposition não foram confirmados porque a gravação foi bloqueada antes do Storage.
- Pendência: conferir a implantação /exec ativa com doPost e acesso sem login (executar como proprietário, acesso Qualquer pessoa). Se o script ativo ainda usa token, adaptar para secret usando apps-script/Code.gs como referência. Sem publicação remota nesta revisão.
- CSS e HTML preservados; nenhum commit, push ou deploy. Os registros abaixo são históricos.

---

# Verificação atual — Versão 2 (23/11/2026)

- `.env.local`: alterada somente GOOGLE_APPS_SCRIPT_URL. As demais entradas foram preservadas. LEADS_SECRET não está definido nesse arquivo nem no ambiente do processo; nenhum segredo foi criado ou substituído.
- Servidor Node iniciado em http://localhost:8081 com POST /api/leads.
- Uma única tentativa fictícia TESTE pela rota local: HTTP 502, APPS_SCRIPT_HTTP; upstream Apps Script HTTP 401; leadSaved:false; sem downloadUrl. Não houve segunda tentativa de cadastro.
- GET da implantação: HTTP 200 com HTML de login do Google, sem JSON de diagnóstico. Não foi possível inspecionar o doPost publicado. O Code.gs local completo espera `token` com o valor de LEADS_SECRET e os campos name/email/company/role/support/material/consent/newsletter/requestId.
- Sem confirmação de gravação e sem acesso identificado à planilha de destino: não foi possível confirmar uma linha na aba Leads. O download oficial e o clique alternativo não foram validados de ponta a ponta.
- 16 testes automatizados passaram e build passou. Os testes usam Apps Script/Sheets/Storage simulados e confirmam nove colunas, ok estritamente true, falhas, deduplicação por UUID e recuperação de link sem nova chamada ao Apps Script.
- Sem teste de navegador nesta revisão. Layout/CSS/HTML preservados. Botão Baixar PDF permanece um link direto, sem handler de cadastro.
- Bucket e objeto fixados no servidor: vivencia-materials / brandbook/BRANDBOOK_VIVENCIA LAB_VERSAO.pdf. Variáveis antigas de caminho não substituem esse objeto.
- Pendências: permitir chamadas do servidor à implantação, configurar LEADS_SECRET igual ao das propriedades do Apps Script e repetir o teste completo após liberação. Código completo de referência: apps-script/Code.gs. Sem commit, push ou deploy.

Os registros abaixo são históricos; não representam validação da implantação atual.

---

# Resultado mais recente: retry do PDF

- Network real na porta 8084: POST /api/leads responde **503 / STORAGE_NOT_CONFIGURED**. A API está executando; não é um servidor apenas estático.
- Log local: `lead_request_failed`, código `STORAGE_NOT_CONFIGURED`, `leadSaved:false`.
- Apps Script consultado por GET: redireciona para login em accounts.google.com, sem confirmação de POST. Nenhum cadastro real nesta revisão.
- Arquivo oficial ausente no caminho do Desktop e não localizado nas pastas consultadas; não foi possível verificar novamente seu conteúdo/checksum.
- **16 testes unitários passaram.**
- Chrome 1440/430 px: POST HTTP real a uma instância isolada da API, com Code.gs executado contra a aba Leads simulada e Storage simulado. Uma falha de cadastro manteve campos e erro visível; a tentativa seguinte gravou uma única linha A:I; falha na assinatura preservou uma confirmação assinada; a próxima chamada não executou Apps Script e exibiu o botão Baixar PDF.
- O PDF baixado neste teste é um fixture explicitamente marcado SIMULACAO, não o brandbook oficial. `officialPDFVerified:false` e `fixtureOnly:true` no relatório. Não representa ativação de download em produção.
- Evidência atual: `.private/visual-review/retry-pdf-report.json`. As seções abaixo são o histórico anterior, quando o PDF original ainda estava disponível.

---

# Validação local — Apps Script, brandbook e fontes

Implementação revisada em 23/11/2026, sem commit, push, deploy ou upload remoto.

- **12 testes automatizados passaram** (`npm test`): rota e Apps Script executado em sandbox JS com planilha simulada. Nenhum teste usa o endpoint real de leads.
- **Chrome 1440, 430 e 320 px**: fontes efetivamente renderizadas via CDP, não apenas o valor de `font-family` no CSS:

| Bloco | Família renderizada | Arquivo customizado |
| --- | --- | --- |
| Título principal (`h1`) | `SequelSans-BoldHead` | Sim |
| A abrangência do estudo (`.scope h2`) | `SequelSans-BoldBody` | Sim |

Sem fontes ausentes, imagens quebradas, erros JS ou overflow horizontal. Capturas `ttf-layout-*.png` e relatório `apps-script-browser-report.json` em `.private/visual-review/`.

Em desktop e mobile, o navegador foi conectado à rota real por um handler com **fetch inteiramente simulado**:

1. Resposta Apps Script HTTP 200 / `{ok:false}` → rota 502, sem chamada ao Storage, sem link liberado, todos os campos preservados.
2. Botão muda para **Tentar novamente**.
3. Segunda tentativa fica pendente na confirmação simulada → botão desabilitado e evento adicional de submit não gera outra requisição.
4. `{ok:true, requestId, sheet:"Leads", columns:9}` → só então é chamada a assinatura do Storage.
5. URL assinada simulada aponta para o objeto correto. A requisição do navegador é interceptada localmente e entrega o PDF oficial completo, sem upload a serviços externos.
6. Checksum do arquivo baixado em ambas as larguras: `4b8c40fcd37b6704b9cc66e9d48709ea833c52d10908ea75ff20a22c6096e631` (70.407.277 bytes).
7. Estudo continua separado e desativado enquanto seu PDF oficial não está disponível; newsletter começa desmarcada.

Também foram simulados: HTTP 200 sem confirmação, string "true", HTML de login, aba/colunas/UUID incorretos, 403, 429, timeout, falta de configuração, assinatura com erro, host errado e caminho de outro PDF. Nenhum deles libera o download.

O Apps Script entregue confere cabeçalhos e leitura de A:I, grava strings com Rich Text, usa horário de São Paulo, mantém consentimentos distintos e reconhece retries já concluídos por UUID em nota técnica. O teste de sandbox verifica o contrato e a lógica local; não equivale a executar no ambiente Google.

**Pendente para ativação real:** publicar a nova versão de `apps-script/Code.gs` com `SPREADSHEET_ID` e `LEADS_SECRET`, e configurar o Storage privado com o PDF oficial. O código da implantação atual não foi disponibilizado; não foi feita uma gravação real para inferir seu comportamento. Passos, variáveis e caminho do objeto estão no README.


## Correção do aviso e altura do modal

Chrome em 1440×650, 430×700 e 320×480, com redução posterior da janela para 320 px de altura: estudo exibe aviso sem campos; a transição para brandbook abre apenas o formulário correto; modal fica entre y=12 e altura−12; fechar permanece entre y=24 e y=68 mesmo após rolar o conteúdo; campos preservados em falha simulada; link exibido após confirmação simulada. Nenhum cadastro real nesta revisão. Registros modal-height-report.json, modal-height-*.png e modal-open-*.png na pasta privada de QA.

Download automático reativado a pedido do usuário: Chrome com resposta simulada confirmou início do download após ok:true/leadSaved:true, mantendo o botão Baixar PDF como alternativa. Sem cadastro real; usado somente fixture identificado como simulação. As pendências reais de Apps Script, Storage e arquivo oficial permanecem.
