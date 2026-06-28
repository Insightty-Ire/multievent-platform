// ============================================================
//  GOC 2026 — Google Sheets ↔ Supabase Two-Way Sync
//  Paste into your Google Form's linked spreadsheet:
//  Extensions → Apps Script
// ============================================================

function getConfig() {
  var props = PropertiesService.getScriptProperties();
  return {
    url: props.getProperty('SUPABASE_URL'),
    key: props.getProperty('SUPABASE_KEY')
  };
}

var COLUMN_MAP = {
  'first name':    'first_name',
  'firstname':     'first_name',
  'surname':       'surname',
  'last name':     'surname',
  'other names':   'other_names',
  'gender':        'gender',
  'age':           'age',
  'phone number':  'phone',
  'phone':         'phone',
  'province':      'province',
  'email address': 'email',
  'email':         'email',
};

// ── GOOGLE FORM → SUPABASE ────────────────────────────────────
// Fires automatically on every new form submission
function onFormSubmit(e) {
  try {
    var config = getConfig();
    if (!config.url || !config.key) {
      Logger.log('ERROR: Script Properties not set.');
      return;
    }

    var sheet   = e.range.getSheet();
    var sheetRow = e.range.rowStart; // exact row number in the sheet
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var row     = e.values;

    // Build Supabase record
    var record = { sheet_row: sheetRow };
    for (var i = 0; i < headers.length; i++) {
      var header = String(headers[i]).toLowerCase().trim();
      var mapped = COLUMN_MAP[header];
      if (!mapped) continue;
      var val = String(row[i] || '').trim();
      if (!val) continue;
      if (mapped === 'age') {
        var parsed = parseInt(val, 10);
        if (!isNaN(parsed)) record[mapped] = parsed;
      } else {
        record[mapped] = val;
      }
    }

    if (!record.first_name && !record.surname) {
      Logger.log('Skipped: no name found.');
      return;
    }

    var response = UrlFetchApp.fetch(config.url + '/rest/v1/registrants', {
      method: 'post',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        config.key,
        'Authorization': 'Bearer ' + config.key,
        'Prefer':        'return=minimal',
      },
      payload:            JSON.stringify(record),
      muteHttpExceptions: true,
    });

    var code = response.getResponseCode();
    if (code === 201 || code === 200) {
      Logger.log('Synced row ' + sheetRow + ': ' + record.first_name + ' ' + record.surname);
    } else {
      Logger.log('ERROR ' + code + ': ' + response.getContentText());
    }

  } catch (err) {
    Logger.log('EXCEPTION in onFormSubmit: ' + err.toString());
  }
}

// ── SUPABASE → GOOGLE SHEET (BATCH) ──────────────────────────
// Runs every 5 minutes via time trigger (see createBatchSyncTrigger).
// Fetches ALL checked-in records from Supabase and writes them
// to the sheet in one batch — much faster than a webhook firing
// on every single check-in.
function batchSyncCheckins() {
  try {
    var config = getConfig();
    if (!config.url || !config.key) { Logger.log('ERROR: Script Properties not set.'); return; }

    var res = UrlFetchApp.fetch(
      config.url + '/rest/v1/registrants?checkin_status=eq.Checked In&sheet_row=not.is.null&select=sheet_row,checkin_status,checkin_time,checked_in_by',
      {
        headers: { 'apikey': config.key, 'Authorization': 'Bearer ' + config.key },
        muteHttpExceptions: true,
      }
    );

    if (res.getResponseCode() !== 200) {
      Logger.log('Fetch failed: ' + res.getContentText()); return;
    }

    var records = JSON.parse(res.getContentText());
    if (!records.length) { Logger.log('No checked-in records to sync.'); return; }

    var sheet   = SpreadsheetApp.getActiveSheet();
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    var statusCol = -1, timeCol = -1, byCol = -1;
    for (var i = 0; i < headers.length; i++) {
      var h = String(headers[i]).toLowerCase().trim();
      if (h === 'check-in status') statusCol = i + 1;
      if (h === 'check-in time')   timeCol   = i + 1;
      if (h === 'checked in by')   byCol     = i + 1;
    }

    if (statusCol === -1 || timeCol === -1 || byCol === -1) {
      Logger.log('Check-in columns not found.'); return;
    }

    records.forEach(function(r) {
      if (!r.sheet_row) return;
      var row = parseInt(r.sheet_row, 10);
      sheet.getRange(row, statusCol).setValue(r.checkin_status || '');
      sheet.getRange(row, timeCol).setValue(r.checkin_time || '');
      sheet.getRange(row, byCol).setValue(r.checked_in_by || '');
    });

    SpreadsheetApp.flush();
    Logger.log('Batch sync complete — ' + records.length + ' records updated.');

  } catch (err) {
    Logger.log('EXCEPTION batchSyncCheckins: ' + err.toString());
  }
}

// ── SET UP THE 5-MINUTE TRIGGER ───────────────────────────────
// Run this function ONCE manually. It creates the time trigger
// automatically — you don't need to add it via the Triggers UI.
function createBatchSyncTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'batchSyncCheckins') ScriptApp.deleteTrigger(t);
  });

  ScriptApp.newTrigger('batchSyncCheckins')
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log('Trigger created — batchSyncCheckins will now run every 5 minutes.');
}

// ── BACKFILL ──────────────────────────────────────────────────
// Run once to push all existing sheet rows to Supabase.
function backfillAllRows() {
  var config = getConfig();
  if (!config.url || !config.key) {
    Logger.log('ERROR: Script Properties not set.');
    return;
  }

  var sheet   = SpreadsheetApp.getActiveSheet();
  var data    = sheet.getDataRange().getValues();
  var headers = data[0];
  var success = 0, skipped = 0, failed = 0;

  for (var i = 1; i < data.length; i++) {
    var row    = data[i];
    var record = { sheet_row: i + 1 }; // i+1 because row 1 is the header

    for (var j = 0; j < headers.length; j++) {
      var header = String(headers[j]).toLowerCase().trim();
      var mapped = COLUMN_MAP[header];
      if (!mapped) continue;
      var val = String(row[j] || '').trim();
      if (!val) continue;
      if (mapped === 'age') {
        var parsed = parseInt(val, 10);
        if (!isNaN(parsed)) record[mapped] = parsed;
      } else {
        record[mapped] = val;
      }
    }

    if (!record.first_name && !record.surname) { skipped++; continue; }

    var response = UrlFetchApp.fetch(config.url + '/rest/v1/registrants', {
      method: 'post',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        config.key,
        'Authorization': 'Bearer ' + config.key,
        'Prefer':        'return=minimal',
      },
      payload:            JSON.stringify(record),
      muteHttpExceptions: true,
    });

    if (response.getResponseCode() === 201) success++;
    else { failed++; Logger.log('Row ' + (i+1) + ' failed: ' + response.getContentText()); }

    Utilities.sleep(100);
  }

  Logger.log('Done — Success: ' + success + ', Skipped: ' + skipped + ', Failed: ' + failed);
}

// ── TEST ──────────────────────────────────────────────────────
function testConnection() {
  var config = getConfig();
  if (!config.url || !config.key) {
    Logger.log('ERROR: Script Properties not set. See setup instructions.');
    return;
  }
  var response = UrlFetchApp.fetch(config.url + '/rest/v1/registrants?limit=1', {
    headers: {
      'apikey':        config.key,
      'Authorization': 'Bearer ' + config.key,
    },
    muteHttpExceptions: true,
  });
  Logger.log('Status: ' + response.getResponseCode());
  Logger.log('Response: ' + response.getContentText());
}
