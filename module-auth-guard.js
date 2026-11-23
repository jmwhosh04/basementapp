// Enforces authentication even when opening a standalone module HTML directly
(function (global) {
  'use strict';

  async function requireAuthenticatedModule() {
    let parentAuthed = false;
    try {
      if (global.parent && global.parent !== global && global.parent.BasementDB) {
        if (!global.parent.BasementDB.isAuthReady()) {
          await global.parent.BasementDB.initAuth();
        }
        parentAuthed = Boolean(global.parent.BasementDB.isAuthenticated());
      }
    } catch (_e) {}

    if (parentAuthed) return true;

    if (!global.BasementDB) return false;
    if (!global.BasementDB.isAuthReady()) {
      await global.BasementDB.initAuth();
    }
    if (!global.BasementDB.isAuthenticated()) {
      // Never redirect inside an iframe (prevents nested app inside tab)
      if (global.parent && global.parent !== global) {
        return false;
      }
      const target = './index.html';
      if (!global.location.pathname.endsWith('/index.html') && !global.location.pathname.endsWith('index.html')) {
        global.location.replace(target);
      }
      return false;
    }
    return true;
  }

  global.BasementAuthGuard = { requireAuthenticatedModule };
})(window);
