// Generated by wxt
import "wxt/browser";

declare module "wxt/browser" {
  export type PublicPath =
    | ""
    | "/"
    | "/Readability.js"
    | "/assets/icon128.png"
    | "/assets/icon16.png"
    | "/assets/icon32.png"
    | "/background.js"
    | "/content-scripts/content.js"
    | "/options.html"
    | "/options.js"
    | "/popup.html"
    | "/popup.js"
  type HtmlPublicPath = Extract<PublicPath, `${string}.html`>
  export interface WxtRuntime {
    getURL(path: PublicPath): string;
    getURL(path: `${HtmlPublicPath}${string}`): string;
  }
}
