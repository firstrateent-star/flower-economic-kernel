import { OpenAIReasoner } from './openai.js';
import { buildReasonerGardenView } from '../core/reasoner-view.js';

export class EfficientOpenAIReasoner extends OpenAIReasoner {
  async reason(args) {
    const garden = buildReasonerGardenView({
      garden: args.garden,
      operation: args.operation,
      target: args.target ?? null,
    });
    return super.reason({ ...args, garden });
  }
}
