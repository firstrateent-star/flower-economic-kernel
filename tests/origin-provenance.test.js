import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const originSource = JSON.parse(
  await fs.readFile(new URL('../methodology/meta-learning/origin-episodes-v1.json', import.meta.url), 'utf8'),
);
const originDoc = await fs.readFile(
  new URL('../docs/FLOWER_ORIGIN_PROVENANCE.md', import.meta.url),
  'utf8',
);

test('Flower preserves the Flower of Life and dimensional inquiry as generative provenance', () => {
  const episode = originSource.episodes.find(
    (item) => item.id === 'meta_origin_flower_of_life_dimensional_inquiry',
  );
  assert.ok(episode);
  assert.match(episode.observedTrigger, /Flower of Life/);
  assert.match(episode.observedTrigger, /alternate dimension/);
  assert.equal(episode.humanEpistemicCorrection, true);
  assert.ok(episode.mechanismsApplied.includes('provenance_preserving_abstraction'));
});

test('origin preservation does not promote alternate-dimensional access into established physics', () => {
  assert.match(originDoc, /not a claim of established physics/i);
  assert.match(originDoc, /not currently possess verified evidence/i);
  assert.match(originDoc, /origin question/i);
});

test('origin memory separates rich generative history from compact executable abstraction', () => {
  assert.match(originDoc, /Generative provenance/);
  assert.match(originDoc, /Executable abstraction/);
  assert.match(originDoc, /P\(H\) = A/);
  assert.match(originDoc, /Compress execution without erasing generative provenance/);
});

test('origin remains retrievable without forcing itself into every runtime cognition payload', () => {
  assert.match(originDoc, /cold but retrievable/i);
  assert.match(originDoc, /not forcing it into every runtime cognition payload/i);
});
