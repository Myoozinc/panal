import { Share2, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const ShareButton = ({
  path,
  title,
  label,
}: {
  path: string;
  title: string;
  label?: string;
}) => {
  const { toast } = useToast();
  const [done, setDone] = useState(false);
  const url = `${window.location.origin}${path}`;

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
      toast({ title: "Enlace copiado" });
    } catch {
      /* usuario canceló */
    }
  };

  return (
    <Button variant="outline" size="sm" className="rounded-full gap-1.5" onClick={share} aria-label="Compartir">
      {done ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
      {label && <span className="text-xs">{label}</span>}
    </Button>
  );
};

export default ShareButton;
