import fs from 'node:fs/promises';
import path from 'node:path';
import { parseMetadata, compareProfileResults, isPublicIp, scoreIssues } from '../../actors/social-preview-drift-guard/src/core.js';

const STAGE_RANK = {
  private_source_ready: 1,
  private_verified: 2,
  private_deployed: 3,
  monetization_ready: 4,
  launch_approved_build_pending: 4,
  publish_ready: 4,
  live: 5,
  public_live: 5,
  fruit: 6,
};

function moreAdvancedStage(a, b) {
  return (STAGE_RANK[a] ?? 0) >= (STAGE_RANK[b] ?? 0) ? a : b;
}

async function readFruitManifests(rootDir) {
  const actorsDir = path.join(rootDir, 'actors');
  let entries = [];
  try {
    entries = await fs.readdir(actorsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const manifests = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const file = path.join(actorsDir, entry.name, 'fruit.manifest.json');
    try {
      const raw = await fs.readFile(file, 'utf8');
      const manifest = JSON.parse(raw);
      manifests.push({ ...manifest, manifestPath: path.relative(rootDir, file) });
    } catch {
      // An actor directory is not required to be a Flower Fruit.
    }
  }
  return manifests;
}

export async function syncFruitManifests(garden, { rootDir = process.cwd() } = {}) {
  garden.fruits ??= [];
  const manifests = await readFruitManifests(rootDir);
  const changes = [];

  for (const manifest of manifests) {
    if (!manifest?.id || !manifest?.opportunityId) continue;
    let fruit = garden.fruits.find((x) => x.id === manifest.id);
    if (!fruit) {
      fruit = {
        id: manifest.id,
        name: manifest.name,
        status: manifest.stage ?? 'private_source_ready',
        platform: manifest.platform ?? 'Apify',
        repository: 'firstrateent-star/flower-economic-kernel',
        sourcePath: manifest.sourcePath ?? null,
        opportunityId: manifest.opportunityId,
        failureArchetype: manifest.failureArchetype ?? null,
        reusableCapability: manifest.reusableCapability ?? null,
        permissions: manifest.permissions ?? null,
        standby: manifest.standby ?? null,
        inheritance: manifest.inheritance ?? [],
        monetization: manifest.monetization ?? null,
        passiveDistribution: manifest.passiveDistribution ?? null,
        publicRelease: manifest.publicRelease ?? null,
        publicMeasurement: manifest.publicMeasurement ?? null,
        growthLoop: manifest.growthLoop ?? null,
        manifestPath: manifest.manifestPath,
        createdAt: new Date().toISOString(),
      };
      garden.fruits.push(fruit);
      changes.push(`${fruit.id}:registered`);
    } else {
      fruit.name = manifest.name ?? fruit.name;
      fruit.platform = manifest.platform ?? fruit.platform;
      fruit.sourcePath = manifest.sourcePath ?? fruit.sourcePath;
      fruit.failureArchetype = manifest.failureArchetype ?? fruit.failureArchetype;
      fruit.reusableCapability = manifest.reusableCapability ?? fruit.reusableCapability;
      fruit.permissions = manifest.permissions ?? fruit.permissions;
      fruit.standby = manifest.standby ?? fruit.standby;
      fruit.inheritance = manifest.inheritance ?? fruit.inheritance;
      fruit.monetization = manifest.monetization ?? fruit.monetization;
      fruit.passiveDistribution = manifest.passiveDistribution ?? fruit.passiveDistribution;
      fruit.publicRelease = manifest.publicRelease ?? fruit.publicRelease;
      fruit.publicMeasurement = manifest.publicMeasurement ?? fruit.publicMeasurement;
      fruit.growthLoop = manifest.growthLoop ?? fruit.growthLoop;
      fruit.manifestPath = manifest.manifestPath;
      fruit.status = moreAdvancedStage(fruit.status, manifest.stage ?? 'private_source_ready');
    }

    const opp = (garden.opportunities ?? []).find((x) => x.id === manifest.opportunityId);
    if (opp) {
      if (opp.fruitId !== fruit.id) changes.push(`${opp.id}:linked_${fruit.id}`);
      opp.fruitId = fruit.id;
      opp.productizationState = fruit.status;
    }
  }

  return { manifests, changes };
}

export async function verifyPrivateFruit(fruit) {
  if (fruit?.id !== 'fruit_social_preview_drift_guard') {
    return {
      pass: false,
      checks: [],
      reason: `No deterministic private verifier is registered for ${fruit?.id ?? 'unknown fruit'}.`,
    };
  }

  const checks = [];
  const html = `<!doctype html><html><head>
    <title>Flower Test</title>
    <link rel="canonical" href="/page">
    <meta property="og:title" content="Flower Test">
    <meta property="og:image" content="/image.jpg">
    <meta property="og:url" content="https://example.com/page">
    <meta name="twitter:card" content="summary_large_image">
  </head></html>`;
  const metadata = parseMetadata(html, 'https://example.com/page');
  checks.push({ name: 'metadata_parse', pass: metadata.og.imageResolved === 'https://example.com/image.jpg' && metadata.canonical === 'https://example.com/page' });

  const baseline = {
    profile: 'default', status: 200, finalUrl: 'https://example.com/page',
    metadata: { canonical: 'https://example.com/page', og: { title: 'A', imageResolved: 'https://example.com/a.jpg', urlResolved: 'https://example.com/page' }, twitter: { card: 'summary', imageResolved: null } },
  };
  const bot = structuredClone(baseline);
  bot.profile = 'facebook';
  bot.metadata.og.imageResolved = 'https://example.com/b.jpg';
  const drift = compareProfileResults([baseline, bot]);
  checks.push({ name: 'drift_detection', pass: drift.some((x) => x.code === 'PROFILE_METADATA_DRIFT' && x.severity === 'fail') });

  checks.push({ name: 'private_network_rejection', pass: !isPublicIp('127.0.0.1') && !isPublicIp('10.0.0.1') && isPublicIp('8.8.8.8') });
  checks.push({ name: 'fail_closed_scoring', pass: scoreIssues([{ severity: 'fail' }]).verdict === 'FAIL' });
  checks.push({ name: 'limited_permissions_target', pass: fruit.permissions === 'limited' });
  checks.push({ name: 'no_standby_target', pass: fruit.standby === false });
  checks.push({ name: 'ppe_target', pass: fruit.monetization?.preferredModel === 'pay_per_event' });

  return {
    pass: checks.every((x) => x.pass),
    checks,
    reason: checks.every((x) => x.pass)
      ? 'Private source passed deterministic structural verification. A real Apify run is still required before publication.'
      : 'One or more deterministic private-source checks failed.',
  };
}
