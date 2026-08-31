import React from 'react';

interface GuideSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
  ariaLabel?: string;
}

export function GuideSection({ title, description, children, ariaLabel }: GuideSectionProps) {
  return (
    <section className="cockpit-guide-section" aria-label={ariaLabel}>
      <div className="section-header">
        <div>
          <h2>{title}</h2>
          <p className="text-muted">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
