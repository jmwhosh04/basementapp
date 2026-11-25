// Basement Lab Data Bus, Auth Gate & Supabase Cloud Sync (basement-db.js)
// Enforces exact public table schemas & composite PKs:
// - strength_logs (user_id, id)
// - cardio_logs (user_id, id)
// - sauna_logs (user_id, id)
// - trainer_notes (user_id, id)
// - custom_catalog (owner_id, id)
// - user_state (user_id, key)
(function (global) {
  'use strict';

  const DEFAULT_SUPABASE_CONFIG = {
    url: 'https://flroxptovfxuzwpoyisf.supabase.co',
    anonKey: 'sb_publishable_tsAgCyDK0xMchdMW4lH8BA_rys4KouJ'
  };

  const STORAGE_KEYS = {
    COACH_CONTEXT: 'basement_coach_context',
    LOGS: 'basement_logs',
    CARDIO_LOGS: 'basement_cardio_logs',
    SAUNA_LOGS: 'basement_sauna_logs',
    CUSTOM_CATALOG: 'basement_custom_catalog',
    TRAINER_DIRECTIVES: 'basement_trainer_directives',
    TRAINER_NOTES: 'basement_trainer_notes'
  };

  const TOMBSTONE_KEY = 'basement_deleted_ids_v1';

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
      weeklyTargetSets: 45,
      targetMuscleGroups: ['Lower', 'Upper Push', 'Upper Pull', 'Shoulders', 'Core'],
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
    trainingPreferences: [],
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
  let _hydratePromise = null;
  let _hydratedUserId = null;
  const _authListeners = new Set();

  function _localTodayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function _resolveConfig() {
    if (global.BASEMENT_SUPABASE_CONFIG && global.BASEMENT_SUPABASE_CONFIG.url && global.BASEMENT_SUPABASE_CONFIG.anonKey) {
      return global.BASEMENT_SUPABASE_CONFIG;
    }
    try {
      if (global.parent && global.parent !== global && global.parent.BASEMENT_SUPABASE_CONFIG) {
        const pCfg = global.parent.BASEMENT_SUPABASE_CONFIG;
        if (pCfg.url && pCfg.anonKey) return pCfg;
      }
    } catch (_e) {}
    return DEFAULT_SUPABASE_CONFIG;
  }

  function getSupabaseClient() {
    if (_supabase) return _supabase;
    if (global.supabase && typeof global.supabase.createClient === 'function') {
      const cfg = _resolveConfig();
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

  function _getParentSession() {
    try {
      if (global.parent && global.parent !== global && global.parent.BasementDB) {
        return global.parent.BasementDB.getSession();
      }
    } catch (_e) {}
    return null;
  }

  function getSession() {
    return _session || _getParentSession();
  }

  function getCurrentUser() {
    const s = getSession();
    return s && s.user ? s.user : null;
  }

  function isAuthenticated() {
    const u = getCurrentUser();
    return Boolean(u && u.id);
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
      session: getSession(),
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
    const serialized = JSON.stringify(value);
    try {
      global.localStorage.setItem(key, serialized);
      return true;
    } catch (e) {
      console.warn('localStorage write error for', key, e);
      // Evict stale per-user cache snapshots if quota is tight and retry once
      try {
        const currentUid = getCurrentUser() && getCurrentUser().id;
        Object.keys(global.localStorage).forEach((k) => {
          if (k.startsWith('basement_user_cache_') && (!currentUid || !k.endsWith(currentUid))) {
            global.localStorage.removeItem(k);
          }
        });
        global.localStorage.setItem(key, serialized);
        return true;
      } catch (_retryErr) {
        return false;
      }
    }
  }

  // Explicit deletion tombstones so partial local state never wipes cloud rows on other devices
  function _readTombstones() {
    return readJson(TOMBSTONE_KEY, {
      strength_logs: [],
      cardio_logs: [],
      sauna_logs: [],
      trainer_notes: []
    });
  }

  function _writeTombstones(obj) {
    writeJson(TOMBSTONE_KEY, obj);
  }

  function markRecordDeleted(tableName, id) {
    if (!tableName || !id) return;
    const map = _readTombstones();
    const list = Array.isArray(map[tableName]) ? map[tableName] : [];
    const strId = String(id);
    if (!list.includes(strId)) {
      list.push(strId);
      map[tableName] = list.slice(-500);
      _writeTombstones(map);
    }
  }

  function _clearTombstones(tableName, deletedIds) {
    if (!tableName || !Array.isArray(deletedIds) || deletedIds.length === 0) return;
    const dropSet = new Set(deletedIds.map(String));
    const map = _readTombstones();
    if (Array.isArray(map[tableName])) {
      map[tableName] = map[tableName].filter((id) => !dropSet.has(String(id)));
      _writeTombstones(map);
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
      STORAGE_KEYS.TRAINER_NOTES,
      TOMBSTONE_KEY
    ].forEach((k) => {
      try {
        global.localStorage.removeItem(k);
      } catch (_e) {}
    });
  }

  async function _fetchRowsByUserId(client, tableName, userId) {
    try {
      const { data, error } = await client
        .from(tableName)
        .select('*')
        .eq('user_id', userId);
      if (error) {
        console.warn(`${tableName} select error:`, error.message);
        return [];
      }
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn(`${tableName} fetch exception:`, e);
      return [];
    }
  }

  function _normalizeStrengthRow(r) {
    if (!r) return null;
    const extra = r.extra && typeof r.extra === 'object' ? r.extra : {};
    return {
      ...extra,
      id: String(r.id),
      date: r.date,
      exercise: r.exercise,
      weight: r.weight != null ? Number(r.weight) : 0,
      bandLevel: r.band_level || extra.bandLevel || null,
      reps: r.reps != null ? Number(r.reps) : 10,
      rpe: r.rpe != null ? Number(r.rpe) : 8.0,
      durationSec: r.duration_sec != null ? Number(r.duration_sec) : (extra.durationSec ?? null),
      secPerRep: r.sec_per_rep != null ? Number(r.sec_per_rep) : (extra.secPerRep ?? null),
      selectionSource: extra.selectionSource || 'legacy',
      prescribedWeight: extra.prescribedWeight != null ? Number(extra.prescribedWeight) : null,
      prescribedReps: extra.prescribedReps != null ? Number(extra.prescribedReps) : null,
      prescribedRpe: extra.prescribedRpe != null ? Number(extra.prescribedRpe) : null,
      prescribedRestSec: extra.prescribedRestSec != null ? Number(extra.prescribedRestSec) : null
    };
  }

  function _normalizeCardioRow(r) {
    if (!r) return null;
    const extra = r.extra && typeof r.extra === 'object' ? r.extra : {};
    return {
      ...extra,
      id: String(r.id),
      date: r.date,
      modality: r.modality,
      duration: r.duration != null ? Number(r.duration) : 30,
      distance: r.distance != null ? Number(r.distance) : null,
      incline: r.incline != null ? Number(r.incline) : 0,
      resistance: r.resistance != null ? Number(r.resistance) : null,
      meters: r.meters != null ? Number(r.meters) : null,
      rpe: r.rpe != null ? Number(r.rpe) : 7.5
    };
  }

  function _normalizeSaunaRow(r) {
    if (!r) return null;
    const extra = r.extra && typeof r.extra === 'object' ? r.extra : {};
    return {
      ...extra,
      id: String(r.id),
      date: r.date,
      duration: r.duration != null ? Number(r.duration) : 20,
      type: r.type || 'Traditional Dry Sauna',
      timing: r.timing || 'Post-Lift'
    };
  }

  function _normalizeTrainerNoteRow(r) {
    if (!r) return null;
    const extra = r.extra && typeof r.extra === 'object' ? r.extra : {};
    return {
      ...extra,
      id: String(r.id),
      date: r.date,
      phase: r.note_type || extra.phase || 'pre_workout',
      transcript: r.content || extra.transcript || '',
      time: extra.time || '',
      aiReply: extra.aiReply || ''
    };
  }

  function _mergeById(cloudList, localList, tombstoneIds = []) {
    const deletedSet = new Set((tombstoneIds || []).map(String));
    const map = new Map();
    cloudList.forEach((item) => {
      if (item && item.id && !deletedSet.has(String(item.id))) {
        map.set(String(item.id), item);
      }
    });
    if (Array.isArray(localList)) {
      localList.forEach((item) => {
        if (item && item.id && !deletedSet.has(String(item.id)) && !map.has(String(item.id))) {
          map.set(String(item.id), item);
        }
      });
    }
    return Array.from(map.values()).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }

  async function hydrateUserFromCloud(userId, force = false) {
    const client = getSupabaseClient();
    if (!client || !userId) return;
    if (!force && _hydratedUserId === userId) return;
    if (_hydratePromise) {
      await _hydratePromise;
      if (!force && _hydratedUserId === userId) return;
    }

    _hydratePromise = (async () => {
      try {
        const tombstones = _readTombstones();

        // 1. public.user_state (PK: user_id, key) -> key='coach_context' & key='trainer_directives'
        const stateRows = await _fetchRowsByUserId(client, 'user_state', userId);
        const ctxRow = stateRows.find((r) => r.key === 'coach_context');
        if (ctxRow && ctxRow.value && typeof ctxRow.value === 'object') {
          const localCtx = readJson(STORAGE_KEYS.COACH_CONTEXT, DEFAULT_COACH_CONTEXT);
          writeJson(STORAGE_KEYS.COACH_CONTEXT, { ...DEFAULT_COACH_CONTEXT, ...localCtx, ...ctxRow.value });
        }
        const dirRow = stateRows.find((r) => r.key === 'trainer_directives');
        if (dirRow && dirRow.value && typeof dirRow.value === 'object') {
          writeJson(STORAGE_KEYS.TRAINER_DIRECTIVES, dirRow.value);
        }

        // 2. public.strength_logs (PK: user_id, id)
        const strengthRows = await _fetchRowsByUserId(client, 'strength_logs', userId);
        const cloudLogs = strengthRows.map(_normalizeStrengthRow).filter(Boolean);
        const localLogs = readJson(STORAGE_KEYS.LOGS, []);
        if (cloudLogs.length > 0 || (Array.isArray(localLogs) && localLogs.length > 0)) {
          writeJson(STORAGE_KEYS.LOGS, _mergeById(cloudLogs, localLogs, tombstones.strength_logs));
        }

        // 3. public.cardio_logs (PK: user_id, id)
        const cardioRows = await _fetchRowsByUserId(client, 'cardio_logs', userId);
        const cloudCardio = cardioRows.map(_normalizeCardioRow).filter(Boolean);
        const localCardio = readJson(STORAGE_KEYS.CARDIO_LOGS, []);
        if (cloudCardio.length > 0 || (Array.isArray(localCardio) && localCardio.length > 0)) {
          writeJson(STORAGE_KEYS.CARDIO_LOGS, _mergeById(cloudCardio, localCardio, tombstones.cardio_logs));
        }

        // 4. public.sauna_logs (PK: user_id, id)
        const saunaRows = await _fetchRowsByUserId(client, 'sauna_logs', userId);
        const cloudSauna = saunaRows.map(_normalizeSaunaRow).filter(Boolean);
        const localSauna = readJson(STORAGE_KEYS.SAUNA_LOGS, []);
        if (cloudSauna.length > 0 || (Array.isArray(localSauna) && localSauna.length > 0)) {
          writeJson(STORAGE_KEYS.SAUNA_LOGS, _mergeById(cloudSauna, localSauna, tombstones.sauna_logs));
        }

        // 5. public.trainer_notes (PK: user_id, id)
        const noteRows = await _fetchRowsByUserId(client, 'trainer_notes', userId);
        const cloudNotes = noteRows.map(_normalizeTrainerNoteRow).filter(Boolean);
        const localNotes = readJson(STORAGE_KEYS.TRAINER_NOTES, []);
        if (cloudNotes.length > 0 || (Array.isArray(localNotes) && localNotes.length > 0)) {
          writeJson(STORAGE_KEYS.TRAINER_NOTES, _mergeById(cloudNotes, localNotes, tombstones.trainer_notes));
        }

        // 6. public.custom_catalog (PK: owner_id, id) — shared or owned rows
        try {
          const { data: catalogRows, error: catErr } = await client
            .from('custom_catalog')
            .select('id, owner_id, is_shared, data')
            .or(`owner_id.eq.${userId},is_shared.eq.true`);
          if (!catErr && Array.isArray(catalogRows) && catalogRows.length > 0) {
            const localCat = readJson(STORAGE_KEYS.CUSTOM_CATALOG, []);
            const mergedArr = Array.isArray(localCat) ? [...localCat] : [];
            catalogRows.forEach((row) => {
              const item = row && row.data && typeof row.data === 'object' ? row.data : null;
              if (item && item.name) {
                const idx = mergedArr.findIndex((x) => x.name === item.name);
                if (idx >= 0) mergedArr[idx] = { ...mergedArr[idx], ...item };
                else mergedArr.push(item);
              }
            });
            writeJson(STORAGE_KEYS.CUSTOM_CATALOG, mergedArr);
          }
        } catch (_e) {}

        saveUserCacheSnapshot(userId);
        _hydratedUserId = userId;
        notifyFrames('storage');
      } catch (err) {
        console.warn('Cloud hydration warning:', err);
      } finally {
        _hydratePromise = null;
      }
    })();

    await _hydratePromise;
  }

  async function syncCoachContextToCloud(contextObj) {
    const user = getCurrentUser();
    if (!user || !user.id) return { ok: false, reason: 'not_signed_in' };
    saveUserCacheSnapshot(user.id);
    const client = getSupabaseClient();
    if (!client) return { ok: false, reason: 'no_client' };
    const { error } = await client.from('user_state').upsert(
      {
        user_id: user.id,
        key: 'coach_context',
        value: contextObj || {},
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id,key' }
    );
    if (error) {
      console.warn('user_state (coach_context) upsert error:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }

  async function syncTrainerDirectivesToCloud(directivesObj) {
    const user = getCurrentUser();
    if (!user || !user.id || !directivesObj) return { ok: false };
    const client = getSupabaseClient();
    if (!client) return { ok: false };
    const { error } = await client.from('user_state').upsert(
      {
        user_id: user.id,
        key: 'trainer_directives',
        value: directivesObj,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id,key' }
    );
    if (error) {
      console.warn('user_state (trainer_directives) upsert error:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }

  async function syncCustomCatalogItemToCloud(item) {
    const user = getCurrentUser();
    if (!user || !user.id || !item) return { ok: false };
    const itemKey = item.id || item.name;
    if (!itemKey) return { ok: false };
    const client = getSupabaseClient();
    if (!client) return { ok: false };
    const cleanId = String(itemKey).replace(/[^a-zA-Z0-9_-]/g, '_');
    const rowId = `${user.id.slice(0, 8)}_${cleanId}`;
    const { error } = await client.from('custom_catalog').upsert(
      {
        id: rowId,
        owner_id: user.id,
        is_shared: true,
        data: item,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'owner_id,id' }
    );
    if (error) {
      console.warn('custom_catalog upsert error:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }

  // Non-destructive sync: only deletes rows explicitly marked in tombstones so multi-tab/multi-device state is never clobbered
  async function syncLogsToCloud(logsArr, cardioArr, saunaArr, trainerNotesArr) {
    const user = getCurrentUser();
    if (!user || !user.id) return { ok: false, reason: 'not_signed_in' };
    saveUserCacheSnapshot(user.id);
    const client = getSupabaseClient();
    if (!client) return { ok: false, reason: 'no_client' };

    const errors = [];
    const fallbackDate = _localTodayIso();
    const tombstones = _readTombstones();

    // 1. public.strength_logs (PK: user_id, id)
    if (Array.isArray(logsArr)) {
      const keepIds = new Set(logsArr.map((x) => String(x.id)));
      const toDelete = (tombstones.strength_logs || []).filter((id) => id && !keepIds.has(String(id)));
      if (toDelete.length > 0) {
        const { error: delErr } = await client
          .from('strength_logs')
          .delete()
          .eq('user_id', user.id)
          .in('id', toDelete);
        if (delErr) {
          console.warn('strength_logs delete error:', delErr.message);
          errors.push(delErr.message);
        } else {
          _clearTombstones('strength_logs', toDelete);
        }
      }
      if (logsArr.length > 0) {
        const rows = logsArr.map((item) => {
          const extra = {};
          if (item.setNumber != null) extra.setNumber = item.setNumber;
          if (item.totalSets != null) extra.totalSets = item.totalSets;
          if (item.selectionSource != null) extra.selectionSource = String(item.selectionSource);
          if (item.prescribedWeight != null) extra.prescribedWeight = Number(item.prescribedWeight);
          if (item.prescribedReps != null) extra.prescribedReps = Number(item.prescribedReps);
          if (item.prescribedRpe != null) extra.prescribedRpe = Number(item.prescribedRpe);
          if (item.prescribedRestSec != null) extra.prescribedRestSec = Number(item.prescribedRestSec);
          return {
            id: String(item.id || ('m-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6))),
            user_id: user.id,
            date: item.date || fallbackDate,
            exercise: String(item.exercise || 'Goblet Squat'),
            weight: item.weight != null ? Number(item.weight) : 0,
            band_level: item.bandLevel || item.band_level || null,
            reps: item.reps != null ? Math.round(Number(item.reps)) : 10,
            rpe: item.rpe != null ? Number(item.rpe) : 8.0,
            duration_sec: item.durationSec != null ? Math.round(Number(item.durationSec)) : null,
            sec_per_rep: item.secPerRep != null ? Number(item.secPerRep) : null,
            extra
          };
        });
        const { error } = await client
          .from('strength_logs')
          .upsert(rows, { onConflict: 'user_id,id' });
        if (error) {
          console.warn('strength_logs upsert error:', error.message);
          errors.push(error.message);
        }
      }
    }

    // 2. public.cardio_logs (PK: user_id, id)
    if (Array.isArray(cardioArr)) {
      const keepC = new Set(cardioArr.map((x) => String(x.id)));
      const delC = (tombstones.cardio_logs || []).filter((id) => id && !keepC.has(String(id)));
      if (delC.length > 0) {
        const { error: delCErr } = await client
          .from('cardio_logs')
          .delete()
          .eq('user_id', user.id)
          .in('id', delC);
        if (delCErr) {
          console.warn('cardio_logs delete error:', delCErr.message);
          errors.push(delCErr.message);
        } else {
          _clearTombstones('cardio_logs', delC);
        }
      }
      if (cardioArr.length > 0) {
        const rowsC = cardioArr.map((item) => ({
          id: String(item.id || ('c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6))),
          user_id: user.id,
          date: item.date || fallbackDate,
          modality: String(item.modality || 'Rowing'),
          duration: item.duration != null ? Number(item.duration) : 30,
          distance: item.distance != null ? Number(item.distance) : null,
          incline: item.incline != null ? Number(item.incline) : 0,
          resistance: item.resistance != null ? Math.round(Number(item.resistance)) : null,
          meters: item.meters != null ? Math.round(Number(item.meters)) : null,
          rpe: item.rpe != null ? Number(item.rpe) : 7.5,
          extra: {}
        }));
        const { error } = await client
          .from('cardio_logs')
          .upsert(rowsC, { onConflict: 'user_id,id' });
        if (error) {
          console.warn('cardio_logs upsert error:', error.message);
          errors.push(error.message);
        }
      }
    }

    // 3. public.sauna_logs (PK: user_id, id)
    if (Array.isArray(saunaArr)) {
      const keepS = new Set(saunaArr.map((x) => String(x.id)));
      const delS = (tombstones.sauna_logs || []).filter((id) => id && !keepS.has(String(id)));
      if (delS.length > 0) {
        const { error: delSErr } = await client
          .from('sauna_logs')
          .delete()
          .eq('user_id', user.id)
          .in('id', delS);
        if (delSErr) {
          console.warn('sauna_logs delete error:', delSErr.message);
          errors.push(delSErr.message);
        } else {
          _clearTombstones('sauna_logs', delS);
        }
      }
      if (saunaArr.length > 0) {
        const rowsS = saunaArr.map((item) => ({
          id: String(item.id || ('s-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6))),
          user_id: user.id,
          date: item.date || fallbackDate,
          duration: item.duration != null ? Math.round(Number(item.duration)) : 20,
          type: String(item.type || 'Traditional Dry Sauna'),
          timing: String(item.timing || 'Post-Lift'),
          extra: {}
        }));
        const { error } = await client
          .from('sauna_logs')
          .upsert(rowsS, { onConflict: 'user_id,id' });
        if (error) {
          console.warn('sauna_logs upsert error:', error.message);
          errors.push(error.message);
        }
      }
    }

    // 4. public.trainer_notes (PK: user_id, id)
    if (Array.isArray(trainerNotesArr)) {
      const keepN = new Set(trainerNotesArr.map((x) => String(x.id)));
      const delN = (tombstones.trainer_notes || []).filter((id) => id && !keepN.has(String(id)));
      if (delN.length > 0) {
        const { error: delNErr } = await client
          .from('trainer_notes')
          .delete()
          .eq('user_id', user.id)
          .in('id', delN);
        if (delNErr) {
          console.warn('trainer_notes delete error:', delNErr.message);
          errors.push(delNErr.message);
        } else {
          _clearTombstones('trainer_notes', delN);
        }
      }
      if (trainerNotesArr.length > 0) {
        const rowsN = trainerNotesArr.map((item) => ({
          id: String(item.id || ('note-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6))),
          user_id: user.id,
          date: item.date || fallbackDate,
          note_type: String(item.phase || item.note_type || 'pre_workout'),
          content: String(item.transcript || item.content || ''),
          extra: {
            time: item.time || '',
            aiReply: item.aiReply || ''
          }
        }));
        const { error } = await client
          .from('trainer_notes')
          .upsert(rowsN, { onConflict: 'user_id,id' });
        if (error) {
          console.warn('trainer_notes upsert error:', error.message);
          errors.push(error.message);
        }
      }
    }

    return { ok: errors.length === 0, errors };
  }

  async function pushAllToCloud(userId) {
    const uid = userId || (getCurrentUser() && getCurrentUser().id);
    if (!uid) return { ok: false };
    const ctx = readJson(STORAGE_KEYS.COACH_CONTEXT, null);
    if (ctx) await syncCoachContextToCloud(ctx);
    const dir = readJson(STORAGE_KEYS.TRAINER_DIRECTIVES, null);
    if (dir) await syncTrainerDirectivesToCloud(dir);
    const logs = readJson(STORAGE_KEYS.LOGS, []);
    const cardio = readJson(STORAGE_KEYS.CARDIO_LOGS, []);
    const sauna = readJson(STORAGE_KEYS.SAUNA_LOGS, []);
    const notes = readJson(STORAGE_KEYS.TRAINER_NOTES, []);
    const logRes = await syncLogsToCloud(logs, cardio, sauna, notes);
    const customCat = readJson(STORAGE_KEYS.CUSTOM_CATALOG, []);
    if (Array.isArray(customCat)) {
      for (const item of customCat) {
        await syncCustomCatalogItemToCloud(item);
      }
    }
    return logRes;
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
    const parentSess = _getParentSession();
    if (parentSess && parentSess.user) {
      _session = parentSess;
      _authReady = true;
      _emitAuth();
      return _session;
    }

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
    markRecordDeleted,
    hydrateUserFromCloud,
    syncCoachContextToCloud,
    syncTrainerDirectivesToCloud,
    syncLogsToCloud,
    syncCustomCatalogItemToCloud,
    pushAllToCloud,
    uploadCatalogImage,
    notifyFrames
  };
})(window);
