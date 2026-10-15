import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SidePanel } from "./SidePanel";

afterEach(() => vi.useRealTimers());

it("does not steal focus after the user selects another field in the panel", () => {
  vi.useFakeTimers();
  render(<SidePanel open title="Transaction" onClose={vi.fn()}>
    <input aria-label="Amount" data-panel-initial-focus />
    <input aria-label="Note" />
  </SidePanel>);
  const note = screen.getByRole("textbox", { name: "Note" });
  note.focus();
  act(() => vi.runOnlyPendingTimers());
  expect(note).toHaveFocus();
});

it("focuses the initial field when no field has been selected", () => {
  vi.useFakeTimers();
  render(<SidePanel open title="Transaction" onClose={vi.fn()}><input aria-label="Amount" data-panel-initial-focus /></SidePanel>);
  act(() => vi.runOnlyPendingTimers());
  expect(screen.getByRole("textbox", { name: "Amount" })).toHaveFocus();
});
