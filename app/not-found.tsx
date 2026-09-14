import Link from "next/link";

export default function NotFound() {
  return (
    <section className="screen active" style={{ textAlign: "center", padding: "60px 20px" }}>
      <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Page not found</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 20px" }}>
        That page doesn&rsquo;t exist, or has moved.
      </p>
      <Link href="/">
        <button className="submit" style={{ width: "auto", padding: "12px 22px" }}>
          Back to Home
        </button>
      </Link>
    </section>
  );
}
