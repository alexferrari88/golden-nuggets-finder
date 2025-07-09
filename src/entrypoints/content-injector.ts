import { ContentInjector } from '../content/content-injector';

export default defineUnlistedScript(() => {
  // Create and initialize the content injector
  const contentInjector = new ContentInjector();
  contentInjector.initialize();
});