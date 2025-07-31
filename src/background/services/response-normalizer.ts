import { GoldenNuggetsResponse, ProviderId } from '../../shared/types/providers';
import { z } from 'zod';

const GoldenNuggetsSchema = z.object({
  golden_nuggets: z.array(z.object({
    type: z.enum(['tool', 'media', 'explanation', 'analogy', 'model']),
    content: z.string(),
    synthesis: z.string()
  }))
});

export class ResponseNormalizer {
  static normalize(response: any, providerId: ProviderId): GoldenNuggetsResponse {
    try {
      // Pre-process response to convert non-string values before validation
      const preprocessed = this.preprocessResponse(response);
      
      // Validate response structure
      const validated = GoldenNuggetsSchema.parse(preprocessed);
      
      // Ensure content and synthesis are strings and non-empty
      const normalized = {
        golden_nuggets: validated.golden_nuggets.map(nugget => ({
          type: nugget.type,
          content: String(nugget.content).trim(),
          synthesis: String(nugget.synthesis).trim()
        })).filter(nugget => nugget.content && nugget.synthesis)
      };

      return normalized;
    } catch (error) {
      console.error(`Response normalization failed for ${providerId}:`, error);
      console.error('Raw response:', response);
      
      // Return empty response rather than throwing
      return { golden_nuggets: [] };
    }
  }

  private static preprocessResponse(response: any): any {
    if (!response || typeof response !== 'object') {
      return response;
    }

    if (!Array.isArray(response.golden_nuggets)) {
      return response;
    }

    return {
      ...response,
      golden_nuggets: response.golden_nuggets.map((nugget: any) => ({
        ...nugget,
        content: String(nugget.content || ''),
        synthesis: String(nugget.synthesis || '')
      }))
    };
  }

  static validate(response: any): boolean {
    try {
      GoldenNuggetsSchema.parse(response);
      return true;
    } catch {
      return false;
    }
  }
}