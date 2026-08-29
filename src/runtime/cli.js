import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { loadGarden, saveGarden, loadJson } from '../core/garden.js';
import { classifyPressure } from '../core/pressure.js';
import { pulse } from '../core/kernel.js';
import { OpenAIReasoner } from '../reasoners/openai.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const seedFile = path.join(root, 'garden/seed.json');
const stateFile = path.join(root, 'garden/state.json');
const command = process.argv[2] || 'status';

if (command === 'reset') {
  await fs.rm(stateFile, { force: true });
  console.log('Garden reset to seed on next load.');
  process.exit(0);
}

const garden = await loadGarden({ stateFile, seedFile });

if (command === 'status') {
  console.log(JSON.stringify({
    rootGoal: garden.center.rootGoal,
    generation: garden.status.generation,
    pressure: classifyPressure(garden),
    opportunities: garden.opportunities.map(({ id, name, status }) => ({ id, name, status })),
    fruits: garden.fruits.map(({ id, name, status, monthlyRevenueUsd }) => ({ id, name, status, monthlyRevenueUsd })),
    pendingApprovals: garden.approvals.filter((x) => x.status === 'pending').length,
    pulseCount: garden.status.pulseCount,
  }, null, 2));
  process.exit(0);
}

if (command === 'pulse') {
  const reasoner = new OpenAIReasoner();
  const maxBreaths = Math.max(1, Math.min(5, Number(process.env.FLOWER_MAX_BREATHS_PER_PULSE ?? 3)));
  const result = await pulse({ garden, reasoner, maxBreaths });
  await saveGarden(stateFile, garden);
  console.log(JSON.stringify({
    breaths: result.breaths.map((x) => ({ pressure: x.pressure.type, summary: x.result.summary })),
    nextPressure: classifyPressure(garden),
    stateFile,
  }, null, 2));
  process.exit(0);
}

if (command === 'seed') {
  console.log(JSON.stringify(await loadJson(seedFile), null, 2));
  process.exit(0);
}

throw new Error(`Unknown command: ${command}`);
