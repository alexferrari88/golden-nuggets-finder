import { ContentInjector } from '../content/content-injector';

export default defineUnlistedScript(() => {
  // Use the global instance to prevent multiple initializations
  const contentInjector = (window as any).contentInjector || new ContentInjector();
  (window as any).contentInjector = contentInjector;
  contentInjector.initialize();
});