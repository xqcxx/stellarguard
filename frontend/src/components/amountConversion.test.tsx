/**
 * @vitest-environment jsdom
 */

import React from "react";
import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateProposalModal } from "@/components/CreateProposalModal";
import { WithdrawalModal } from "@/components/WithdrawalModal";

vi.mock("@/lib/stellarAddress", () => ({
  getStellarAddressType: vi.fn(() => "account"),
  isValidStellarAddress: vi.fn(() => true),
}));

function setElementValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
) {
  const prototype =
    element instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;

  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  if (descriptor?.set) {
    descriptor.set.call(element, value);
  } else {
    element.value = value;
  }

  element.dispatchEvent(
    new Event(element instanceof HTMLSelectElement ? "change" : "input", {
      bubbles: true,
      cancelable: true,
    }),
  );
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

function renderIntoDocument(element: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(element);
  });

  return {
    container,
    root,
    async rerender(nextElement: React.ReactElement) {
      await act(async () => {
        root.render(nextElement);
      });
    },
    async cleanup() {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

let activeRoots: Array<() => Promise<void>> = [];

beforeEach(() => {
  activeRoots = [];
  document.body.innerHTML = "";
});

afterEach(async () => {
  for (const cleanup of activeRoots) {
    await cleanup();
  }
  activeRoots = [];
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("CreateProposalModal amount conversion", () => {
  it("converts whole XLM input to stroops", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const view = renderIntoDocument(
      <CreateProposalModal
        isOpen
        isWalletConnected
        onClose={onClose}
        onCreate={onCreate}
      />,
    );
    activeRoots.push(view.cleanup);

    setElementValue(
      view.container.querySelector("#title") as HTMLInputElement,
      "Funding request",
    );
    setElementValue(
      view.container.querySelector("#description") as HTMLTextAreaElement,
      "Allocate funds for the next milestone",
    );
    setElementValue(
      view.container.querySelector("#action") as HTMLSelectElement,
      "Funding",
    );
    await flush();

    setElementValue(
      view.container.querySelector("#target") as HTMLInputElement,
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    );
    setElementValue(
      view.container.querySelector("#amount") as HTMLInputElement,
      "1",
    );

    await act(async () => {
      view.container.querySelector("form")?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
    });

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: BigInt(10_000_000),
      }),
    );
  });

  it("converts seven-decimal XLM input to stroops", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    const view = renderIntoDocument(
      <CreateProposalModal
        isOpen
        isWalletConnected
        onClose={vi.fn()}
        onCreate={onCreate}
      />,
    );
    activeRoots.push(view.cleanup);

    setElementValue(
      view.container.querySelector("#title") as HTMLInputElement,
      "Precision funding",
    );
    setElementValue(
      view.container.querySelector("#description") as HTMLTextAreaElement,
      "Allocate an amount with max XLM precision",
    );
    setElementValue(
      view.container.querySelector("#action") as HTMLSelectElement,
      "Funding",
    );
    await flush();

    setElementValue(
      view.container.querySelector("#target") as HTMLInputElement,
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    );
    setElementValue(
      view.container.querySelector("#amount") as HTMLInputElement,
      "1.0000001",
    );

    await act(async () => {
      view.container.querySelector("form")?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
    });

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: BigInt(10_000_001),
      }),
    );
  });

  it("rejects zero XLM before creating a funding proposal", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    const view = renderIntoDocument(
      <CreateProposalModal
        isOpen
        isWalletConnected
        onClose={vi.fn()}
        onCreate={onCreate}
      />,
    );
    activeRoots.push(view.cleanup);

    setElementValue(
      view.container.querySelector("#title") as HTMLInputElement,
      "Zero funding",
    );
    setElementValue(
      view.container.querySelector("#description") as HTMLTextAreaElement,
      "Attempt to submit a zero-value proposal",
    );
    setElementValue(
      view.container.querySelector("#action") as HTMLSelectElement,
      "Funding",
    );
    await flush();

    setElementValue(
      view.container.querySelector("#target") as HTMLInputElement,
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    );
    setElementValue(
      view.container.querySelector("#amount") as HTMLInputElement,
      "0",
    );

    await act(async () => {
      view.container.querySelector("form")?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
    });

    expect(onCreate).not.toHaveBeenCalled();
    expect(view.container.textContent).toContain("Amount must be greater than 0");
  });
});

describe("WithdrawalModal amount conversion", () => {
  it("converts whole XLM input to stroops", async () => {
    const onPropose = vi.fn().mockResolvedValue(undefined);
    const view = renderIntoDocument(
      <WithdrawalModal
        isOpen
        onClose={vi.fn()}
        onPropose={onPropose}
        balance={BigInt(10_000_000_000)}
        isProposing={false}
      />,
    );
    activeRoots.push(view.cleanup);

    setElementValue(
      view.container.querySelector("#wd-to") as HTMLInputElement,
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    );
    setElementValue(
      view.container.querySelector("#wd-amount") as HTMLInputElement,
      "1",
    );
    setElementValue(
      view.container.querySelector("#wd-memo") as HTMLInputElement,
      "Treasury payout",
    );

    await act(async () => {
      view.container.querySelector("form")?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
    });

    expect(onPropose).toHaveBeenCalledTimes(1);
    expect(onPropose).toHaveBeenCalledWith(
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
      BigInt(10_000_000),
      "Treasury payout",
    );
  });

  it("converts seven-decimal XLM input to stroops", async () => {
    const onPropose = vi.fn().mockResolvedValue(undefined);
    const view = renderIntoDocument(
      <WithdrawalModal
        isOpen
        onClose={vi.fn()}
        onPropose={onPropose}
        balance={BigInt(10_000_000_000)}
        isProposing={false}
      />,
    );
    activeRoots.push(view.cleanup);

    setElementValue(
      view.container.querySelector("#wd-to") as HTMLInputElement,
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    );
    setElementValue(
      view.container.querySelector("#wd-amount") as HTMLInputElement,
      "1.0000001",
    );
    setElementValue(
      view.container.querySelector("#wd-memo") as HTMLInputElement,
      "Treasury payout",
    );

    await act(async () => {
      view.container.querySelector("form")?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
    });

    expect(onPropose).toHaveBeenCalledTimes(1);
    expect(onPropose).toHaveBeenCalledWith(
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
      BigInt(10_000_001),
      "Treasury payout",
    );
  });

  it("rejects invalid strings and over-precision decimals", async () => {
    const onPropose = vi.fn().mockResolvedValue(undefined);
    const view = renderIntoDocument(
      <WithdrawalModal
        isOpen
        onClose={vi.fn()}
        onPropose={onPropose}
        balance={BigInt(10_000_000_000)}
        isProposing={false}
      />,
    );
    activeRoots.push(view.cleanup);

    setElementValue(
      view.container.querySelector("#wd-to") as HTMLInputElement,
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    );
    setElementValue(
      view.container.querySelector("#wd-memo") as HTMLInputElement,
      "Treasury payout",
    );

    setElementValue(
      view.container.querySelector("#wd-amount") as HTMLInputElement,
      "abc",
    );

    await act(async () => {
      view.container.querySelector("form")?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
    });

    expect(onPropose).not.toHaveBeenCalled();
    expect(view.container.textContent).toContain("Please fill in all fields correctly.");

    setElementValue(
      view.container.querySelector("#wd-amount") as HTMLInputElement,
      "1.00000001",
    );

    await act(async () => {
      view.container.querySelector("form")?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
    });

    expect(onPropose).not.toHaveBeenCalled();
    expect(view.container.textContent).toContain(
      "Invalid XLM amount format. Use up to 7 decimal places.",
    );
  });
});
