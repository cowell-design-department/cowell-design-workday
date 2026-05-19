/**
 * 設計部 工作日報 雲端同步 Apps Script
 *
 * 部署步驟（用 cowell.design.department@gmail.com 登入）：
 *  1. 到 https://sheets.new 建立新試算表，建議命名「設計部工作日報」
 *  2. 擴充功能 → Apps Script
 *  3. 把編輯區所有內容刪掉，貼上本檔案內容後儲存
 *  4. 點「部署」→「新增部署作業」
 *  5. 類型：網頁應用程式
 *  6. 執行身分：我 (cowell.design.department@gmail.com) / 存取權：知道連結的任何人
 *  7. 部署並完成授權（若出現未驗證警告，點「進階」→「前往未驗證的應用程式」）
 *  8. 複製產生的「網路應用程式 URL」（/exec 結尾）
 *  9. 把 URL 分別貼到 Jimmy.html / Joey.html / Cat.html / Mavis.html 的「設定雲端」對話框
 *
 * 修改本檔後，記得「管理部署作業」→ 鉛筆圖示 → 版本選「新版本」→ 部署，才會生效。
 *
 * 資料表結構：
 *  date | author | status | rowOrder | category | case | type | assigned | dueDate |
 *  startDate | doneDate | estHours | todayHours | plugin | progress | note |
 *  submittedAt | updatedAt
 */

const SHEET_NAME = '工作日報';
const HEADERS = [
  'date', 'author', 'status', 'rowOrder',
  'category', 'case', 'type',
  'assigned', 'dueDate', 'startDate', 'doneDate',
  'estHours', 'todayHours', 'plugin', 'progress', 'note',
  'submittedAt', 'updatedAt'
];

function getOrCreateSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#1f4e79').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    const widths = [90, 70, 70, 60, 90, 160, 60, 90, 90, 90, 90, 70, 70, 60, 60, 240, 140, 140];
    widths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));
  }
  // 強制日期欄為純文字，避免被自動轉型
  ['A:A', 'H:H', 'I:I', 'J:J', 'K:K'].forEach(r => sheet.getRange(r).setNumberFormat('@'));
  return sheet;
}

function normalizeDate_(v) {
  if (v == null || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }
  const s = String(v).trim();
  const m1 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m1) return m1[1] + '-' + m1[2].padStart(2, '0') + '-' + m1[3].padStart(2, '0');
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  return s;
}

function nowIso_() {
  const tz = Session.getScriptTimeZone() || 'Asia/Taipei';
  return Utilities.formatDate(new Date(), tz, "yyyy-MM-dd HH:mm:ss");
}

function rowToItem_(row) {
  return {
    date:        normalizeDate_(row[0]),
    author:      String(row[1] || ''),
    status:      String(row[2] || 'draft'),
    rowOrder:    row[3] === '' || row[3] === null ? 0 : Number(row[3]),
    category:    String(row[4] || ''),
    case:        String(row[5] || ''),
    type:        String(row[6] || ''),
    assigned:    String(row[7] || ''),
    dueDate:     String(row[8] || ''),
    startDate:   String(row[9] || ''),
    doneDate:    String(row[10] || ''),
    estHours:    row[11] === '' || row[11] === null ? '' : row[11],
    todayHours:  row[12] === '' || row[12] === null ? '' : row[12],
    plugin:      String(row[13] || ''),
    progress:    row[14] === '' || row[14] === null ? '' : row[14],
    note:        String(row[15] || ''),
    submittedAt: String(row[16] || ''),
    updatedAt:   String(row[17] || '')
  };
}

function itemToRow_(it) {
  return [
    normalizeDate_(it.date),
    it.author || '',
    it.status || 'draft',
    it.rowOrder == null ? 0 : Number(it.rowOrder),
    it.category || '',
    it.case || '',
    it.type || '',
    it.assigned || '',
    it.dueDate || '',
    it.startDate || '',
    it.doneDate || '',
    (it.estHours === '' || it.estHours == null) ? '' : it.estHours,
    (it.todayHours === '' || it.todayHours == null) ? '' : it.todayHours,
    it.plugin || '',
    (it.progress === '' || it.progress == null) ? '' : it.progress,
    it.note || '',
    it.submittedAt || '',
    it.updatedAt || ''
  ];
}

/**
 * 讀取一位作者的全部日報，依日期分組
 * 結構：{ "2026-05-18": { status, submittedAt, updatedAt, items: [...] }, ... }
 */
