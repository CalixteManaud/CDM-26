import Head from "next/head";

type PageHeadProps = {
  title: string;
  description?: string;
  /** Chemin ou URL absolue de l'image de partage (og:image). */
  image?: string;
  /** Chemin de la page courante, ex "/tournois". */
  path?: string;
  noindex?: boolean;
};

const SITE_NAME = "CDM 26";
const DEFAULT_DESCRIPTION =
  "Coupe du Monde FIFA 26 sur Twitch — tournois, équipes, matchs en direct et paris en points de chaîne.";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://cdm.rgtcity.fr";
const DEFAULT_IMAGE = "/logo.png";

/**
 * <Head> standardisé avec Open Graph + Twitter Card. À mettre en tête de chaque
 * page pour des aperçus riches sur Discord / Twitter / Twitch.
 *
 *   <PageHead title="Tournois" description="…" path="/tournaments" />
 */
export function PageHead({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  path,
  noindex = false,
}: PageHeadProps) {
  const fullTitle = title === SITE_NAME ? title : `${title} — ${SITE_NAME}`;
  const url = path ? `${APP_URL}${path.startsWith("/") ? path : `/${path}`}` : APP_URL;
  const absoluteImage = image.startsWith("http") ? image : `${APP_URL}${image}`;

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={absoluteImage} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImage} />
    </Head>
  );
}
