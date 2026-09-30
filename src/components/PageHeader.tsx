const PageHeader = ({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) => (
  <div className="flex items-start justify-between gap-3 mb-5">
    <div className="min-w-0">
      <h1 className="text-3xl font-black tracking-tight leading-none">{title}</h1>
      {subtitle && <p className="text-muted-foreground text-sm mt-1.5">{subtitle}</p>}
    </div>
    {action && <div className="shrink-0 pt-1">{action}</div>}
  </div>
);

export default PageHeader;
