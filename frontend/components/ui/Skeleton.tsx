'use client';
/**
 * UI-002: Skeleton Loaders — reusable shimmer components for data-loading states.
 * Prevents blank screens during API calls.
 */

/* ─── Base Skeleton ─── */
export function Skeleton({
  width = '100%',
  height = '16px',
  borderRadius = '6px',
  className = '',
}: {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
}) {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{ width, height, borderRadius }}
      aria-hidden="true"
    />
  );
}

/* ─── KPI Card Skeleton ─── */
export function KpiCardSkeleton() {
  return (
    <div className="skeleton-card" style={{
      padding: '20px', borderRadius: '8px',
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border)',
    }}>
      <Skeleton width="60%" height="12px" />
      <div style={{ marginTop: '12px' }}>
        <Skeleton width="80%" height="24px" />
      </div>
      <div style={{ marginTop: '8px' }}>
        <Skeleton width="40%" height="12px" />
      </div>
    </div>
  );
}

/* ─── Dashboard Skeleton ─── */
export function DashboardSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* KPI Row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '12px',
      }}>
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <TableSkeleton rows={4} />
          <TableSkeleton rows={3} />
        </div>
        <div>
          <ListSkeleton items={6} />
        </div>
      </div>
    </div>
  );
}

/* ─── Table Skeleton ─── */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{
      borderRadius: '8px', backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border)', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <Skeleton width="140px" height="16px" />
        <Skeleton width="60px" height="14px" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{
          padding: '14px 20px',
          borderBottom: i < rows - 1 ? '1px solid var(--border-light)' : 'none',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <Skeleton width="36px" height="36px" borderRadius="8px" />
          <div style={{ flex: 1 }}>
            <Skeleton width={`${60 + Math.random() * 30}%`} height="14px" />
            <div style={{ marginTop: '6px' }}>
              <Skeleton width={`${30 + Math.random() * 20}%`} height="11px" />
            </div>
          </div>
          <Skeleton width="70px" height="14px" />
        </div>
      ))}
    </div>
  );
}

/* ─── List Skeleton (currency rates, etc.) ─── */
export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div style={{
      borderRadius: '8px', backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border)', overflow: 'hidden',
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
      }}>
        <Skeleton width="120px" height="16px" />
      </div>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} style={{
          padding: '10px 20px',
          borderBottom: i < items - 1 ? '1px solid var(--border-light)' : 'none',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <Skeleton width="36px" height="36px" borderRadius="8px" />
          <div style={{ flex: 1 }}>
            <Skeleton width={`${50 + Math.random() * 30}%`} height="13px" />
          </div>
          <div style={{ textAlign: 'right' }}>
            <Skeleton width="60px" height="14px" />
            <div style={{ marginTop: '4px' }}>
              <Skeleton width="40px" height="11px" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Chart Skeleton ─── */
export function ChartSkeleton({ height = '300px' }: { height?: string }) {
  return (
    <div style={{
      borderRadius: '8px', backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border)', padding: '20px',
    }}>
      <Skeleton width="160px" height="16px" />
      <div style={{ marginTop: '16px' }}>
        <Skeleton width="100%" height={height} borderRadius="4px" />
      </div>
    </div>
  );
}

/* ─── Page Skeleton (generic) ─── */
export function PageSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Skeleton width="250px" height="24px" />
      <Skeleton width="400px" height="14px" />
      <div style={{ marginTop: '8px' }}>
        <TableSkeleton rows={6} />
      </div>
    </div>
  );
}
