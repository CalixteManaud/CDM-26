import Head from "next/head";

type PageHeadProps = {
  title: string;
  description?: string;
  /** Chemin ou URL absolue de l'image de partage (og:image). */
  image?: string;
  /** Texte alternatif de l'image de partage. */
  imageAlt?: string;
  /** Chemin de la page courante, ex "/tournois". */
  path?: string;
  noindex?: boolean;
};

const SITE_NAME = "CDM 26";
const DEFAULT_DESCRIPTION =
  "Coupe du Monde FIFA 26 sur Twitch — tournois, équipes, matchs en direct et paris en points de chaîne.";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://cdm.rgtcity.fr";
/** Carte de partage 1200×630 (Discord / Twitter / Twitch). */
const DEFAULT_IMAGE = "/og.png";

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
  imageAlt = SITE_NAME,
  path,
  noindex = false,
}: PageHeadProps) {
  const fullTitle = title === SITE_NAME ? title : `${title} — ${SITE_NAME}`;
  const url = path ? `${APP_URL}${path.startsWith("/") ? path : `/${path}`}` : APP_URL;
  const absoluteImage = image.startsWith("http") ? image : `${APP_URL}${image}`;
  const isDefaultImage = image === DEFAULT_IMAGE;

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:type" content="website" key="og:type" />
      <meta property="og:site_name" content={SITE_NAME} key="og:site_name" />
      <meta property="og:locale" content="fr_FR" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} key="og:description" />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={absoluteImage} key="og:image" />
      <meta property="og:image:alt" content={imageAlt} />
      {isDefaultImage && (
        <>
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
        </>
      )}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" key="twitter:card" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImage} key="twitter:image" />
      <meta name="twitter:image:alt" content={imageAlt} />
    </Head>
  );
}
