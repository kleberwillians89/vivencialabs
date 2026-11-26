/* Bind this script to the destination spreadsheet. No deployment is changed by this file.
 * Script Properties: SPREADSHEET_ID, LEADS_SECRET (same value as the server environment variable).
 */
var LEAD_HEADERS = [
  'Data e hora (São Paulo)', 'Nome completo', 'E-mail corporativo', 'Empresa', 'Cargo',
  'Onde a marca precisa de apoio', 'Material solicitado',
  'Autorização de uso dos dados', 'Aceite da newsletter'
];

function reply_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

// Read-only health check. It never creates a sheet, headers or a lead.
function doGet() {
  return reply_({ ok: true, service: 'vivencia-leads', version: 2, materials: ['estudo'], downloadsEnabled: false, acceptsPost: true, sheet: 'Leads', columns: 9 });
}

// Optional one-time header setup. Run manually only on an empty Leads tab.
function setupLeads() {
  var sheet = destination_();
  if (sheet.getLastRow() > 0) throw new Error('A aba já contém dados; confira A1:I1 sem sobrescrever.');
  sheet.getRange(1, 1, 1, 9).setValues([LEAD_HEADERS]);
  sheet.setFrozenRows(1);
}

function destination_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Configure SPREADSHEET_ID nas propriedades do script.');
  var book = SpreadsheetApp.openById(id);
  var sheet = book.getSheetByName('Leads');
  if (!sheet) throw new Error('Crie a aba Leads e configure os cabeçalhos.');
  return sheet;
}

function validate_(input) {
  if (!input || Array.isArray(input) || typeof input !== 'object') throw new Error('JSON inválido.');
  var fields = { name: 160, email: 254, company: 200, role: 160, support: 3000 };
  var lead = {};
  Object.keys(fields).forEach(function (key) {
    if (typeof input[key] !== 'string') throw new Error('Campo inválido.');
    var value = input[key].trim();
    if (value.length > fields[key] || (key !== 'support' && !value) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new Error('Campo inválido.');
    lead[key] = value;
  });
  if (lead.name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email) || input.material !== 'estudo' || input.consent !== true || typeof input.newsletter !== 'boolean') throw new Error('Dados ou consentimento inválidos.');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId)) throw new Error('Solicitação inválida.');
  lead.email = lead.email.toLowerCase();
  lead.material = 'estudo'; lead.consent = true; lead.newsletter = input.newsletter; lead.requestId = input.requestId;
  return lead;
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var locked = false;
  try {
    if (!e || !e.postData || typeof e.postData.contents !== 'string' || e.postData.contents.length > 16384) throw new Error('Corpo inválido.');
    var input = JSON.parse(e.postData.contents);
    var secret = PropertiesService.getScriptProperties().getProperty('LEADS_SECRET');
    if (!secret || !input || input.secret !== secret) return reply_({ ok: false, code: 'INVALID_SECRET' });
    var lead = validate_(input);
    if (!lock.tryLock(10000)) throw new Error('Cadastro ocupado; tente novamente.');
    locked = true;
    var sheet = destination_();
    // Preserve existing A:I headers; setupLeads is an optional manual action.
    var headers = sheet.getRange(1, 1, 1, 9).getValues()[0];
    if (headers.some(function (value) { return !String(value).trim(); })) throw new Error('Confira os cabeçalhos A1:I1.');
    var values = [lead.name, lead.email, lead.company, lead.role, lead.support, lead.material, lead.consent, lead.newsletter];
    var digest = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(values)));
    var marker = 'vivencia:' + lead.requestId + ':' + digest;
    var row;
    var duplicate = false;
    var last = sheet.getLastRow();
    // Notes in column A keep retry IDs outside the required A:I cell values.
    if (last > 1) {
      var notes = sheet.getRange(2, 1, last - 1, 1).getNotes();
      for (var i = 0; i < notes.length; i++) {
        if (notes[i][0].indexOf('vivencia:' + lead.requestId + ':') === 0) {
          if (notes[i][0] !== marker) throw new Error('Solicitação reutilizada com dados diferentes.');
          row = i + 2; duplicate = true; break;
        }
      }
    }
    if (!row) {
      row = last + 1;
      if (row > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 1);
      var time = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd HH:mm:ss');
      var text = [time].concat(values.slice(0, 6));
      // Rich text writes literal strings, including =, +, -, @ and apostrophes.
      // setValues() alone would interpret a leading '=' as a formula.
      var rich = text.map(function (value) { return SpreadsheetApp.newRichTextValue().setText(value).build(); });
      sheet.getRange(row, 1, 1, 7).setNumberFormat('@').setRichTextValues([rich]);
      sheet.getRange(row, 8, 1, 2).setValues([[true, lead.newsletter]]);
      sheet.getRange(row, 1).setNote(marker);
      SpreadsheetApp.flush();
    }
    var stored = sheet.getRange(row, 1, 1, 9).getValues()[0];
    var formulas = sheet.getRange(row, 1, 1, 9).getFormulas()[0];
    if (!stored[0] || JSON.stringify(stored.slice(1)) !== JSON.stringify(values) || formulas.some(function (formula) { return formula !== ''; })) throw new Error('A linha completa não foi confirmada.');
    return reply_({ ok: true, requestId: lead.requestId, sheet: 'Leads', columns: 9, row: row, duplicate: duplicate });
  } catch (error) {
    // ContentService may still return HTTP 200; callers must inspect ok strictly.
    return reply_({ ok: false, message: 'Não foi possível confirmar a gravação na aba Leads.' });
  } finally {
    if (locked) lock.releaseLock();
  }
}
