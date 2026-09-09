"use client";

/**
 * A submit button that asks for confirmation before letting its enclosing
 * form action fire — guards against exactly the kind of accidental tap
 * (e.g. hitting "Settle up" by mistake) that has no undo once submitted.
 */
export function ConfirmDeleteButton({
  confirmMessage,
  className,
  children,
  ariaLabel,
}: {
  confirmMessage: string;
  className?: string;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <button
      type="submit"
      aria-label={ariaLabel}
      className={className}
      onClick={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
