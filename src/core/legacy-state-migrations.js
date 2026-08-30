import { authorizeAction } from './autonomy.js';

function hasSupportingDimension(garden, opportunityId, dimension) {
  return (garden.experiments ?? []).some((exp) =>
    exp.opportunityId === opportunityId
    && exp.status === 'integrated'
    && exp.validationDimension === dimension
    && exp.result?.verdict === 'supports'
    && (exp.result?.sources ?? []).some((source) => source?.url)
  );
}

function declaresCoreMeasurementBlocked(opp) {
  const text = `${opp?.realityAccess ?? ''} ${opp?.cheapestRealityTest ?? ''}`.toLowerCase();
  return text.includes('evidence-blocked')
    || /core failure.{0,120}(?:cannot|unavailable|blocked)/i.test(text)
    || /(?:cannot|unavailable|blocked).{0,120}core failure/i.test(text);
}

function restoreOpportunityAfterLegacyProvenanceDemotion(garden, exp, reason) {
  const opp = (garden.opportunities ?? []).find((x) => x.id === exp.opportunityId);
  if (!opp || ['fruit', 'dormant', 'compost'].includes(opp.status)) return false;

  const buyerSupported = hasSupportingDimension(garden, opp.id, 'buyer_demand');
  opp.status = buyerSupported ? 'supported' : 'needs_test';
  opp.validatedAt = null;
  opp.buildPlan = null;
  opp.experimentId = null;
  opp.validationGate = {
    pass: false,
    migrationNote: 'Legacy failure-reality scout is historical context only after source-provenance hardening.',
  };
  opp.selectedForExperiment = true;
  opp.selectionState = 'selected';
  opp.selectionCooldown = false;
  opp.measurementBlockedAt = null;
  opp.measurementBlockedDimension = null;
  opp.measurementBlockedExperimentId = null;
  opp.measurementBlockedReason = null;
  opp.epistemicNote = buyerSupported
    ? 'Buyer demand remains externally supported. Failure reality is unknown—not weakened—and must be re-earned with source-mapped provenance before a private build plan is justified.'
    : 'Legacy failure-reality support is historical context only. Failure reality remains unknown and testable under the source-mapped method.';
  opp.provenanceRepairReason = reason;
  return true;
}

