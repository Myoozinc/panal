import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface State { hasError: boolean }

class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center bg-background">
        <div className="max-w-sm">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-black">Algo salió mal</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Ocurrió un error inesperado. Vuelve a intentarlo.
          </p>
          <Button className="mt-5 rounded-full px-6" onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
