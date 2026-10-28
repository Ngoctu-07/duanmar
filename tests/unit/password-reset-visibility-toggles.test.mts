import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { NewPasswordStep } from "../../src/components/auth/password-recovery-steps.tsx";

/**
 * Reset-password modal → "ĐẶT MẬT KHẨU MỚI" step.
 *
 * Both fields embed the shared eye / eye-off toggle, and each toggle keeps its
 * own visibility state: revealing the new password must NOT reveal the
 * confirmation field (and vice versa). Fields stay `type="password"` by
 * default so autofill + form semantics are unchanged.
 */

const req = createRequire(new URL("../../package.json", import.meta.url));
const { JSDOM } = req("jsdom") as typeof import("jsdom");

const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
});

const globalWithDom = globalThis as typeof globalThis & {
  window: Window & typeof globalThis;
  document: Document;
  navigator: Navigator;
  HTMLElement: typeof HTMLElement;
  IS_REACT_ACT_ENVIRONMENT: boolean;
};
globalWithDom.window = dom.window as unknown as Window & typeof globalThis;
globalWithDom.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: dom.window.navigator,
});
globalWithDom.HTMLElement = dom.window.HTMLElement;
globalWithDom.IS_REACT_ACT_ENVIRONMENT = true;

// Load these AFTER the DOM globals exist so React binds to jsdom, not a stub.
const React = req("react") as typeof import("react");
const { createRoot } = req("react-dom/client") as typeof import("react-dom/client");
const { NextIntlClientProvider } = req("next-intl") as typeof import("next-intl");

const messages = JSON.parse(
  readFileSync(new URL("../../src/messages/en.json", import.meta.url), "utf8")
) as Record<string, unknown>;

const container = dom.window.document.getElementById("root") as HTMLElement;
const root = createRoot(container);

const render = () => {
  React.act(() => {
    root.render(
      React.createElement(
        NextIntlClientProvider,
        { locale: "en", timeZone: "Asia/Ho_Chi_Minh", messages },
        React.createElement(NewPasswordStep, {
          password: "",
          confirmPassword: "",
          onPasswordChange: () => undefined,
          onConfirmChange: () => undefined,
          busy: false,
          onSubmit: (event: { preventDefault: () => void }) => event.preventDefault(),
        })
      )
    );
  });
};

const click = (selector: string) => {
  const button = dom.window.document.querySelector(selector) as HTMLElement | null;
  assert.ok(button, `missing toggle ${selector}`);
  React.act(() => {
    button.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  });
};

const typeOf = (id: string) =>
  (dom.window.document.getElementById(id) as HTMLInputElement | null)?.type;

let passed = 0;
let failed = 0;
const check = (name: string, fn: () => void) => {
  try {
    fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name} :: ${(error as Error).message}`);
  }
};

const NEW_TOGGLE = '[data-testid="recovery-password-visibility-toggle"]';
const CONFIRM_TOGGLE = '[data-testid="recovery-confirm-visibility-toggle"]';

render();

check("both reset fields start masked and expose their own toggle", () => {
  assert.equal(typeOf("recovery-password"), "password");
  assert.equal(typeOf("recovery-confirm"), "password");
  assert.ok(dom.window.document.querySelector(NEW_TOGGLE));
  assert.ok(dom.window.document.querySelector(CONFIRM_TOGGLE));
});

check("revealing the new password leaves the confirm field masked", () => {
  click(NEW_TOGGLE);
  assert.equal(typeOf("recovery-password"), "text");
  assert.equal(typeOf("recovery-confirm"), "password");
});

check("revealing the confirm field does not re-hide the new password", () => {
  click(CONFIRM_TOGGLE);
  assert.equal(typeOf("recovery-password"), "text");
  assert.equal(typeOf("recovery-confirm"), "text");
});

check("hiding the new password leaves the confirm field visible", () => {
  click(NEW_TOGGLE);
  assert.equal(typeOf("recovery-password"), "password");
  assert.equal(typeOf("recovery-confirm"), "text");
});

check("toggle exposes aria-pressed matching its own visibility", () => {
  const newToggle = dom.window.document.querySelector(NEW_TOGGLE) as HTMLElement;
  const confirmToggle = dom.window.document.querySelector(CONFIRM_TOGGLE) as HTMLElement;
  assert.equal(newToggle.getAttribute("aria-pressed"), "false");
  assert.equal(confirmToggle.getAttribute("aria-pressed"), "true");
});

React.act(() => {
  root.unmount();
});
dom.window.close();

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
