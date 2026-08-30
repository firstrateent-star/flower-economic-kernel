import { assessImprovementDividend } from './improvement-transfer.js';
import { nowIso } from './utils.js';

function named(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function cleanStrings(value, limit = 6) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(named).map((item) => item.trim()))].slice(0, limit);
}

function compactImprovement(improvement) {
  return {
    id: improvement.id ?? null,
    name: improvement.name ?? null,
    description: improvement.description ?? improvement.thesis ?? null,
    dimensions: improvement.dimensions ?? {},
    internalEvidence: improvement.internalEvidence ?? [],
    sourceArtifact: improvement.sourceArtifact ?? null,
  };
}

export async function runImprovementTransfer({ garden, reasoner, targetId }) {
  const improvement = (garden.internalImprovements ?? []).find((item) => item.id === targetId);
  if (!improvement) {
    return { changed: false, summary: 'Internal improvement transfer target not found.', action: 'TRANSFER' };
  }

  const assessment = assessImprovementDividend(improvement);
  if (assessment.internalState !== 'internal_improvement_evidenced') {
    improvement.transferAssessmentState = 'not_earned';
    improvement.transferAssessmentAt = nowIso();
    return {
      changed: true,
      summary: `${improvement.name ?? improvement.id}: outward transfer analysis withheld because the internal gain is not yet a verified Pareto improvement.`,
      action: 'TRANSFER',
    };
  }

  const result = await reasoner.reason({
    operation: 'TRANSFER',
    garden,
    target: { improvement: compactImprovement(improvement) },
    allowWebSearch: false,
    prompt: `Analyze this VERIFIED INTERNAL improvement for transferability without claiming external value. Strip away Flower-specific nouns and identify the underlying reusable transformation. Consider both other software/agent systems and people/workflows where appropriate. Return ONLY JSON with this exact shape: {"transferable":boolean,"transformation":string|null,"beneficiaryClasses":string[],"externalValueMeasure":string|null,"deliveryForms":string[],"nextExternalProbe":string|null,"antiGoodhartRisk":string|null,"outwardMaintenanceBounded":boolean}. A transfer hypothesis is an option, not a product commitment. If the gain is too context-specific, set transferable=false. Do not invent market evidence, buyer demand, ownership, revenue, or external validation.`,
  });

  const proposal = result.data ?? {};
  const beneficiaries = cleanStrings(proposal.beneficiaryClasses);
  const deliveryForms = cleanStrings(proposal.deliveryForms);
  const shapeComplete = proposal.transferable === true
    && named(proposal.transformation)
    && beneficiaries.length > 0
    && named(proposal.externalValueMeasure);

  improvement.transferAssessmentAt = nowIso();
  improvement.transferAssessmentResponseId = result.rawId ?? null;

  if (!shapeComplete) {
    improvement.transferAssessmentState = 'no_transfer_hypothesis';
    return {
      changed: true,
      summary: `${improvement.name ?? improvement.id}: no sufficiently general outward transfer hypothesis was found; the internal improvement remains internal.`,
      action: 'TRANSFER',
    };
  }

  improvement.transferAssessmentState = 'hypothesis_derived';
  improvement.transformation = proposal.transformation.trim();
  improvement.beneficiaryClasses = beneficiaries;
  improvement.externalValueMeasure = proposal.externalValueMeasure.trim();
  improvement.deliveryForms = deliveryForms;
  improvement.nextExternalProbe = named(proposal.nextExternalProbe) ? proposal.nextExternalProbe.trim() : null;
  improvement.antiGoodhartRisk = named(proposal.antiGoodhartRisk) ? proposal.antiGoodhartRisk.trim() : null;
  improvement.outwardMaintenanceBounded = proposal.outwardMaintenanceBounded !== false;
  improvement.truthfulExternalClaim = true;
  improvement.externalProblemEvidence ??= [];
  improvement.externalValueVerified = false;
  improvement.repeatExternalValueVerified = false;

  return {
    changed: true,
    summary: `${improvement.name ?? improvement.id}: derived an outward transfer hypothesis for ${beneficiaries.join(', ')}; external value remains unverified until independent reality contact.`,
    action: 'TRANSFER',
  };
}
