import React from "react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

/**
 * Garde-fou client : capture les erreurs de rendu React pour éviter l'écran
 * blanc. N'attrape PAS les erreurs serveur (getServerSideProps) ni les rejets
 * de promesses — c'est un filet de sécurité UI, pas un gestionnaire global.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false });
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
          <h1 className="text-3xl font-black">
            <span className="text-gradient-worldcup">Oups…</span>
          </h1>
          <p className="mt-3 max-w-md text-muted-foreground">
            Une erreur inattendue est survenue. Tu peux recharger la page — si le
            problème persiste, contacte un administrateur.
          </p>
          <button
            onClick={this.handleReset}
            className="mt-6 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Recharger la page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
