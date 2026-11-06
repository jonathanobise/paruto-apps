export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse">
      <div className="mb-6 h-9 w-64 rounded-[var(--radius-inner)] bg-surface-2" />
      <div className="mb-6 h-28 rounded-[14px] bg-surface-2" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-72 rounded-[14px] bg-surface-2" />
        <div className="h-72 rounded-[14px] bg-surface-2" />
      </div>
    </div>
  );
}
