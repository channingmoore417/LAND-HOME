import Link from "next/link";

export default function NotFound() {
  return (
    <main className="body">
      <div className="wrap" style={{ padding: "80px 28px", textAlign: "center" }}>
        <span className="script" style={{ fontSize: "2rem" }}>
          not found
        </span>
        <h1 className="lead__title" style={{ fontSize: "2rem", marginTop: 4 }}>
          This listing isn&apos;t available
        </h1>
        <p className="lead__sub" style={{ maxWidth: 460, margin: "12px auto 24px" }}>
          It may have sold or been taken off the market. Browse our current homes for sale.
        </p>
        <Link className="btn btn--aqua" href="/listings" style={{ maxWidth: 280, margin: "0 auto" }}>
          View All Listings
        </Link>
      </div>
    </main>
  );
}
