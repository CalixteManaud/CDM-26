import Link from "next/link";
import { PageHead } from "@/components/seo/page-head";

export default function ServerErrorPage() {
  return (
    <>
      <PageHead title="Erreur serveur" path="/500" noindex />
      <section className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-4 text-center">
        <div className="absolute inset-0 bg-mesh-cdm opacity-30" aria-hidden="true" />
        <div className="relative">
          <p className="text-7xl font-black md:text-8xl">
            <span className="text-gradient-worldcup">500</span>
          </p>
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">Erreur serveur</h1>
          <p className="mt-3 max-w-md text-muted-foreground">
            Quelque chose s&apos;est mal passé de notre côté. Réessaie dans un
            instant.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </section>
    </>
  );
}
