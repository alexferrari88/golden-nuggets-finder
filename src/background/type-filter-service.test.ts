import { describe, it, expect } from 'vitest';
import { TypeFilterService } from './type-filter-service';
import { generateGoldenNuggetSchema, ALL_NUGGET_TYPES } from '../shared/schemas';
import type { GoldenNuggetType } from '../shared/schemas';

describe('TypeFilterService', () => {
	describe('generateFilteredPrompt', () => {
		const basePrompt = `# Base Prompt

## EXTRACTION TARGETS ("Golden Nuggets"):
1. **Actionable Tools:** Original tool definition
2. **High-Signal Media:** Original media definition  
3. **Deep Explanations:** Original explanation definition
4. **Powerful Analogies:** Original analogy definition
5. **Mental Models:** Original model definition

## ANALYSIS INSTRUCTIONS
Continue with analysis...`;

		it('should return base prompt unchanged when no types selected', () => {
			const result = TypeFilterService.generateFilteredPrompt(basePrompt, []);
			expect(result).toBe(basePrompt);
		});

		it('should filter prompt to only include selected single type', () => {
			const result = TypeFilterService.generateFilteredPrompt(basePrompt, ['tool']);
			
			expect(result).toContain('## EXTRACTION TARGETS');
			expect(result).toContain('1. **Actionable Tools:**');
			expect(result).not.toContain('2. **High-Signal Media:**');
			expect(result).not.toContain('**Deep Explanations:**');
			expect(result).not.toContain('**Powerful Analogies:**');
			expect(result).not.toContain('**Mental Models:**');
		});

		it('should filter prompt to include multiple selected types with renumbering', () => {
			const result = TypeFilterService.generateFilteredPrompt(basePrompt, ['tool', 'media']);
			
			expect(result).toContain('## EXTRACTION TARGETS');
			expect(result).toContain('1. **Actionable Tools:**');
			expect(result).toContain('2. **High-Signal Media:**');
			expect(result).not.toContain('**Deep Explanations:**');
			expect(result).not.toContain('**Powerful Analogies:**');
			expect(result).not.toContain('**Mental Models:**');
		});

		it('should preserve analysis instructions section', () => {
			const result = TypeFilterService.generateFilteredPrompt(basePrompt, ['tool']);
			
			expect(result).toContain('## ANALYSIS INSTRUCTIONS');
			expect(result).toContain('Continue with analysis...');
		});

		it('should include complete type definitions with examples', () => {
			const result = TypeFilterService.generateFilteredPrompt(basePrompt, ['tool']);
			
			expect(result).toContain('A specific, tool/software/technique');
			expect(result).toContain('**Bad:** "You should use a calendar."');
			expect(result).toContain('**Good:** "I use Trello\'s calendar power-up');
		});

		it('should handle all types selection (maintain original numbering)', () => {
			const allTypes: GoldenNuggetType[] = ['tool', 'media', 'explanation', 'analogy', 'model'];
			const result = TypeFilterService.generateFilteredPrompt(basePrompt, allTypes);
			
			expect(result).toContain('1. **Actionable Tools:**');
			expect(result).toContain('2. **High-Signal Media:**');
			expect(result).toContain('3. **Deep Explanations:**');
			expect(result).toContain('4. **Powerful Analogies:**');
			expect(result).toContain('5. **Mental Models:**');
		});

		it('should handle missing EXTRACTION TARGETS section gracefully', () => {
			const promptWithoutTargets = '# Simple prompt without extraction targets section';
			const result = TypeFilterService.generateFilteredPrompt(promptWithoutTargets, ['tool']);
			
			// Should return original prompt since no EXTRACTION TARGETS section exists
			expect(result).toBe(promptWithoutTargets);
		});
	});

	describe('generateDynamicSchema', () => {
		it('should generate schema with selected types enum', () => {
			const selectedTypes: GoldenNuggetType[] = ['tool', 'media'];
			const result = TypeFilterService.generateDynamicSchema(selectedTypes);
			
			expect(result.properties.golden_nuggets.items.properties.type.enum).toEqual(['tool', 'media']);
		});

		it('should generate schema with all types when empty array provided', () => {
			const result = TypeFilterService.generateDynamicSchema([]);
			
			expect(result.properties.golden_nuggets.items.properties.type.enum).toEqual(ALL_NUGGET_TYPES);
		});

		it('should generate schema with single type', () => {
			const result = TypeFilterService.generateDynamicSchema(['analogy']);
			
			expect(result.properties.golden_nuggets.items.properties.type.enum).toEqual(['analogy']);
		});

		it('should maintain schema structure consistency with base schema', () => {
			const result = TypeFilterService.generateDynamicSchema(['tool']);
			const baseSchema = generateGoldenNuggetSchema(['tool']);
			
			expect(result.type).toBe('object');
			expect(result.required).toEqual(['golden_nuggets']);
			expect(result.properties.golden_nuggets.type).toBe('array');
			expect(result.properties.golden_nuggets.items.required).toEqual(['type', 'startContent', 'endContent', 'synthesis']);
		});
	});

	describe('validateSelectedTypes', () => {
		it('should return true for valid single type', () => {
			expect(TypeFilterService.validateSelectedTypes(['tool'])).toBe(true);
			expect(TypeFilterService.validateSelectedTypes(['media'])).toBe(true);
			expect(TypeFilterService.validateSelectedTypes(['explanation'])).toBe(true);
			expect(TypeFilterService.validateSelectedTypes(['analogy'])).toBe(true);
			expect(TypeFilterService.validateSelectedTypes(['model'])).toBe(true);
		});

		it('should return true for valid multiple types', () => {
			expect(TypeFilterService.validateSelectedTypes(['tool', 'media'])).toBe(true);
			expect(TypeFilterService.validateSelectedTypes(['explanation', 'analogy', 'model'])).toBe(true);
		});

		it('should return true for all valid types', () => {
			const allTypes: GoldenNuggetType[] = ['tool', 'media', 'explanation', 'analogy', 'model'];
			expect(TypeFilterService.validateSelectedTypes(allTypes)).toBe(true);
		});

		it('should return true for empty array', () => {
			expect(TypeFilterService.validateSelectedTypes([])).toBe(true);
		});

		it('should return false for invalid types', () => {
			// @ts-expect-error Testing invalid input
			expect(TypeFilterService.validateSelectedTypes(['invalid'])).toBe(false);
			// @ts-expect-error Testing invalid input
			expect(TypeFilterService.validateSelectedTypes(['tool', 'invalid'])).toBe(false);
		});

		it('should return false for mixed valid and invalid types', () => {
			// @ts-expect-error Testing invalid input
			expect(TypeFilterService.validateSelectedTypes(['tool', 'media', 'fake'])).toBe(false);
		});
	});

	describe('getTypeConfiguration', () => {
		it('should return correct configuration for each type', () => {
			expect(TypeFilterService.getTypeConfiguration('tool')).toEqual({
				type: 'tool',
				label: 'Tools',
				emoji: '🛠️'
			});

			expect(TypeFilterService.getTypeConfiguration('media')).toEqual({
				type: 'media',
				label: 'Media',
				emoji: '📚'
			});

			expect(TypeFilterService.getTypeConfiguration('explanation')).toEqual({
				type: 'explanation',
				label: 'Explanations',
				emoji: '💡'
			});

			expect(TypeFilterService.getTypeConfiguration('analogy')).toEqual({
				type: 'analogy',
				label: 'Analogies',
				emoji: '🌉'
			});

			expect(TypeFilterService.getTypeConfiguration('model')).toEqual({
				type: 'model',
				label: 'Mental Models',
				emoji: '🧠'
			});
		});

		it('should return undefined for invalid type', () => {
			// @ts-expect-error Testing invalid input
			expect(TypeFilterService.getTypeConfiguration('invalid')).toBeUndefined();
		});
	});

	describe('getContextMenuOption', () => {
		it('should return correct option for "all" types', () => {
			const option = TypeFilterService.getContextMenuOption('all');
			
			expect(option).toEqual({
				id: 'all',
				title: '🔍 All Types',
				types: ['tool', 'media', 'explanation', 'analogy', 'model']
			});
		});

		it('should return correct option for single types', () => {
			expect(TypeFilterService.getContextMenuOption('tool')).toEqual({
				id: 'tool',
				title: '🛠️ Tools Only',
				types: ['tool']
			});

			expect(TypeFilterService.getContextMenuOption('media')).toEqual({
				id: 'media',
				title: '📚 Media Only',
				types: ['media']
			});
		});

		it('should return undefined for invalid option ID', () => {
			expect(TypeFilterService.getContextMenuOption('invalid')).toBeUndefined();
		});

		it('should return undefined for empty string', () => {
			expect(TypeFilterService.getContextMenuOption('')).toBeUndefined();
		});
	});

	describe('createDefaultTypeFilter', () => {
		it('should create filter with all types selected', () => {
			const filter = TypeFilterService.createDefaultTypeFilter();
			
			expect(filter).toEqual({
				selectedTypes: ['tool', 'media', 'explanation', 'analogy', 'model'],
				analysisMode: 'combination'
			});
		});

		it('should create new instance each time', () => {
			const filter1 = TypeFilterService.createDefaultTypeFilter();
			const filter2 = TypeFilterService.createDefaultTypeFilter();
			
			expect(filter1).not.toBe(filter2); // Different instances
			expect(filter1).toEqual(filter2); // Same content
		});
	});

	describe('createSingleTypeFilter', () => {
		it('should create filter with single type', () => {
			const filter = TypeFilterService.createSingleTypeFilter('tool');
			
			expect(filter).toEqual({
				selectedTypes: ['tool'],
				analysisMode: 'single'
			});
		});

		it('should work for all valid types', () => {
			const types: GoldenNuggetType[] = ['tool', 'media', 'explanation', 'analogy', 'model'];
			
			types.forEach(type => {
				const filter = TypeFilterService.createSingleTypeFilter(type);
				expect(filter.selectedTypes).toEqual([type]);
				expect(filter.analysisMode).toBe('single');
			});
		});
	});

	describe('createCombinationTypeFilter', () => {
		it('should create filter with multiple types', () => {
			const types: GoldenNuggetType[] = ['tool', 'media'];
			const filter = TypeFilterService.createCombinationTypeFilter(types);
			
			expect(filter).toEqual({
				selectedTypes: ['tool', 'media'],
				analysisMode: 'combination'
			});
		});

		it('should handle single type in combination mode', () => {
			const filter = TypeFilterService.createCombinationTypeFilter(['explanation']);
			
			expect(filter).toEqual({
				selectedTypes: ['explanation'],
				analysisMode: 'combination'
			});
		});

		it('should handle empty array', () => {
			const filter = TypeFilterService.createCombinationTypeFilter([]);
			
			expect(filter).toEqual({
				selectedTypes: [],
				analysisMode: 'combination'
			});
		});

		it('should preserve type order', () => {
			const types: GoldenNuggetType[] = ['model', 'tool', 'analogy'];
			const filter = TypeFilterService.createCombinationTypeFilter(types);
			
			expect(filter.selectedTypes).toEqual(['model', 'tool', 'analogy']);
		});
	});

	describe('TYPE_DEFINITIONS consistency', () => {
		it('should have definitions for all nugget types', () => {
			const types: GoldenNuggetType[] = ['tool', 'media', 'explanation', 'analogy', 'model'];
			
			types.forEach(type => {
				expect(TypeFilterService['TYPE_DEFINITIONS'][type]).toBeDefined();
				expect(TypeFilterService['TYPE_DEFINITIONS'][type]).toContain('**Bad:**');
				expect(TypeFilterService['TYPE_DEFINITIONS'][type]).toContain('**Good:**');
			});
		});
	});

	describe('CONTEXT_MENU_OPTIONS consistency', () => {
		it('should have options for all types plus "all"', () => {
			const expectedIds = ['all', 'tool', 'media', 'explanation', 'analogy', 'model'];
			const actualIds = TypeFilterService.CONTEXT_MENU_OPTIONS.map(option => option.id);
			
			expect(actualIds).toEqual(expectedIds);
		});

		it('should have consistent emoji usage with TYPE_CONFIGURATIONS', () => {
			TypeFilterService.TYPE_CONFIGURATIONS.forEach(config => {
				const menuOption = TypeFilterService.getContextMenuOption(config.type);
				expect(menuOption?.title).toContain(config.emoji);
			});
		});
	});

	describe('Integration with schema generation', () => {
		it('should produce schemas compatible with generateGoldenNuggetSchema', () => {
			const types: GoldenNuggetType[] = ['tool', 'media'];
			const filterServiceSchema = TypeFilterService.generateDynamicSchema(types);
			const directSchema = generateGoldenNuggetSchema(types);
			
			expect(filterServiceSchema).toEqual(directSchema);
		});
	});
});