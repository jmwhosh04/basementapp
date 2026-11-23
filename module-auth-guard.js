// Enforces authentication even when opening a standalone module HTML directly
(function (global) {
  'use strict';

  async function requireAuthenticatedModule() {
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
