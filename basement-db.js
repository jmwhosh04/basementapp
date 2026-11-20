// Basement Lab · Shared Supabase Auth & Cloud Sync Adapter (basement-db.js)
// Works alongside localStorage so all 4 standalone modules stay fast offline
// and sync per-user via Google Sign-In + Row Level Security (user_id = auth.uid()).

(function (global) {
  'use strict';

  const SUPABASE_URL = 'https://flroxptovfxuzwpoyisf.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_tsAgCyDK0xMchdMW4lH8BA_rys4KouJ';
  const ACTIVE_USER_KEY = 'basement_active_user_id';

  const STATE_KEYS = [
    'basement_coach_context',
    'basement_active_goal',
    'basement_temp_injuries',
    'basement_limits',
    'basement_trainer_directives',
    'basement_gemini_api_key'
  ];

  const ALL_SYNC_KEYS = [
    ...STATE_KEYS,
    'basement_logs',
    'basement_cardio_logs',
    'basement_sauna_logs',
    'basement_trainer_notes',
    'basement_custom_catalog'
  ];

  let sb = null;
  let lastSnapshots = {};
  let syncTimer = null;
  let isPulling = false;

  function safeGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function safeSet(key, val) {
    try {
      localStorage.setItem(key, val);
    } catch (e) {}
  }

  function safeRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  }

  function safeParse(raw, fallback) {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function clearAllLocalProfileData() {
    ALL_SYNC_KEYS.forEach(safeRemove);
    lastSnapshots = {};
  }

  function getClient() {
    if (!sb && global.supabase && typeof global.supabase.createClient === 'function') {
      sb = global.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return sb;
  }

  async function signInWithGoogle() {
    const client = getClient();
    if (!client) throw new Error('Supabase client failed to load.');
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });
    if (error) throw error;
  }

  async function signOut() {
    const client = getClient();
    stopAutoSync();
    if (client) {
      await client.auth.signOut();
    }
    safeRemove(ACTIVE_USER_KEY);
    clearAllLocalProfileData();
  }

  async function getSession() {
    const client = getClient();
    if (!client) return null;
    const { data, error } = await client.auth.getSession();
    if (error) return null;
    return data?.session || null;
  }

  function onAuthStateChange(callback) {
    const client = getClient();
    if (!client) return { data: { subscription: { unsubscribe() {} } } };
    return client.auth.onAuthStateChange((_event, session) => {
      callback(session || null);
    });
  }

  // Pull all tables for the signed-in user and hydrate localStorage.
  // Never auto-seeds a new user's cloud account from another user's leftover browser storage.
  async function pullFromCloud(userId) {
    const client = getClient();
    if (!client || !userId) return { imported: false };

    isPulling = true;
    try {
      const previousUserId = safeGet(ACTIVE_USER_KEY);
      if (previousUserId !== userId) {
        clearAllLocalProfileData();
      }
      safeSet(ACTIVE_USER_KEY, userId);

      const [stateRes, strengthRes, cardioRes, saunaRes, notesRes, catalogRes] = await Promise.all([
        client.from('user_state').select('key, value').eq('user_id', userId),
        client.from('strength_logs').select('*').eq('user_id', userId).order('date', { ascending: false }),
        client.from('cardio_logs').select('*').eq('user_id', userId).order('date', { ascending: false }),
        client.from('sauna_logs').select('*').eq('user_id', userId).order('date', { ascending: false }),
        client.from('trainer_notes').select('*').eq('user_id', userId).order('date', { ascending: false }),
        client.from('custom_catalog').select('id, owner_id, is_shared, data')
      ]);

      const hasCloudData =
        (stateRes.data && stateRes.data.length > 0) ||
        (strengthRes.data && strengthRes.data.length > 0) ||
        (cardioRes.data && cardioRes.data.length > 0) ||
        (saunaRes.data && saunaRes.data.length > 0) ||
        (notesRes.data && notesRes.data.length > 0);

      if (!hasCloudData) {
        clearAllLocalProfileData();
        // Still load shared custom catalog items if any exist
        if (catalogRes.data && catalogRes.data.length > 0) {
          const mapped = catalogRes.data.map((r) => ({
            ...(r.data || {}),
            id: r.id,
            owner_id: r.owner_id,
            is_shared: r.is_shared
          }));
          safeSet('basement_custom_catalog', JSON.stringify(mapped));
        }
        snapshotCurrentLocal();
        return { freshProfile: true };
      }

      if (stateRes.data) {
        const stateMap = {};
        stateRes.data.forEach((row) => {
          stateMap[row.key] = row.value;
          if (row.key === 'basement_gemini_api_key') {
            const strVal = typeof row.value === 'string' ? row.value : (row.value?.key || '');
            if (strVal) safeSet(row.key, strVal);
            else safeRemove(row.key);
          } else {
            safeSet(row.key, JSON.stringify(row.value));
          }
        });
        STATE_KEYS.forEach((k) => {
          if (!(k in stateMap)) safeRemove(k);
        });
      }

      if (strengthRes.data) {
        const mapped = strengthRes.data.map((r) => ({
          ...(r.extra || {}),
          id: r.id,
          date: r.date,
          exercise: r.exercise,
          weight: r.weight !== null ? Number(r.weight) : undefined,
          bandLevel: r.band_level || undefined,
          reps: r.reps !== null ? Number(r.reps) : undefined,
          rpe: r.rpe !== null ? Number(r.rpe) : undefined,
          durationSec: r.duration_sec !== null ? Number(r.duration_sec) : undefined,
          secPerRep: r.sec_per_rep !== null ? Number(r.sec_per_rep) : undefined
        }));
        safeSet('basement_logs', JSON.stringify(mapped));
      }

      if (cardioRes.data) {
        const mapped = cardioRes.data.map((r) => ({
          ...(r.extra || {}),
          id: r.id,
          date: r.date,
          modality: r.modality,
          duration: r.duration !== null ? Number(r.duration) : undefined,
          distance: r.distance !== null ? Number(r.distance) : undefined,
          incline: r.incline !== null ? Number(r.incline) : undefined,
          resistance: r.resistance !== null ? Number(r.resistance) : undefined,
          meters: r.meters !== null ? Number(r.meters) : undefined,
          rpe: r.rpe !== null ? Number(r.rpe) : undefined
        }));
        safeSet('basement_cardio_logs', JSON.stringify(mapped));
      }

      if (saunaRes.data) {
        const mapped = saunaRes.data.map((r) => ({
          ...(r.extra || {}),
          id: r.id,
          date: r.date,
          duration: r.duration !== null ? Number(r.duration) : undefined,
          type: r.type || undefined,
          timing: r.timing || undefined
        }));
        safeSet('basement_sauna_logs', JSON.stringify(mapped));
      }

      if (notesRes.data) {
        const mapped = notesRes.data.map((r) => ({
          ...(r.extra || {}),
          id: r.id,
          date: r.date,
          type: r.note_type || undefined,
          content: r.content || undefined
        }));
        safeSet('basement_trainer_notes', JSON.stringify(mapped));
      }

      if (catalogRes.data) {
        const mapped = catalogRes.data.map((r) => ({
          ...(r.data || {}),
          id: r.id,
          owner_id: r.owner_id,
          is_shared: r.is_shared
        }));
        safeSet('basement_custom_catalog', JSON.stringify(mapped));
      }

      snapshotCurrentLocal();
      return { hydrated: true };
    } finally {
      isPulling = false;
    }
  }

  async function resetUserCloudAndLocal(userId) {
    const client = getClient();
    stopAutoSync();
    isPulling = true;
    try {
      clearAllLocalProfileData();
      if (client && userId) {
        await Promise.all([
          client.from('user_state').delete().eq('user_id', userId),
          client.from('strength_logs').delete().eq('user_id', userId),
          client.from('cardio_logs').delete().eq('user_id', userId),
          client.from('sauna_logs').delete().eq('user_id', userId),
          client.from('trainer_notes').delete().eq('user_id', userId)
        ]);
      }
      snapshotCurrentLocal();
    } finally {
      isPulling = false;
    }
  }

  async function pushKeyToCloud(userId, key) {
    const client = getClient();
    if (!client || !userId) return;

    const raw = safeGet(key);

    if (key === 'basement_gemini_api_key') {
      if (!raw) {
        await client.from('user_state').delete().eq('user_id', userId).eq('key', key);
      } else {
        await client.from('user_state').upsert({
          user_id: userId,
          key,
          value: { key: raw },
          updated_at: new Date().toISOString()
        });
      }
      return;
    }

    if (!raw) return;

    if (STATE_KEYS.includes(key)) {
      const value = safeParse(raw, {});
      await client.from('user_state').upsert({
        user_id: userId,
        key,
        value,
        updated_at: new Date().toISOString()
      });
      return;
    }

    const items = safeParse(raw, []);
    if (!Array.isArray(items)) return;

    if (key === 'basement_logs') {
      const rows = items.map((it, idx) => {
        const { id, date, exercise, weight, bandLevel, reps, rpe, durationSec, secPerRep, ...extra } = it;
        return {
          id: String(id || `log_${idx}_${date || 'na'}`),
          user_id: userId,
          date: date || new Date().toISOString().slice(0, 10),
          exercise: exercise || 'Unknown',
          weight: weight ?? null,
          band_level: bandLevel ?? null,
          reps: reps ?? null,
          rpe: rpe ?? null,
          duration_sec: durationSec ?? null,
          sec_per_rep: secPerRep ?? null,
          extra
        };
      });
      await client.from('strength_logs').delete().eq('user_id', userId);
      if (rows.length) await client.from('strength_logs').upsert(rows);
    } else if (key === 'basement_cardio_logs') {
      const rows = items.map((it, idx) => {
        const { id, date, modality, duration, distance, incline, resistance, meters, rpe, ...extra } = it;
        return {
          id: String(id || `cardio_${idx}_${date || 'na'}`),
          user_id: userId,
          date: date || new Date().toISOString().slice(0, 10),
          modality: modality || 'Cardio',
          duration: duration ?? null,
          distance: distance ?? null,
          incline: incline ?? null,
          resistance: resistance ?? null,
          meters: meters ?? null,
          rpe: rpe ?? null,
          extra
        };
      });
      await client.from('cardio_logs').delete().eq('user_id', userId);
      if (rows.length) await client.from('cardio_logs').upsert(rows);
    } else if (key === 'basement_sauna_logs') {
      const rows = items.map((it, idx) => {
        const { id, date, duration, type, timing, ...extra } = it;
        return {
          id: String(id || `sauna_${idx}_${date || 'na'}`),
          user_id: userId,
          date: date || new Date().toISOString().slice(0, 10),
          duration: duration ?? null,
          type: type ?? null,
          timing: timing ?? null,
          extra
        };
      });
      await client.from('sauna_logs').delete().eq('user_id', userId);
      if (rows.length) await client.from('sauna_logs').upsert(rows);
    } else if (key === 'basement_trainer_notes') {
      const rows = items.map((it, idx) => {
        const { id, date, type, note_type, content, text, ...extra } = it;
        return {
          id: String(id || `note_${idx}_${date || 'na'}`),
          user_id: userId,
          date: date || new Date().toISOString().slice(0, 10),
          note_type: type || note_type || null,
          content: content || text || '',
          extra
        };
      });
      await client.from('trainer_notes').delete().eq('user_id', userId);
      if (rows.length) await client.from('trainer_notes').upsert(rows);
    } else if (key === 'basement_custom_catalog') {
      const ownItems = items.filter((it) => !it.owner_id || it.owner_id === userId);
      const rows = ownItems.map((it, idx) => ({
        id: String(it.id || it.slug || `custom_${idx}`),
        owner_id: userId,
        is_shared: it.is_shared !== false,
        data: it,
        updated_at: new Date().toISOString()
      }));
      await client.from('custom_catalog').delete().eq('owner_id', userId);
      if (rows.length) await client.from('custom_catalog').upsert(rows);
    }
  }

  async function pushAllToCloud(userId) {
    for (const key of ALL_SYNC_KEYS) {
      await pushKeyToCloud(userId, key);
    }
  }

  function snapshotCurrentLocal() {
    lastSnapshots = {};
    ALL_SYNC_KEYS.forEach((k) => {
      lastSnapshots[k] = safeGet(k);
    });
  }

  async function syncDirtyKeys(userId) {
    if (isPulling || !userId) return;
    for (const key of ALL_SYNC_KEYS) {
      const current = safeGet(key);
      if (current !== lastSnapshots[key]) {
        lastSnapshots[key] = current;
        try {
          await pushKeyToCloud(userId, key);
        } catch (err) {
          console.warn('BasementDB sync warning for', key, err);
        }
      }
    }
  }

  function startAutoSync(userId) {
    stopAutoSync();
    if (!userId) return;
    snapshotCurrentLocal();
    syncTimer = setInterval(() => {
      syncDirtyKeys(userId);
    }, 3000);
  }

  function stopAutoSync() {
    if (syncTimer) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
  }

  global.BasementDB = {
    SUPABASE_URL,
    ALL_SYNC_KEYS,
    signInWithGoogle,
    signOut,
    getSession,
    onAuthStateChange,
    pullFromCloud,
    pushAllToCloud,
    resetUserCloudAndLocal,
    startAutoSync,
    stopAutoSync,
    safeGet,
    safeSet
  };
})(window);
