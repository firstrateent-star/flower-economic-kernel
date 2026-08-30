function clone(value) {
  return value == null ? value : structuredClone(value);
}

function mergeCanonicalById(existing = [], canonical = []) {
  const byId = new Map();
  for (const item of existing ?? []) {
    if (!item?.id) continue;
    byId.set(item.id, clone(item));
  }
  for (const item of canonical ?? []) {
    if (!item?.id) continue;
    byId.set(item.id, {
      ...(byId.get(item.id) ?? {}),
      ...clone(item),
    });
  }
  return [...byId.values()];
}

function mergeFruits(existing = [], canonical = []) {
  const byId = new Map((existing ?? []).filter((x) => x?.id).map((x) => [x.id, clone(x)]));

  for (const canonicalFruit of canonical ?? []) {
    if (!canonicalFruit?.id) continue;
    const live = byId.get(canonicalFruit.id);
    if (!live) {
      byId.set(canonicalFruit.id, clone(canonicalFruit));
      continue;
    }

    // Runtime Fruit state can contain newer measured return/runtime facts. Canonical state
    // therefore fills missing descriptive/control fields but does not overwrite existing
    // measured fields merely because a deployment retained an older Garden snapshot.
    for (const [key, value] of Object.entries(canonicalFruit)) {
      if (live[key] === undefined || live[key] === null) live[key] = clone(value);
    }
  }

  return [...byId.values()];
}

function queueIdentity(item) {
  return `${item?.organismId ?? ''}::${item?.action ?? ''}`;
}

function reconcileHumanQueue(existing = [], canonical = []) {
  const prior = new Map((existing ?? []).map((x) => [queueIdentity(x), x]));

  return (canonical ?? []).map((item) => {
    const previous = prior.get(queueIdentity(item));
    const previousState = previous?.state;
    const preserveResolvedState = previousState
      && previousState !== 'awaiting_explicit_authorization'
      && previousState !== 'parked_pending_more_platform_truth'
      && previousState !== 'staged_not_earned_over_rank_1';

    return {
      ...clone(item),
      ...(preserveResolvedState ? { state: previousState } : {}),
    };
  });
}

export function reconcileCanonicalControlPlane(existing, canonical) {
  if (!canonical) throw new Error('Canonical Garden is required.');
  if (!existing) {
    return {
      garden: clone(canonical),
      changes: ['initialized_from_canonical'],
    };
  }

  const garden = clone(existing);
  const changes = [];

  if (garden.schemaVersion !== canonical.schemaVersion) {
    garden.schemaVersion = canonical.schemaVersion;
    changes.push('schema_version');
  }

  const previousCenter = JSON.stringify(garden.center ?? null);
  garden.center = clone(canonical.center);
  if (previousCenter !== JSON.stringify(garden.center)) changes.push('center_governance');

  const previousSoil = JSON.stringify(garden.soil ?? []);
  garden.soil = mergeCanonicalById(garden.soil, canonical.soil);
  if (previousSoil !== JSON.stringify(garden.soil)) changes.push('soil');

  const previousCold = JSON.stringify(garden.coldStorage ?? []);
  garden.coldStorage = mergeCanonicalById(garden.coldStorage, canonical.coldStorage);
  if (previousCold !== JSON.stringify(garden.coldStorage)) changes.push('cold_storage');

  const previousFruits = JSON.stringify(garden.fruits ?? []);
  garden.fruits = mergeFruits(garden.fruits, canonical.fruits);
  if (previousFruits !== JSON.stringify(garden.fruits)) changes.push('fruit_registry');

  const previousQueue = JSON.stringify(garden.humanActuationQueue ?? []);
  garden.humanActuationQueue = reconcileHumanQueue(garden.humanActuationQueue, canonical.humanActuationQueue);
  if (previousQueue !== JSON.stringify(garden.humanActuationQueue)) changes.push('human_actuation_queue');

  // Dynamic data-plane state is deliberately preserved: opportunities, experiments,
  // approvals, traces, selections, scout misses, runtime events and pulse counters.
  garden.status ??= {};
  garden.status.generation = Math.max(
    Number(garden.status.generation ?? 0),
    Number(canonical.status?.generation ?? 0),
  );

  // updatedAt belongs to the persisted data plane. Reconciliation must not rewrite it
  // merely because the repository seed has a different edit timestamp; otherwise a
  // no-op load/save oscillates state and fabricates activity.
  garden.updatedAt ??= canonical.updatedAt ?? null;

  return { garden, changes };
}
