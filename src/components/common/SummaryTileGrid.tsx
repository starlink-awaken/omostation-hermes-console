import React, { type ReactNode } from 'react';

export type SummaryTile = {
  id: string;
  title: string;
  value: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  iconClassName?: string;
};

type SummaryTileGridProps = {
  items: SummaryTile[];
  className?: string;
  compact?: boolean;
  minColumnWidth?: number;
};

function SummaryTileGrid({
  items,
  className,
  compact = false,
  minColumnWidth,
}: SummaryTileGridProps) {
  return (
    <div
      className={[
        'stats-grid',
        'summary-tile-grid',
        compact ? 'summary-tile-grid-compact' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        minColumnWidth
          ? { gridTemplateColumns: `repeat(auto-fit, minmax(${minColumnWidth}px, 1fr))` }
          : undefined
      }
    >
      {items.map((item) => (
        <article
          key={item.id}
          className={[
            'stat-card',
            'summary-tile-card',
            compact ? 'summary-tile-card-compact' : '',
            item.icon ? '' : 'summary-tile-card-no-icon',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {item.icon ? (
            <div className={['stat-icon-wrapper', item.iconClassName ?? ''].filter(Boolean).join(' ')}>
              {item.icon}
            </div>
          ) : null}
          <div className="stat-info summary-tile-info">
            <h3>{item.title}</h3>
            <p className="stat-value summary-tile-value">{item.value}</p>
            {item.description ? <small className="summary-tile-description">{item.description}</small> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

export default SummaryTileGrid;
