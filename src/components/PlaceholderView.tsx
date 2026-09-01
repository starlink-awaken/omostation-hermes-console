/**
 * PlaceholderView — 占位视图，用于阶段 2 新建能力域页面。
 *
 * 阶段 2 worker 会替换为真实实现。当前仅用于让路由可访问、E2E 冒烟可通过。
 */
interface PlaceholderViewProps {
  title: string;
  description?: string;
}

export default function PlaceholderView({ title, description }: PlaceholderViewProps) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-text-primary mb-2 bg-surface-1">
          {title}
        </h1>
        {description && (
          <p className="text-text-secondary bg-surface-1">{description}</p>
        )}
        <p className="mt-4 text-sm text-text-tertiary bg-surface-1">
          建设中 — 阶段 2 交付
        </p>
      </div>
    </div>
  );
}
