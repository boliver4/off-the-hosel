export default function Loading() {
  return (
    <div className="screen active" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
      <div className="spinner" role="status" aria-label="Loading" />
    </div>
  );
}
