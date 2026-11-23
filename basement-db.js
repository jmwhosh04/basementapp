// Basement Lab Data Bus, Auth Gate & Supabase Cloud Sync (basement-db.js)
(function (global) {
  'use strict';

  const STORAGE_KEYS = {
    COACH_CONTEXT: 'basement_coach_context',
    LOGS: 'basement_logs',
    CARDIO_LOGS: 'basement_cardio_logs',
    SAUNA_LOGS: 'basement_sauna_logs',
    CUSTOM_CATALOG: 'basement_custom_catalog',
    TRAINER_DIRECTIVES: 'basement_trainer_directives',
    TRAINER_NOTES: 'basement_trainer_notes'
  };

  const DEFAULT_COACH_CONTEXT = {
    birthDate: null,
    heightFeet: null,
    heightInches: null,
    weightLbs: null,
    primaryGoal: {
      title: 'Strength & Conditioning',
      allocation: 100,
      focusArea: 'dynamic_strength',
      durationWeeks: 6,
      currentWeek: 1,
      weeklyTargetSets: 18,
      primaryLifts: [],
      secondaryLifts: []
    },
    secondaryGoal: null,
    mesocyclePhase: 'Accumulation',
    dumbbellCapMode: 'tempo_pause',
    preferences: { favorites: [], banned: [] },
    customCoachingVariables: [],
    sorenessMap: {},
    externalLifeLoads: [],
    activeTemporaryInjuries: [],
    chronicGuardrails: [],
    sleepHours: null,
    targetDurationMin: 25,
    targetDurationMax: 40,
    modalityPreferences: {
      maxConsecutiveLiftDays: 2,
      preventBackToBackRuns: true,
      cardioOptions: ['treadmill', 'rower']
    },
    stepZeroPrimers: []
  };

  let _supabase = null;
  let _session = null;
  let _authReady = false;
  let _isHydrating = false;
  let _hydratedUserId = null;
  const _authListeners = new Set();

  function getSupabaseClient() {
    if (_supabase) return _supabase;
    if (global.supabase && typeof global.supabase.createClient === 'function') {
      const cfg = global.BASEMENT_SUPABASE_CONFIG || {};
      if (cfg.url && cfg.anonKey) {
        _supabase = global.supabase.createClient(cfg.url, cfg.anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        });
      }
    }
    return _supabase;
  }

  function getSession() {
    return _session;
  }

  function getCurrentUser() {
    return _session && _session.user ? _session.user : null;
  }

  function isAuthenticated() {
    return Boolean(_session && _session.user && _session.user.id);
  }

  function isAuthReady() {
    return _authReady;
  }

  function onAuthStateChange(cb) {
    _authListeners.add(cb);
    return () => _authListeners.delete(cb);
  }

  function _emitAuth() {
    const snap = {
      session: _session,
      user: getCurrentUser(),
      authenticated: isAuthenticated(),
      authReady: _authReady
    };
    _authListeners.forEach((fn) => {
      try {
        fn(snap);
      } catch (e) {
        console.error('Auth listener error:', e);
      }
    });
  }

  function readJson(key, fallback) {
    try {
      const raw = global.localStorage.getItem(key);
      if (!raw) return typeof fallback === 'function' ? fallback() : JSON.parse(JSON.stringify(fallback));
      return JSON.parse(raw);
    } catch (_e) {
      return typeof fallback === 'function' ? fallback() : JSON.parse(JSON.stringify(fallback));
    }
  }

  function writeJson(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('localStorage write error for', key, e);
    }
  }

  function _userSnapshotKey(userId) {
    return `basement_user_cache_${userId}`;
  }

  function hasAnyLocalWorkoutData() {
    const logs = readJson(STORAGE_KEYS.LOGS, []);
    const cardio = readJson(STORAGE_KEYS.CARDIO_LOGS, []);
    const sauna = readJson(STORAGE_KEYS.SAUNA_LOGS, []);
    return (
      (Array.isArray(logs) && logs.length > 0) ||
      (Array.isArray(cardio) && cardio.length > 0) ||
      (Array.isArray(sauna) && sauna.length > 0)
    );
  }

  function saveUserCacheSnapshot(userId) {
    if (!userId) return;
    const payload = {
      savedAt: new Date().toISOString(),
      coachContext: readJson(STORAGE_KEYS.COACH_CONTEXT, DEFAULT_COACH_CONTEXT),
      logs: readJson(STORAGE_KEYS.LOGS, []),
      cardioLogs: readJson(STORAGE_KEYS.CARDIO_LOGS, []),
      saunaLogs: readJson(STORAGE_KEYS.SAUNA_LOGS, []),
      trainerDirectives: readJson(STORAGE_KEYS.TRAINER_DIRECTIVES, null),
      trainerNotes: readJson(STORAGE_KEYS.TRAINER_NOTES, [])
    };
    writeJson(_userSnapshotKey(userId), payload);
  }

  function restoreOrResetUserState(userId) {
    if (!userId) return;
    const snap = readJson(_userSnapshotKey(userId), null);
    if (snap && snap.coachContext) {
      writeJson(STORAGE_KEYS.COACH_CONTEXT, { ...DEFAULT_COACH_CONTEXT, ...snap.coachContext });
      writeJson(STORAGE_KEYS.LOGS, Array.isArray(snap.logs) ? snap.logs : []);
      writeJson(STORAGE_KEYS.CARDIO_LOGS, Array.isArray(snap.cardioLogs) ? snap.cardioLogs : []);
      writeJson(STORAGE_KEYS.SAUNA_LOGS, Array.isArray(snap.saunaLogs) ? snap.saunaLogs : []);
      writeJson(STORAGE_KEYS.TRAINER_DIRECTIVES, snap.trainerDirectives || null);
      writeJson(STORAGE_KEYS.TRAINER_NOTES, Array.isArray(snap.trainerNotes) ? snap.trainerNotes : []);
    } else if (hasAnyLocalWorkoutData()) {
      // Preserve existing browser workout/cardio/sauna logs and migrate into user snapshot
      const ctx = readJson(STORAGE_KEYS.COACH_CONTEXT, DEFAULT_COACH_CONTEXT);
      writeJson(STORAGE_KEYS.COACH_CONTEXT, { ...DEFAULT_COACH_CONTEXT, ...ctx });
      saveUserCacheSnapshot(userId);
    } else {
      writeJson(STORAGE_KEYS.COACH_CONTEXT, DEFAULT_COACH_CONTEXT);
      writeJson(STORAGE_KEYS.LOGS, []);
      writeJson(STORAGE_KEYS.CARDIO_LOGS, []);
      writeJson(STORAGE_KEYS.SAUNA_LOGS, []);
      writeJson(STORAGE_KEYS.TRAINER_DIRECTIVES, null);
      writeJson(STORAGE_KEYS.TRAINER_NOTES, []);
    }
  }

  function clearActiveUserLocalState() {
    [
      STORAGE_KEYS.COACH_CONTEXT,
      STORAGE_KEYS.LOGS,
      STORAGE_KEYS.CARDIO_LOGS,
      STORAGE_KEYS.SAUNA_LOGS,
      STORAGE_KEYS.TRAINER_DIRECTIVES,
      STORAGE_KEYS.TRAINER_NOTES
    ].forEach((k) => {
      try {
        global.localStorage.removeItem(k);
      } catch (_e) {}
    });
  }

  async function _fetchRowsFromTable(client, tableName, userId) {
    try {
      const { data, error } = await client
        .from(tableName)
        .select('*')
        .eq('user_id', userId);
      if (error || !Array.isArray(data)) return [];
      return data;
    } catch (_e) {
      return [];
    }
  }

  function _normalizeLogEntries(rows) {
    return rows
      .map((r) => {
        if (!r) return null;
        if (r.entry && typeof r.entry === 'object') return r.entry;
        if (r.payload && typeof r.payload === 'object') return r.payload;
        return r;
      })
      .filter(Boolean);
  }

  async function hydrateUserFromCloud(userId, force = false) {
    const client = getSupabaseClient();
    if (!client || !userId) return;
    if (_isHydrating) return;
    if (!force && _hydratedUserId === userId) return;

    _isHydrating = true;
    try {
      // Check coach_contexts or legacy user_state
      let cloudContext = null;
      const ctxRows = await _fetchRowsFromTable(client, 'coach_contexts', userId);
      if (ctxRows.length > 0 && ctxRows[0].payload) {
        cloudContext = ctxRows[0].payload;
      } else {
        const legacyStateRows = await _fetchRowsFromTable(client, 'user_state', userId);
        if (legacyStateRows.length > 0) {
          const row = legacyStateRows[0];
          cloudContext = row.payload || row.coach_context || row.state || null;
        }
      }
      if (cloudContext) {
        const localCtx = readJson(STORAGE_KEYS.COACH_CONTEXT, DEFAULT_COACH_CONTEXT);
        writeJson(STORAGE_KEYS.COACH_CONTEXT, { ...DEFAULT_COACH_CONTEXT, ...localCtx, ...cloudContext });
      }

      // Check workout_logs or legacy strength_logs; do not wipe local logs if cloud table is empty
      let strengthRows = await _fetchRowsFromTable(client, 'workout_logs', userId);
      if (strengthRows.length === 0) {
        strengthRows = await _fetchRowsFromTable(client, 'strength_logs', userId);
      }
      const cloudLogs = _normalizeLogEntries(strengthRows);
      const localLogs = readJson(STORAGE_KEYS.LOGS, []);
      if (cloudLogs.length > 0) {
        writeJson(STORAGE_KEYS.LOGS, cloudLogs);
      } else if (Array.isArray(localLogs) && localLogs.length > 0) {
        writeJson(STORAGE_KEYS.LOGS, localLogs);
      }

      const cardioRows = await _fetchRowsFromTable(client, 'cardio_logs', userId);
      const cloudCardio = _normalizeLogEntries(cardioRows);
      const localCardio = readJson(STORAGE_KEYS.CARDIO_LOGS, []);
      if (cloudCardio.length > 0) {
        writeJson(STORAGE_KEYS.CARDIO_LOGS, cloudCardio);
      } else if (Array.isArray(localCardio) && localCardio.length > 0) {
        writeJson(STORAGE_KEYS.CARDIO_LOGS, localCardio);
      }

      const saunaRows = await _fetchRowsFromTable(client, 'sauna_logs', userId);
      const cloudSauna = _normalizeLogEntries(saunaRows);
      const localSauna = readJson(STORAGE_KEYS.SAUNA_LOGS, []);
      if (cloudSauna.length > 0) {
        writeJson(STORAGE_KEYS.SAUNA_LOGS, cloudSauna);
      } else if (Array.isArray(localSauna) && localSauna.length > 0) {
        writeJson(STORAGE_KEYS.SAUNA_LOGS, localSauna);
      }

      // Merge shared custom_catalog non-destructively
      try {
        const { data: catalogRows } = await client
          .from('custom_catalog')
          .select('exercise_key, item');
        if (Array.isArray(catalogRows) && catalogRows.length > 0) {
          const localCat = readJson(STORAGE_KEYS.CUSTOM_CATALOG, {});
          const merged = { ...localCat };
          catalogRows.forEach((row) => {
            if (row && row.item && row.item.id) {
              merged[row.item.id] = { ...(merged[row.item.id] || {}), ...row.item };
            }
          });
          writeJson(STORAGE_KEYS.CUSTOM_CATALOG, merged);
        }
      } catch (_e) {}

      saveUserCacheSnapshot(userId);
      _hydratedUserId = userId;
      notifyFrames('storage');
    } catch (err) {
      console.warn('Cloud hydration warning:', err);
    } finally {
      _isHydrating = false;
    }
  }

  async function syncCoachContextToCloud(contextObj) {
    const user = getCurrentUser();
    if (!user || !user.id) return;
    saveUserCacheSnapshot(user.id);
    const client = getSupabaseClient();
    if (!client) return;
    const { error } = await client.from('coach_contexts').upsert(
      {
        user_id: user.id,
        payload: contextObj,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id' }
    );
    if (error) console.warn('coach_contexts upsert error:', error.message);
  }

  async function syncCustomCatalogItemToCloud(item) {
    const user = getCurrentUser();
    if (!user || !user.id || !item || !item.id) return;
    const client = getSupabaseClient();
    if (!client) return;
    const cleanId = String(item.id).replace(/[^a-zA-Z0-9_-]/g, '_');
    const exerciseKey = `${user.id.slice(0, 8)}_${cleanId}`;
    const { error } = await client.from('custom_catalog').upsert(
      {
        exercise_key: exerciseKey,
        owner_user_id: user.id,
        item,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'exercise_key' }
    );
    if (error) console.warn('custom_catalog upsert error:', error.message);
  }

  async function uploadCatalogImage(userId, exerciseName, stage, dataUrl) {
    const client = getSupabaseClient();
    if (!client || !userId || !dataUrl) return dataUrl;
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const safeName = String(exerciseName || 'lift')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const path = `${userId}/${safeName}-${stage}-${Date.now()}.jpg`;
    const { error } = await client.storage
      .from('exercise-images')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
    const { data } = client.storage.from('exercise-images').getPublicUrl(path);
    return data && data.publicUrl ? data.publicUrl : dataUrl;
  }

  async function signInWithGoogle() {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client is not configured. Check BASEMENT_SUPABASE_CONFIG.');
    }
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: global.location.origin + global.location.pathname
      }
    });
    if (error) throw error;
    return data;
  }

  async function signInWithEmailPassword(email, password) {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client is not configured. Check BASEMENT_SUPABASE_CONFIG.');
    }
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    const prevUser = getCurrentUser();
    if (prevUser && prevUser.id) {
      saveUserCacheSnapshot(prevUser.id);
    }
    _hydratedUserId = null;
    clearActiveUserLocalState();
    const client = getSupabaseClient();
    if (client) {
      await client.auth.signOut();
    }
    _session = null;
    _authReady = true;
    _emitAuth();
  }

  function notifyFrames(eventName = 'storage') {
    try {
      global.dispatchEvent(new Event(eventName));
      const frames = document.querySelectorAll('iframe');
      frames.forEach((frame) => {
        try {
          if (frame.contentWindow) {
            frame.contentWindow.dispatchEvent(new Event(eventName));
          }
        } catch (_e) {}
      });
    } catch (_e) {}
  }

  async function initAuth() {
    const client = getSupabaseClient();
    if (!client || !client.auth) {
      _session = null;
      _authReady = true;
      _emitAuth();
      return null;
    }

    const { data } = await client.auth.getSession();
    _session = data && data.session ? data.session : null;
    if (_session && _session.user) {
      restoreOrResetUserState(_session.user.id);
      await hydrateUserFromCloud(_session.user.id, false);
    }
    _authReady = true;
    _emitAuth();

    client.auth.onAuthStateChange(async (event, nextSession) => {
      const prevUserId = _session && _session.user ? _session.user.id : null;
      const nextUserId = nextSession && nextSession.user ? nextSession.user.id : null;

      if (event === 'SIGNED_OUT' || !nextUserId) {
        if (prevUserId) saveUserCacheSnapshot(prevUserId);
        _hydratedUserId = null;
        clearActiveUserLocalState();
        _session = null;
        _authReady = true;
        _emitAuth();
        return;
      }

      if (prevUserId && prevUserId !== nextUserId) {
        saveUserCacheSnapshot(prevUserId);
        _hydratedUserId = null;
      }

      _session = nextSession;
      restoreOrResetUserState(nextUserId);
      _authReady = true;
      _emitAuth();
      await hydrateUserFromCloud(nextUserId, prevUserId !== nextUserId);
    });

    return _session;
  }

  global.BasementDB = {
    STORAGE_KEYS,
    DEFAULT_COACH_CONTEXT,
    getSupabaseClient,
    initAuth,
    getSession,
    getCurrentUser,
    isAuthenticated,
    isAuthReady,
    onAuthStateChange,
    signInWithGoogle,
    signInWithEmailPassword,
    signOut,
    readJson,
    writeJson,
    hydrateUserFromCloud,
    syncCoachContextToCloud,
    syncCustomCatalogItemToCloud,
    uploadCatalogImage,
    notifyFrames
  };
})(window);
