// Fast auth guard for standalone modules (checks parent shell first to avoid flash on tab switch)
(function (global) {
  'use strict';

  async function requireAuthenticatedModule() {
    try {
      if (global.parent && global.parent !== global && global.parent.BasementDB) {
        if (global.parent.BasementDB.isAuthReady() && global.parent.BasementDB.isAuthenticated()) {
          return true;
        }
      }
    } catch (_e) {}

    if (!global.BasementDB) return false;
    if (!global.BasementDB.isAuthReady()) {
      await global.BasementDB.initAuth();
    }
    if (!global.BasementDB.isAuthenticated()) {
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
