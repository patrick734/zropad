import Link from "next/link";

/** Shared bits for the Terms and Privacy pages. */
export const UPDATED = "November 14, 2026";
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "";
export const X_URL = process.env.NEXT_PUBLIC_X_URL?.trim() || "";

export const H = ({ children }: { children: React.ReactNode }) => <h2 className="mt-8 text-lg font-semibold">{children}</h2>;
export const P = ({ children }: { children: React.ReactNode }) => <p className="mt-3 leading-relaxed text-muted-foreground">{children}</p>;
export const L = ({ items }: { items: React.ReactNode[] }) => (
  <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed text-muted-foreground">
    {items.map((x, i) => <li key={i}>{x}</li>)}
  </ul>
);

export function LegalPage({ title, other, children }: { title: string; other: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl pb-12 pt-2 text-[15px]">
      <p className="label">Legal</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-xs text-muted-foreground">Last updated {UPDATED}</p>
      {children}
      <div className="mt-12 flex gap-4 border-t border-border pt-6 text-sm">
        <Link href={other.href} className="text-primary hover:underline">{other.label}</Link>
        <Link href="/docs" className="text-muted-foreground hover:text-foreground">How it works</Link>
      </div>
    </article>
  );
}

/** How to reach the operators: an email if one is configured, else the X account, else nothing. */
export function Contact() {
  if (CONTACT_EMAIL) return <P>Questions about this page: <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>.</P>;
  if (X_URL) return <P>Questions about this page: message us on <a href={X_URL} target="_blank" rel="noreferrer" className="text-primary hover:underline">X</a>.</P>;
  return null;
}
