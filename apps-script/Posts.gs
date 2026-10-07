/**
 * Posts.gs — "Post Master" sheet: custom job posts added from the app's
 * Hiring Tracker dropdown, so new posts don't need a code change.
 */

var POST_MASTER_SHEET = 'Post Master';

function getPostMasterSheet(ss) {
  var sheet = ss.getSheetByName(POST_MASTER_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(POST_MASTER_SHEET);
    sheet.appendRow(['Post', 'Added On']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getPosts(ss) {
  var sheet = ss.getSheetByName(POST_MASTER_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues()
    .map(function(r) { return r[0].toString().trim(); })
    .filter(function(p) { return p; });
}

function addPost(ss, post) {
  var name = (post || '').toString().trim();
  if (!name) return { success: false, error: 'Post name is required' };

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var exists = getPosts(ss).some(function(p) { return p.toLowerCase() === name.toLowerCase(); });
    if (exists) return { success: true, post: name, existed: true };

    var sheet = getPostMasterSheet(ss);
    sheet.appendRow([name, '']);
    setIstDateTimeValue(sheet.getRange(sheet.getLastRow(), 2));
    return { success: true, post: name };
  } finally {
    lock.releaseLock();
  }
}
