import { describe, expect, it } from "vitest";
import { processPromptTemplate } from "./constants";

describe("processPromptTemplate", () => {
	it("should process conditional synthesis blocks with synthesisEnabled=true", () => {
		const template = `
## ROLE & GOAL:
You are an AI.

{{#if synthesisEnabled}}
## SYNTHESIS REQUIREMENT:
For each extracted nugget, provide a "synthesis" field explaining why this content is valuable.
{{else}}
## EXTRACTION FOCUS:
Extract only the raw, high-quality content without explanations.
{{/if}}

## EXTRACTION TARGETS:
Find golden nuggets.
		`.trim();

		const result = processPromptTemplate(template, true);

		expect(result).toContain("## SYNTHESIS REQUIREMENT:");
		expect(result).toContain(
			'For each extracted nugget, provide a "synthesis" field explaining why this content is valuable.',
		);
		expect(result).not.toContain("## EXTRACTION FOCUS:");
		expect(result).not.toContain(
			"Extract only the raw, high-quality content without explanations.",
		);
		expect(result).not.toContain("{{#if synthesisEnabled}}");
		expect(result).not.toContain("{{else}}");
		expect(result).not.toContain("{{/if}}");
	});

	it("should process conditional synthesis blocks with synthesisEnabled=false", () => {
		const template = `
## ROLE & GOAL:
You are an AI.

{{#if synthesisEnabled}}
## SYNTHESIS REQUIREMENT:
For each extracted nugget, provide a "synthesis" field explaining why this content is valuable.
{{else}}
## EXTRACTION FOCUS:
Extract only the raw, high-quality content without explanations.
{{/if}}

## EXTRACTION TARGETS:
Find golden nuggets.
		`.trim();

		const result = processPromptTemplate(template, false);

		expect(result).not.toContain("## SYNTHESIS REQUIREMENT:");
		expect(result).not.toContain(
			'For each extracted nugget, provide a "synthesis" field explaining why this content is valuable.',
		);
		expect(result).toContain("## EXTRACTION FOCUS:");
		expect(result).toContain(
			"Extract only the raw, high-quality content without explanations.",
		);
		expect(result).not.toContain("{{#if synthesisEnabled}}");
		expect(result).not.toContain("{{else}}");
		expect(result).not.toContain("{{/if}}");
	});

	it("should handle multiple conditional blocks in the same template", () => {
		const template = `
{{#if synthesisEnabled}}
First synthesis block
{{else}}
First raw block
{{/if}}

Some content in between.

{{#if synthesisEnabled}}
Second synthesis block
{{else}}
Second raw block
{{/if}}
		`.trim();

		const resultTrue = processPromptTemplate(template, true);
		expect(resultTrue).toContain("First synthesis block");
		expect(resultTrue).toContain("Second synthesis block");
		expect(resultTrue).not.toContain("First raw block");
		expect(resultTrue).not.toContain("Second raw block");

		const resultFalse = processPromptTemplate(template, false);
		expect(resultFalse).not.toContain("First synthesis block");
		expect(resultFalse).not.toContain("Second synthesis block");
		expect(resultFalse).toContain("First raw block");
		expect(resultFalse).toContain("Second raw block");
	});

	it("should handle templates without conditional blocks", () => {
		const template = `
## ROLE & GOAL:
You are an AI.

## EXTRACTION TARGETS:
Find golden nuggets.
		`.trim();

		const result = processPromptTemplate(template, true);
		expect(result).toBe(template);

		const result2 = processPromptTemplate(template, false);
		expect(result2).toBe(template);
	});

	it("should handle conditional blocks with varying whitespace", () => {
		const template = `
{{#if     synthesisEnabled   }}
Synthesis content
{{   else   }}
Raw content
{{  /if  }}
		`.trim();

		const resultTrue = processPromptTemplate(template, true);
		expect(resultTrue).toContain("Synthesis content");
		expect(resultTrue).not.toContain("Raw content");

		const resultFalse = processPromptTemplate(template, false);
		expect(resultFalse).not.toContain("Synthesis content");
		expect(resultFalse).toContain("Raw content");
	});

	it("should preserve proper formatting by trimming conditional block content", () => {
		const template = `
Before block
{{#if synthesisEnabled}}

Synthesis with leading/trailing whitespace

{{else}}

Raw with leading/trailing whitespace

{{/if}}
After block
		`.trim();

		const resultTrue = processPromptTemplate(template, true);
		expect(resultTrue).toBe(
			"Before block\nSynthesis with leading/trailing whitespace\nAfter block",
		);

		const resultFalse = processPromptTemplate(template, false);
		expect(resultFalse).toBe(
			"Before block\nRaw with leading/trailing whitespace\nAfter block",
		);
	});
});
