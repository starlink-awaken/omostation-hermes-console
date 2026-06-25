import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="breadcrumb" aria-label="面包屑导航">
      <ol className="breadcrumb-list">
        <li className="breadcrumb-item">
          <button
            className="breadcrumb-link"
            onClick={() => window.location.hash = '#home'}
            aria-label="首页"
          >
            <Home size={14} />
            <span>首页</span>
          </button>
        </li>
        {items.map((item, index) => (
          <li key={index} className="breadcrumb-item">
            <ChevronRight size={14} className="breadcrumb-separator" />
            {index === items.length - 1 ? (
              <span className="breadcrumb-current" aria-current="page">
                {item.label}
              </span>
            ) : (
              <button
                className="breadcrumb-link"
                onClick={item.onClick}
              >
                {item.label}
              </button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
