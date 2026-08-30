export const TIME_PROVENANCE = Object.freeze({
  OBSERVED: 'observed_external',
  RUNTIME_WRITTEN: 'runtime_written',
  IMPORTED_UNVERIFIED: 'imported_unverified',
});

export function classifyGardenTimeProvenance(garden = {}) {
  const declared = garden.temporalProvenance?.class ?? null;
  if (declared && Object.values(TIME_PROVENANCE).includes(declared)) {
    return {
      class: declared,
      trustedForProspectiveReplay: declared !== TIME_PROVENANCE.IMPORTED_UNVERIFIED,
      source: 'garden.temporalProvenance.class',
    };
  }

  return {
    class: TIME_PROVENANCE.IMPORTED_UNVERIFIED,
    trustedForProspectiveReplay: false,
    source: 'legacy_or_undeclared_state',
  };
}

export function assertReplayableGardenChronology(garden = {}) {
  const provenance = classifyGardenTimeProvenance(garden);
  if (!provenance.trustedForProspectiveReplay) {
    throw new Error(`Garden chronology is ${provenance.class}; prospective replay requires explicitly trusted temporal provenance.`);
  }
  return provenance;
}