export function migrateLegacyRuntimeState(garden) {
  garden.opportunities ??= [];
  garden.experiments ??= [];
  garden.approvals ??= [];
  garden.soil ??= [];

  const repaired = [];
  const stateMigrations = [];

  for (const opp of garden.opportunities) {
    const externalSources = (opp.sources ?? []).filter((s) => s?.url);
    if (opp.status === 'supported' && externalSources.length === 0) {
      opp.status = 'needs_test';
      opp.epistemicNote = 'Repaired: prior support had no external source. Model reasoning is provisional only.';
      repaired.push(opp.id);
    }
  }

  for (const exp of garden.experiments) {
    if (
      exp.id === 'exp_94251fcac534'
      && exp.opportunityId === 'opp_maps_website_pointer_guard'
      && exp.status === 'integrated'
      && !exp.validationDimension
    ) {
      exp.validationDimension = 'buyer_demand';
      exp.migrationNote = 'Legacy first experiment conservatively classified as buyer_demand; failure_reality remains independently unearned.';
      stateMigrations.push(`${exp.id}:buyer_demand`);
    }
  }

  for (const exp of garden.experiments) {
    if (
      exp.method === 'maps_website_sample'
      && exp.status === 'authorized'
      && Number(exp.oneTimeCostUsd) < 0.50
    ) {
      const previousCap = Number(exp.oneTimeCostUsd);
      exp.oneTimeCostUsd = 0.50;
      const auth = authorizeAction(garden, {
        type: 'spend',
        amountUsd: 0.50,
        recurringUsd: Number(exp.recurringUsd ?? 0),
      });
      exp.authorization = auth;
      exp.migrationNote = `Platform-minimum migration: run ceiling raised from $${previousCap.toFixed(2)} to $0.50 after Apify rejected the lower cap. This is a ceiling, not a claim of actual spend.`;
      if (!auth.allowed) {
        exp.status = 'awaiting_approval';
        if (auth.requiresApproval && !garden.approvals.some((x) => x.status === 'pending' && x.action?.id === exp.id)) {
          garden.approvals.push({
            id: `approval_${exp.id}`,
            status: 'pending',
            createdAt: new Date().toISOString(),
            action: exp,
            reason: auth.reason,
          });
        }
      }
      stateMigrations.push(`${exp.id}:charge_cap_${previousCap.toFixed(2)}_to_0.50`);
    }
  }

  for (const exp of garden.experiments) {
    if (
      exp.method === 'email_auth_dns_sample'
      && exp.status === 'integrated'
      && exp.result?.verdict === 'weakens'
      && Number(exp.result?.sample?.espSignaled ?? 0) >= 8
      && Number(exp.result?.sample?.hardFailureDomains ?? Infinity) === 0
    ) {
      const opp = garden.opportunities.find((x) => x.id === exp.opportunityId);
      if (opp && ['needs_test', 'supported'].includes(opp.status) && !opp.experimentId) {
        opp.status = 'dormant';
        opp.selectedForExperiment = false;
        opp.selectionState = 'dormant';
        opp.selectionCooldown = false;
        opp.dormantAt = new Date().toISOString();
        opp.failedBecause = `Predeclared direct-DNS kill condition met by ${exp.id}: ${exp.killCondition ?? 'sufficient ESP-signaled sample with zero hard SPF/DMARC failures'}`;
        opp.epistemicNote = 'Dormant, not disproven: direct DNS reality contact weakened the claimed hard-failure mechanism enough that another semantic search is not justified without materially new evidence or a different population.';
        stateMigrations.push(`${opp.id}:dns_kill_to_dormant`);
      }
    }
  }

  for (const exp of garden.experiments) {
    const legacyUnmappedScout = exp.method === 'evidence_bearing_expand_v1'
      && exp.validationDimension === 'failure_reality'
      && exp.result?.provenanceStatus !== 'source_mapped'
      && (exp.status === 'integrated' || exp.status === 'legacy_context');
    if (!legacyUnmappedScout) continue;

    if (exp.status !== 'legacy_context') {
      exp.result ??= {};
      exp.result.legacyVerdict = exp.result?.legacyVerdict ?? exp.result?.verdict ?? 'supports';
      exp.result.provenanceStatus = 'legacy_unmapped';
      exp.status = 'legacy_context';
      exp.migrationNote = 'Historical context after source-provenance hardening: source pool was not mapped specifically to failure_reality. This experiment is neither validating nor falsifying evidence.';
      stateMigrations.push(`${exp.id}:legacy_failure_context_only`);
    }

    const opp = garden.opportunities.find((x) => x.id === exp.opportunityId);
    const falselyBlockedByThisScout = opp?.status === 'measurement_blocked'
      && opp.measurementBlockedDimension === 'failure_reality'
      && (opp.measurementBlockedExperimentId === exp.id
        || /bounded public web search returned inconclusive evidence for failure_reality/i.test(opp.measurementBlockedReason ?? ''));

    const needsLegacyRepair = falselyBlockedByThisScout
      || (opp && ['validated', 'build_ready'].includes(opp.status))
      || (opp && exp.result?.provenanceStatus === 'legacy_unmapped' && !hasSupportingDimension(garden, opp.id, 'failure_reality'));

    if (needsLegacyRepair && restoreOpportunityAfterLegacyProvenanceDemotion(
      garden,
      exp,
      falselyBlockedByThisScout
        ? 'Recovered from false measurement block caused by provenance demotion.'
        : 'Removed legacy unmapped failure credit.',
    )) {
      stateMigrations.push(`${opp.id}:legacy_failure_reopened`);
    }
  }

  let preflightBlocked = false;
  for (const opp of garden.opportunities) {
    if (
      ['needs_test', 'supported'].includes(opp.status)
      && !opp.experimentId
      && declaresCoreMeasurementBlocked(opp)
    ) {
      opp.status = 'measurement_blocked';
      opp.selectedForExperiment = false;
      opp.selectionState = 'measurement_blocked';
      opp.selectionCooldown = false;
      opp.measurementBlockedAt = new Date().toISOString();
      opp.measurementBlockedDimension = 'failure_reality';
      opp.measurementBlockedExperimentId = null;
      opp.measurementBlockedReason = 'Validation-path preflight: the opportunity itself declares its core failure-reality inaccessible with current Flower executors, so buyer-demand spend is not justified first.';
      opp.epistemicNote = 'Preserved, not disproven: revisit only after a materially different bounded executor makes the core failure directly testable.';
      stateMigrations.push(`${opp.id}:validation_path_preflight_block`);
      preflightBlocked = true;
    }
  }

  if (preflightBlocked) {
    const principle = 'Validation-path completeness precedes paid validation: do not pay to prove demand for a branch whose decisive failure-reality cannot be reached with current bounded executors.';
    if (!garden.soil.some((x) => x.principle === principle)) {
      garden.soil.push({
        id: `soil_validation_path_${Date.now()}`,
        principle,
        scope: 'experiment governance',
        status: 'supported',
        derivedFrom: garden.opportunities
          .filter((x) => x.measurementBlockedReason?.startsWith('Validation-path preflight'))
          .map((x) => x.id),
        createdAt: new Date().toISOString(),
      });
    }
  }

  return { repaired, stateMigrations };
}
