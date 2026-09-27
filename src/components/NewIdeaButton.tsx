"use client";

// The brand "New idea" button,
// rebuilt as a live element: the gradient colours flow across it, it has a
// glossy 3D pill body (top sheen + inner shadow + rim + dual glow) and presses
// in on click. `large` is the empty-state CTA size; `active` rings it on /new.
import Link from "next/link";

export default function NewIdeaButton({
  large = false,
  active = false,
}: {
  large?: boolean;
  active?: boolean;
}) {
  return (
    <Link
      href="/new"
      aria-label="New idea"
      className="lofty-new-btn"
      data-large={large ? "1" : undefined}
      data-active={active ? "1" : undefined}
    >
      <svg className="lofty-new-btn__plus" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M6 1.5V10.5M1.5 6H10.5" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
      <span>New idea</span>
    </Link>
  );
}
