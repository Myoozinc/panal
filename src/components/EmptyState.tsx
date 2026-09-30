import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
}

const EmptyState = ({ icon: Icon, title, description, actionLabel, actionTo, onAction }: Props) => (
  <div className="text-center py-16 px-6 max-w-sm mx-auto">
    <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center mb-4">
      <Icon className="w-9 h-9 text-primary" strokeWidth={1.75} />
    </div>
    <h3 className="text-xl font-black">{title}</h3>
    {description && <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">{description}</p>}
    {actionLabel && actionTo && (
      <Link to={actionTo}>
        <Button className="mt-5 rounded-full px-6">{actionLabel}</Button>
      </Link>
    )}
    {actionLabel && !actionTo && onAction && (
      <Button onClick={onAction} className="mt-5 rounded-full px-6">{actionLabel}</Button>
    )}
  </div>
);

export default EmptyState;
