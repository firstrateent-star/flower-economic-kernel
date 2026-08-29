export class MockReasoner {
  constructor(fixtures = {}) {
    this.fixtures = fixtures;
  }

  async reason({ operation }) {
    const value = this.fixtures[operation];
    if (value instanceof Error) throw value;
    if (!value) return { data: {}, sources: [], rawId: 'mock' };
    return structuredClone(value);
  }
}
