import liveSeed from '../../garden/seed.json' with { type: 'json' };

const seed = structuredClone(liveSeed);

// Stable synthetic Garden for unit/integration tests. Production portfolio state evolves
// independently and must never be used as an implicit fixture.
seed.fruits = (seed.fruits ?? []).filter((x) => x.status === 'live');
seed.humanActuationQueue = [];
seed.experiments = [];
seed.events = [];
seed.approvals = [];
seed.opportunities = [{
  id: 'opp_maps_website_pointer_guard',
  name: 'Google Maps Business → Website Identity Guard',
  status: 'needs_test',
  thesis: 'A correct Google Maps business entity can contain a stale, wrong, parent, or unrelated website pointer; downstream contact enrichment can then work perfectly on the wrong entity.',
  moneyFlow: 'Google Maps scraping and contact enrichment workflows',
  buyer: 'lead-data, enrichment, and automation users',
  buyerType: 'automation_and_data_workflows',
  nutrientChannel: 'Apify / API workflows using Google Maps data',
  passivity: 'Potentially high if metered machine-to-machine verification',
  autonomyCompatibility: 'Potentially high',
  reproductivePotential: 'Could branch into website/contact attribution trust adapters',
  reusableCapability: 'Maps-to-website identity comparison with fail-closed mismatch classification',
  failureArchetype: 'trusted_pointer_drift',
  resolutionPrimitive: 'compare the asserted website pointer with independently observable business identity signals',
  realityAccess: 'Public Maps records and public business websites can be sampled directly with a bounded executor.',
  cheapestRealityTest: 'Run a bounded direct Maps-to-website identity sample.',
  inheritedInfrastructure: 'Exact Match Guard and bounded Apify experiment executor.',
  sources: [],
  externalEvidence: [],
  reasoningEvidence: [],
  counterEvidence: [],
  selectedForExperiment: false,
  selectionState: null,
  selectionCooldown: false,
  experimentId: null,
  fruitId: null,
  validationGate: { pass: false, dimensions: [] },
}];

export default seed;
