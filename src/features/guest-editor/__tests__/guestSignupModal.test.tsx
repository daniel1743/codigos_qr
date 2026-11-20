// @vitest-environment happy-dom
/**
 * Guest Editor V1 - G5 tests: the contextual signup gate.
 *
 * What matters here is that the gate (1) shows the agreed copy, (2) never blocks
 * free editing (secondary/Escape close it), and (3) persists the draft BEFORE it
 * sends anyone to the registration flow.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigate = vi.fn(async () => {});
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
}));

const { CREATION_INTENT_KEY } = await import("../../landing-lite/creationIntent");
const { GUEST_SIGNUP_COPY, GuestSignupModal } = await import("../GuestSignupModal");

function mount(
  props: {
    open?: boolean;
    reason?: "save" | "publish";
    onClose?: () => void;
    onBeforeLeave?: () => void;
  } = {},
) {
  const onClose = props.onClose ?? vi.fn();
  const onBeforeLeave = props.onBeforeLeave ?? vi.fn();
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() =>
    root.render(
      <GuestSignupModal
        open={props.open ?? true}
        reason={props.reason ?? "save"}
        onClose={onClose}
        onBeforeLeave={onBeforeLeave}
      />,
    ),
  );
  return {
    host,
    onClose,
    onBeforeLeave,
    unmount: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
}

beforeEach(() => {
  navigate.mockClear();
  window.sessionStorage.clear();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

describe("guest signup gate (G5)", () => {
  it("renders nothing while closed", () => {
    const { host, unmount } = mount({ open: false });
    expect(host.querySelector('[data-testid="guest-signup-modal"]')).toBeNull();
    unmount();
  });

  it("shows the agreed copy and the reason line", () => {
    const { host, unmount } = mount({ reason: "publish" });
    const panel = host.querySelector('[data-testid="guest-signup-modal"]');
    expect(panel).not.toBeNull();
    expect(panel?.getAttribute("aria-modal")).toBe("true");
    expect(host.textContent).toContain(GUEST_SIGNUP_COPY.title);
    expect(host.textContent).toContain(GUEST_SIGNUP_COPY.message);
    expect(host.querySelector('[data-testid="guest-signup-primary"]')?.textContent).toContain(
      GUEST_SIGNUP_COPY.primary,
    );
    expect(host.querySelector('[data-testid="guest-signup-secondary"]')?.textContent).toContain(
      GUEST_SIGNUP_COPY.secondary,
    );
    expect(host.querySelector('[data-testid="guest-signup-existing"]')?.textContent).toContain(
      "Ya tengo una cuenta",
    );
    expect(host.querySelector('[data-testid="guest-signup-reason"]')?.textContent).toContain(
      "publicar tu tarjeta",
    );
    // No payment talk, no premium promises.
    expect(host.textContent).not.toMatch(/premium|pago|suscripción|plan de pago/i);
    unmount();
  });

  it("closes with the secondary button and with Escape, without navigating", () => {
    const { host, onClose, unmount } = mount();
    act(() =>
      host.querySelector<HTMLButtonElement>('[data-testid="guest-signup-secondary"]')?.click(),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(navigate).not.toHaveBeenCalled();
    unmount();
  });

  it("persists the draft BEFORE leaving, records the intent and uses the register flow", () => {
    const order: string[] = [];
    const persist = vi.fn(() => order.push("persist"));
    const { host, unmount } = mount({ onBeforeLeave: persist });
    navigate.mockImplementationOnce(async () => {
      order.push("navigate");
    });

    act(() =>
      host.querySelector<HTMLButtonElement>('[data-testid="guest-signup-primary"]')?.click(),
    );

    expect(persist).toHaveBeenCalledTimes(1);
    expect(order).toEqual(["persist", "navigate"]);
    expect(navigate).toHaveBeenCalledWith({ to: "/login", search: { mode: "register" } });
    expect(window.sessionStorage.getItem(CREATION_INTENT_KEY)).not.toBeNull();
    unmount();
  });

  it("sends an existing user to the login form, not to registration", () => {
    const { host, unmount } = mount();
    act(() =>
      host.querySelector<HTMLButtonElement>('[data-testid="guest-signup-existing"]')?.click(),
    );
    expect(navigate).toHaveBeenCalledWith({ to: "/login", search: { mode: undefined } });
    unmount();
  });
});
