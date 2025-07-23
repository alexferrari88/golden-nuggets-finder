import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Highlighter } from './highlighter';
import { GoldenNugget } from '../../shared/types';

/**
 * TDD Tests for the specific Substack page highlighting issues
 * Page: https://blog.jxmo.io/p/there-is-only-one-model
 * 
 * These tests reproduce the exact content and structure from the problematic page
 * to ensure highlighting works correctly for this specific scenario.
 */

describe('Substack Page Highlighting (TDD)', () => {
  let highlighter: Highlighter;

  beforeEach(() => {
    document.body.innerHTML = '';
    
    // Mock Substack URL
    Object.defineProperty(window, 'location', {
      value: {
        href: 'https://blog.jxmo.io/p/there-is-only-one-model',
        hostname: 'blog.jxmo.io'
      },
      writable: true
    });
    
    highlighter = new Highlighter();
  });

  const createMockNugget = (startContent: string, endContent: string, type: 'tool' | 'media' | 'explanation' | 'analogy' | 'model' = 'explanation'): GoldenNugget => ({
    type,
    startContent,
    endContent,
    synthesis: 'Test synthesis'
  });

  // Helper for creating nuggets from old content format (for test compatibility)
  const createMockNuggetFromContent = (content: string, type: 'tool' | 'media' | 'explanation' | 'analogy' | 'model' = 'explanation'): GoldenNugget => {
    const words = content.split(' ');
    const startWords = words.slice(0, Math.min(5, Math.floor(words.length / 3)));
    const endWords = words.slice(Math.max(5, words.length - 5));
    
    return createMockNugget(
      startWords.join(' '),
      endWords.join(' '),
      type
    );
  };

  describe('Actual Golden Nuggets from the problematic page', () => {
    it('should highlight the Mussolini/Bread analogy nugget with substantial content', async () => {
      const nugget = createMockNuggetFromContent(
        'Mussolini or Bread only works because you and I have a shared sense of semantics. Before we played this game, we never talked about whether Claude Shannon is semantically \'closer\' to Mussolini or Beckham. We never even talked about what it means for two things to be \'close\', even, or agreed on rules to the game. As you might imagine, the edge cases in M or B can be controversial. But I\'ve played this game with many people and people tend to "just get it" on their first try. How is that possible?',
        'analogy'
      );

      // Simulate real Substack article structure
      document.body.innerHTML = `
        <article>
          <div class="body markup">
            <paragraph>Growing up, I sometimes played a game with my friends called "Mussolini or Bread."</paragraph>
            <paragraph>It's a guessing game, kind of like Twenty Questions. The funny name comes from the idea that, in the space of everything, 'Mussolini' and 'bread' are about as far away from each other as you can get.</paragraph>
            <paragraph>How is this game possible? Mussolini or Bread only works because you and I have a shared sense of semantics. Before we played this game, we never talked about whether Claude Shannon is semantically 'closer' to Mussolini or Beckham. We never even talked about what it means for two things to be 'close', even, or agreed on rules to the game.</paragraph>
            <paragraph>As you might imagine, the edge cases in M or B can be controversial. But I've played this game with many people and people tend to "just get it" on their first try. How is that possible?</paragraph>
          </div>
        </article>
      `;

      const result = await highlighter.highlightNugget(nugget);
      
      expect(result).toBe(true);
      
      const highlights = document.querySelectorAll('.nugget-highlight');
      expect(highlights.length).toBeGreaterThan(0);
      
      // Should highlight substantial content, not tiny fragments
      const totalHighlightedText = Array.from(highlights)
        .map(h => h.textContent || '')
        .join(' ');
      
      // Must contain key parts of the nugget
      expect(totalHighlightedText).toContain('shared sense of semantics');
      expect(totalHighlightedText).toContain('Claude Shannon');
      expect(totalHighlightedText.length).toBeGreaterThan(100); // Substantial text

      // Visual styling should be prominent
      const highlight = highlights[0] as HTMLElement;
      expect(highlight.style.cssText).toContain('background-color');
      expect(highlight.style.cssText).toContain('!important');
      expect(highlight.style.cssText).toContain('border');
    });

    it('should highlight the compression/intelligence explanation nugget', async () => {
      const nugget = createMockNuggetFromContent(
        'One perspective on AI is that we\'re just learning to compress all the data in the world. In fact, the task of language modeling (predicting the next word) can be seen as a compression task, ever since Shannon\'s source coding theorem formalized the relationship between probability distributions and compression algorithms. In recent years, we\'ve developed much more accurate probability distributions of the world; this turned out to be easy, since bigger and bigger language models give us better and better probability distributions. Intelligence is compression, and compression follows scaling laws. And thus there is a duality between compression and intelligence. Compression is intelligence. Some have even said compression may be the way to AGI.',
        'explanation'
      );

      document.body.innerHTML = `
        <article>
          <div class="post-content">
            <p>Let's try to explain this through the lens of compression. One perspective on AI is that we're just learning to compress all the data in the world. In fact, the task of language modeling (predicting the next word) can be seen as a compression task, ever since <a href="https://en.wikipedia.org/wiki/Shannon%27s_source_coding_theorem">Shannon's source coding theorem</a> formalized the relationship between probability distributions and compression algorithms.</p>
            <p>In recent years, we've developed much more accurate probability distributions of the world; this turned out to be easy, since <a href="https://arxiv.org/abs/2001.08361">bigger and bigger language models</a> give us <a href="https://arxiv.org/abs/1712.00409">better and better probability distributions</a>.</p>
            <p>And with better probability distributions comes better compression. In practice, we find that a model that can compress real data better knows more about the world. And thus there is a duality between compression and intelligence. Compression <em>is</em> intelligence. Some have even said <a href="https://www.youtube.com/watch?v=dO4TPJkeaaU">compression may be the way to AGI</a>.</p>
          </div>
        </article>
      `;

      const result = await highlighter.highlightNugget(nugget);
      
      expect(result).toBe(true);
      
      const highlights = document.querySelectorAll('.nugget-highlight');
      expect(highlights.length).toBeGreaterThan(0);
      
      // Should find and highlight the compression content despite HTML fragmentation
      const totalHighlightedText = Array.from(highlights)
        .map(h => h.textContent || '')
        .join(' ');
      
      // Must contain key concepts
      expect(totalHighlightedText).toContain('compress all the data');
      expect(totalHighlightedText).toContain('language modeling');
      expect(totalHighlightedText).toContain('compression task');
      expect(totalHighlightedText.length).toBeGreaterThan(150); // Substantial explanation
    });

    it('should highlight the generalization explanation nugget', async () => {
      const nugget = createMockNuggetFromContent(
        'Generalization only begins when compression is no longer possible, since the model can\'t store data points separately and is forced to combine things. When a model can fit the training dataset perfectly (left side of both graphs) we see that it memorizes data really well, and totally fails to generalize. But when the dataset gets too big, and the model can no longer fit all of the data in its parameters, it\'s forced to "combine" information from multiple datapoints in order to get the best training loss. This is where generalization occurs. And the central idea I\'ll push here is that when generalization occurs, it usually occurs in the same way, even within different models. From the compression perspective, under a given architecture and within a fixed number of parameters, there is only one way to compress the data well.',
        'explanation'
      );

      document.body.innerHTML = `
        <article>
          <p>When a model can fit the training dataset perfectly (left side of both graphs) we see that it memorizes data really well, and totally fails to generalize. But when the dataset gets too big, and the model can no longer fit all of the data in its parameters, it's forced to "combine" information from multiple datapoints in order to get the best training loss. This is where generalization occurs.</p>
          <p>And the central idea I'll push here is that when generalization occurs, <em>it usually occurs in the same way</em>, even within different models. From the compression perspective, under a given architecture and within a fixed number of parameters, <em>there is only one way to compress the data well</em>. This sounds like a crazy idea–and it is– but across different domains and models, there turns out to be a lot of evidence for this phenomenon.</p>
        </article>
      `;

      const result = await highlighter.highlightNugget(nugget);
      
      expect(result).toBe(true);
      
      const highlights = document.querySelectorAll('.nugget-highlight');
      expect(highlights.length).toBeGreaterThan(0);
      
      const totalHighlightedText = Array.from(highlights)
        .map(h => h.textContent || '')
        .join(' ');
      
      // Should contain key parts of the technical explanation
      expect(totalHighlightedText).toContain('memorizes data really well');
      expect(totalHighlightedText).toContain('combine information');
      expect(totalHighlightedText).toContain('generalization occurs');
      expect(totalHighlightedText.length).toBeGreaterThan(100);
    });

    it('should handle the Platonic Representation Hypothesis nugget', async () => {
      const nugget = createMockNuggetFromContent(
        'The theory that models are converging to a shared underlying representation space was formalized in The Platonic Representation Hypothesis, a position paper written by a group of MIT researchers in 2024. The Platonic Representation Hypothesis argues that as models get bigger, they\'re learning more and more of the same features. They provide evidence for this in vision and language. The Platonic Representation Hypothesis argues that models are converging to a shared representation space, and this is becoming more true as we make models bigger and smarter. This is true in text and language, at a minimum, Remember the trends in scaling show that models are getting all three of bigger, smarter, and more efficient every year. That means that we can expect models to get more similar, too, as the years go on.',
        'model'
      );

      document.body.innerHTML = `
        <article>
          <p>As models have gotten bigger, their similarities have become more apparent. The theory that models are converging to a shared underlying representation space was formalized in <strong>The Platonic Representation Hypothesis</strong>, <a href="https://arxiv.org/abs/2405.07987">a position paper written by a group of MIT researchers in 2024</a>.</p>
          <p>The Platonic Representation Hypothesis argues that models are converging to a shared representation space, and this is becoming more true as we make models bigger and smarter. This is true in text and language, at a minimum,</p>
          <p>Remember <a href="https://situational-awareness.ai/">the trends in scaling</a> show that models are getting all three of bigger, smarter, and more efficient every year. That means that we can expect models to get <em>more similar</em>, too, as the years go on.</p>
        </article>
      `;

      const result = await highlighter.highlightNugget(nugget);
      
      expect(result).toBe(true);
      
      const highlights = document.querySelectorAll('.nugget-highlight');
      expect(highlights.length).toBeGreaterThan(0);
      
      const totalHighlightedText = Array.from(highlights)
        .map(h => h.textContent || '')
        .join(' ');
      
      // Should find the key content about PRH
      expect(totalHighlightedText).toContain('Platonic Representation Hypothesis');
      expect(totalHighlightedText).toContain('shared representation space');
      expect(totalHighlightedText.length).toBeGreaterThan(80);
    });
  });

  describe('Container-based highlighting effectiveness', () => {
    it('should use container-based approach for article content effectively', async () => {
      const nugget = createMockNuggetFromContent('test content for container highlighting');
      
      document.body.innerHTML = `
        <article>
          <div class="body markup">
            <p>This contains test content for container highlighting that should be found.</p>
          </div>
        </article>
      `;

      const result = await highlighter.highlightNugget(nugget);
      
      expect(result).toBe(true);
      
      // Should find the content in the article container
      const highlights = document.querySelectorAll('.nugget-highlight');
      expect(highlights.length).toBeGreaterThan(0);
    });

    it('should prioritize article containers over paragraph fragments', async () => {
      const nugget = createMockNuggetFromContent('important content spans multiple elements');
      
      document.body.innerHTML = `
        <div>
          <span>important</span>
          <span>content</span>
          <span>spans</span>
          <span>multiple</span>
          <span>elements</span>
        </div>
        <article>
          <p>This paragraph contains important content spans multiple elements in a better context.</p>
        </article>
      `;

      const result = await highlighter.highlightNugget(nugget);
      
      expect(result).toBe(true);
      
      // Should highlight the substantial content in the article, not tiny fragments
      const highlights = document.querySelectorAll('.nugget-highlight');
      expect(highlights.length).toBeGreaterThan(0);
      
      const highlightedText = Array.from(highlights)
        .map(h => h.textContent || '')
        .join(' ');
      
      // Should get the full phrase in context, not just fragments
      expect(highlightedText.length).toBeGreaterThan(20);
      expect(highlightedText).toContain('important content spans multiple elements');
    });
  });

  describe('Visual styling requirements', () => {
    it('should apply highly visible styling that overrides site CSS', async () => {
      const nugget = createMockNuggetFromContent('visible content');
      
      // Simulate Substack's potentially aggressive CSS
      document.body.innerHTML = `
        <style>
          p { background: white !important; color: #333 !important; }
        </style>
        <article>
          <p style="background: white !important;">This has visible content that needs highlighting.</p>
        </article>
      `;

      const result = await highlighter.highlightNugget(nugget);
      
      expect(result).toBe(true);
      
      const highlight = document.querySelector('.nugget-highlight') as HTMLElement;
      expect(highlight).toBeTruthy();
      
      // Should use !important to override site styles
      expect(highlight.style.cssText).toContain('!important');
      
      // Should have strong visual indicators
      expect(highlight.style.cssText).toContain('background-color');
      expect(highlight.style.cssText).toContain('border');
      expect(highlight.style.cssText).toContain('box-shadow');
      
      // Should have sufficient padding and spacing
      expect(highlight.style.cssText).toContain('padding');
      expect(highlight.style.cssText).toContain('border-radius');
    });

    it('should create highlights with strong visual contrast', async () => {
      const nugget = createMockNuggetFromContent('contrast test');
      
      document.body.innerHTML = `<p>This is contrast test content.</p>`;

      const result = await highlighter.highlightNugget(nugget);
      
      expect(result).toBe(true);
      
      const highlight = document.querySelector('.nugget-highlight') as HTMLElement;
      expect(highlight).toBeTruthy();
      
      // Should have strong enough styling to be clearly visible
      const style = highlight.style;
      
      // Must have background color that stands out
      expect(style.backgroundColor).toBeTruthy();
      
      // Must have border for definition
      expect(style.border).toBeTruthy();
      
      // Must have shadow for depth
      expect(style.boxShadow).toBeTruthy();
      
      // Should have proper z-index to appear above content
      expect(style.zIndex).toBeTruthy();
    });
  });

  describe('Key phrase extraction and highlighting', () => {
    it('should extract and highlight meaningful key phrases from complex nuggets', async () => {
      const nugget = createMockNuggetFromContent(
        'We realized after a while that this problem has been solved at least once in the deep learning world: work on a model called CycleGAN proposed a way to translate between spaces without correspondence using a method called cycle consistency. And, after at least a year of ruthlessly debugging our own embedding-specific version of CycleGAN, we started to see signs of life.',
        'tool'
      );

      document.body.innerHTML = `
        <article>
          <p>We realized after a while that this problem has been solved at least once in the deep learning world: work on a model called CycleGAN proposed a way to translate between spaces without correspondence using a method called cycle consistency:</p>
          <p>And, after at least a year of ruthlessly debugging our own embedding-specific version of CycleGAN, we started to see signs of life. In our unsupervised matching task we started to produce GIFs like this:</p>
        </article>
      `;

      const result = await highlighter.highlightNugget(nugget);
      
      expect(result).toBe(true);
      
      const highlights = document.querySelectorAll('.nugget-highlight');
      expect(highlights.length).toBeGreaterThan(0);
      
      const totalHighlightedText = Array.from(highlights)
        .map(h => h.textContent || '')
        .join(' ');
      
      // Should contain key technical terms
      expect(totalHighlightedText).toContain('CycleGAN');
      expect(totalHighlightedText).toContain('cycle consistency');
      expect(totalHighlightedText).toContain('embedding-specific');
      expect(totalHighlightedText.length).toBeGreaterThan(50);
    });

    it('should prioritize highlighting substantial content over tiny matches', async () => {
      const nugget = createMockNuggetFromContent('vision and strategy');
      
      document.body.innerHTML = `
        <div>
          <span>vision</span>
          <span>strategy</span>
        </div>
        <article>
          <p>This article discusses vision and strategy in organizational leadership, exploring how companies develop long-term thinking.</p>
        </article>
      `;

      const result = await highlighter.highlightNugget(nugget);
      
      if (result) {
        const highlights = document.querySelectorAll('.nugget-highlight');
        
        // Should prioritize the substantial content over fragments
        const substantialHighlights = Array.from(highlights).filter(h => {
          const text = h.textContent || '';
          return text.length > 10; // Meaningful content, not just "vision" or "strategy"
        });
        
        expect(substantialHighlights.length).toBeGreaterThan(0);
      }
    });
  });
});