import { X } from "lucide-react";
import type { PropsWithChildren, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface SidePanelProps extends PropsWithChildren {
  open: boolean;
  title: string;
  description?: string;
  footer?: ReactNode;
  onClose: () => void;
}

export function SidePanel({ open, title, description, footer, onClose, children }: SidePanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const appRoot = document.getElementById("root");
    appRoot?.setAttribute("inert", "");
    appRoot?.setAttribute("aria-hidden", "true");

    const focusableSelector = "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex='-1'])";
    const focusInitial = window.setTimeout(() => {
      // The user may already have selected a field before this timer runs.
      if (panelRef.current?.contains(document.activeElement)) return;
      const initial = panelRef.current?.querySelector<HTMLElement>("[data-panel-initial-focus]")
        ?? panelRef.current?.querySelector<HTMLElement>("input:not([disabled]), select:not([disabled]), textarea:not([disabled])")
        ?? panelRef.current?.querySelector<HTMLElement>(focusableSelector);
      initial?.focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusInitial);
      window.removeEventListener("keydown", onKeyDown);
      appRoot?.removeAttribute("inert");
      appRoot?.removeAttribute("aria-hidden");
      previousFocus.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="panel-layer">
      <button className="panel-scrim" type="button" onClick={onClose} aria-label="Đóng bảng thao tác" />
      <aside ref={panelRef} className="side-panel" role="dialog" aria-modal="true" aria-labelledby="panel-title" aria-describedby={description ? "panel-description" : undefined}>
        <div className="side-panel__header">
          <div>
            <h2 id="panel-title">{title}</h2>
            {description && <p id="panel-description">{description}</p>}
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>
        <div className="side-panel__body">{children}</div>
        {footer && <div className="side-panel__footer">{footer}</div>}
      </aside>
    </div>,
    document.body,
  );
}