function readByAuthor_(author) {
  const sheet = getOrCreateSheet_();
  const last = sheet.getLastRow();
  if (last < 2) return {};
  const data = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  const out = {};
  for (const row of data) {
    const it = rowToItem_(row);
    if (!it.date) continue;
    if (author && it.author !== author) continue;
    if (!out[it.date]) {
      out[it.date] = {
        status: it.status || 'draft',
        submittedAt: it.submittedAt || '',
        updatedAt: it.updatedAt || '',
        items: []
      };
    }
    // 同一張日報，submittedAt/updatedAt 取最新非空值
    if (it.submittedAt && !out[it.date].submittedAt) out[it.date].submittedAt = it.submittedAt;
    if (it.updatedAt) out[it.date].updatedAt = it.updatedAt;
    if (it.status === 'submitted') out[it.date].status = 'submitted';
    out[it.date].items.push({
      rowOrder: it.rowOrder,
      category: it.category,
      case: it.case,
      type: it.type,
      assigned: it.assigned,
      dueDate: it.dueDate,
      startDate: it.startDate,
      doneDate: it.doneDate,
      estHours: it.estHours,
      todayHours: it.todayHours,
      plugin: it.plugin,
      progress: it.progress,
      note: it.note
    });
  }
  // 依 rowOrder 排序每張日報內的項目
  Object.keys(out).forEach(k => {
    out[k].items.sort((a, b) => (a.rowOrder || 0) - (b.rowOrder || 0));
  });
  return out;
}

/**
 * 移除指定 author + date 的所有列
 * 從最後一列往上掃，遇到符合的就 deleteRow，避免索引偏移
 */
function deleteAuthorDate_(sheet, author, date) {
  const last = sheet.getLastRow();
  if (last < 2) return;
  const data = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  for (let i = data.length - 1; i >= 0; i--) {
    const row = data[i];
    if (normalizeDate_(row[0]) === date && String(row[1]) === author) {
      sheet.deleteRow(i + 2);
    }
  }
}

/**
 * 寫入一張日報
 * mode: 'save' (暫存=draft) 或 'submit' (送出=submitted)
 * 規則：
 *  - 若該 date+author 在 Sheet 中已為 submitted 狀態，拒絕任何寫入（鎖定）
 *  - 否則先刪除該 date+author 所有舊列，再寫入新列
 */
function writeReport_(author, date, items, mode) {
  if (!author) throw new Error('缺少 author');
  if (!date) throw new Error('缺少 date');
  const normDate = normalizeDate_(date);
  if (!normDate.match(/^\d{4}-\d{2}-\d{2}$/)) throw new Error('日期格式錯誤：' + date);

  const lock = LockService.getDocumentLock();
  lock.waitLock(15000);
  try {
    const sheet = getOrCreateSheet_();

    // 檢查是否已送出（鎖定）
    const last = sheet.getLastRow();
    let existingSubmitted = false;
    let existingSubmittedAt = '';
    if (last >= 2) {
      const data = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
      for (const row of data) {
        if (normalizeDate_(row[0]) === normDate && String(row[1]) === author) {
          if (String(row[2]) === 'submitted') {
            existingSubmitted = true;
            existingSubmittedAt = String(row[16] || '');
            break;
          }
        }
      }
    }
    if (existingSubmitted) {
      throw new Error('此日報已於 ' + existingSubmittedAt + ' 送出並鎖定，無法再修改');
    }

    // 刪除舊資料
    deleteAuthorDate_(sheet, author, normDate);

    const status = mode === 'submit' ? 'submitted' : 'draft';
    const now = nowIso_();
    const submittedAt = mode === 'submit' ? now : '';
    const updatedAt = now;

    const rows = (items || []).map((it, idx) => itemToRow_({
      date: normDate,
      author: author,
      status: status,
      rowOrder: idx,
      category: it.category || '',
      case: it.case || '',
      type: it.type || '',
      assigned: it.assigned || '',
      dueDate: it.dueDate || '',
      startDate: it.startDate || '',
      doneDate: it.doneDate || '',
      estHours: it.estHours,
      todayHours: it.todayHours,
      plugin: it.plugin || '',
      progress: it.progress,
      note: it.note || '',
      submittedAt: submittedAt,
      updatedAt: updatedAt
    }));

    if (rows.length > 0) {
      const startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, rows.length, HEADERS.length).setValues(rows);
      // 日期欄維持文字
      sheet.getRange(startRow, 1, rows.length, 1).setNumberFormat('@');
    }

    return {
      status: status,
      submittedAt: submittedAt,
      updatedAt: updatedAt,
      count: rows.length
    };
  } finally {
    lock.releaseLock();
  }
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const author = params.author || '';
    return jsonOut_({ ok: true, author: author, data: readByAuthor_(author) });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err && err.message || err) });
  }
}

function doPost(e) {
  try {
    const body = e && e.postData && e.postData.contents
      ? JSON.parse(e.postData.contents) : {};
    const action = body.action || 'save';

    if (action === 'ping') {
      return jsonOut_({ ok: true, pong: true });
    }
    if (action === 'load') {
      return jsonOut_({ ok: true, author: body.author || '', data: readByAuthor_(body.author || '') });
    }
    if (action === 'save' || action === 'submit') {
      const result = writeReport_(body.author, body.date, body.items || [], action);
      return jsonOut_({ ok: true, result: result, data: readByAuthor_(body.author) });
    }
    return jsonOut_({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err && err.message || err) });
  }
}
