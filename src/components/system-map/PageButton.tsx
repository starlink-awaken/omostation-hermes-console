import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { CockpitPage, CockpitNavigationTarget } from './types';
import { openSystemMapTarget } from './utils';

type PageButtonProps = {
  page: CockpitPage;
  onNavigate: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  contextQuery?: string;
};

function PageButton({ page, onNavigate, onOpenTarget, contextQuery }: PageButtonProps) {
  return (
    <button
      className="antd-btn"
      onClick={() => openSystemMapTarget({ tab: page.id, pageId: page.id, taskQuery: contextQuery }, onNavigate, onOpenTarget)}
    >
      <ArrowRight size={14} />
      <span>{page.title}</span>
    </button>
  );
}

export default PageButton;
