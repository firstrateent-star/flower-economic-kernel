import fs from 'node:fs/promises';
import path from 'node:path';
import { assessSemanticIndexTransfer } from '../src/core/semantic-index-transfer.js';

const SOURCE_PATH = process.env.FLOWER_TRANSFER_SOURCE
  || 'methodology/meta-learning/cross-domain-transfer-v1.json';
const OUTPUT_PATH = process.env.FLOWER_TRANSFER_REPORT
  || 'reports/cross-domain-transfer-observatory-latest.json';

async function main() {
  const source = JSON.parse(await fs.readFile(SOURCE_PATH, 'utf8'));
  const storybook = source.cases.find((item) => item.id === 'transfer_storybook_ai_tool_lookup');
  const n8n = source.cases.find((item) => item.id === 'transfer_n8n_mcp_tool_lookup');
  if (!storybook || !n8n) throw new Error('Expected Storybook and n8n transfer cases.');

  const storybookModel = assessSemanticIndexTransfer({
    itemCount: storybook.shadowModel.itemCount,
    queryCount: storybook.shadowModel.queriesPerLoadedMetadataLifecycle,
    rebuildCount: 1,
    lookupShape: 'worst_case_success',
    stableStructureWitness: false,
  });

  const n8nStableScenario = assessSemanticIndexTransfer({
    itemCount: n8n.shadowModel.exampleItemCount,
    queryCount: n8n.shadowModel.exampleRepeatedQueries,
    rebuildCount: 1,
    lookupShape: 'uniform_success',
    stableStructureWitness: true,
  });
  const n8nRebuildEveryQueryScenario = assessSemanticIndexTransfer({
    itemCount: n8n.shadowModel.exampleItemCount,
    queryCount: n8n.shadowModel.exampleRepeatedQueries,
    rebuildCount: n8n.shadowModel.exampleRepeatedQueries,
    lookupShape: 'uniform_success',
    stableStructureWitness: false,
  });

  const report = {
    schemaVersion: 1,
    probe: 'flower_cross_domain_transfer_observatory_v1',
    epistemicStatus: 'external_source_shadow_test_not_external_value',
    sourcePath: SOURCE_PATH,
    generatedAt: new Date().toISOString(),
    sourceImprovement: source.sourceImprovement,
    transformation: source.transformation,
    boundaryHypothesis: source.boundaryHypothesis,
    cases: {
      storybook: {
        declaredState: storybook.transferState,
        model: storybookModel,
        conclusion: storybookModel.workProxyImproves
          ? 'unexpected_gain_reinspect_source_assumptions'
          : 'negative_transfer_boundary_confirmed',
      },
      n8n: {
        declaredState: n8n.transferState,
        stableScenario: n8nStableScenario,
        rebuildEveryQueryScenario: n8nRebuildEveryQueryScenario,
        conclusion: n8nStableScenario.workProxyImproves && !n8nRebuildEveryQueryScenario.workProxyImproves
          ? 'conditional_on_stability_and_reuse'
          : 'shadow_model_does_not_support_declared_boundary',
      },
    },
    metaLearningUpdate: source.metaLearningUpdate,
    flourishingAudit: source.flourishingAudit,
    externalValueVerified: false,
    externalFlourishingVerified: false,
    nextPressure: {
      type: 'EXTERNAL_RUNTIME_WITNESS',
      target: 'n8n MCP tool-resolution lifecycle or another structurally equivalent persistent system',
      why: 'Source inspection plus deterministic work modeling rejected one tempting transfer and retained one conditional candidate. The next uncertainty is empirical reuse: observe real tool-set sizes, stable-query counts, invalidation frequency, and lookup materiality before any external patch or value claim.',
    },
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error?.stack ?? error);
  process.exitCode = 1;
});
