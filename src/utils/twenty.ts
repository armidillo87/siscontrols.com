import siteConfigFallback from '../data/site-config.json';

const GRAPHQL_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.TWENTY_GRAPHQL_URL) ||
                    (typeof process !== 'undefined' && process.env && process.env.TWENTY_GRAPHQL_URL) ||
                    'http://100.116.114.12:3080/graphql';

const API_TOKEN = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.TWENTY_API_TOKEN) || 
                  (typeof process !== 'undefined' && process.env && process.env.TWENTY_API_TOKEN) ||
                  (typeof process !== 'undefined' && process.env && process.env.PUBLIC_TWENTY_TOKEN);

async function queryTwenty(query: string, variables = {}) {
  if (!API_TOKEN) {
    throw new Error("TWENTY_API_TOKEN is not configured.");
  }
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, variables })
  });
  if (!res.ok) {
    throw new Error(`GraphQL HTTP error! status: ${res.status}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

let cachedProjectConfig: any = null;
let cachedProjectPromise: Promise<any> | null = null;

export async function getProjectConfig(projectSlug: string = 'siscontrols') {
  if (cachedProjectConfig) {
    return cachedProjectConfig;
  }
  if (cachedProjectPromise) {
    return cachedProjectPromise;
  }

  cachedProjectPromise = (async () => {
    try {
      const data = await queryTwenty(`
        query GetProject($slug: String!) {
          projects(filter: { name: { eq: $slug } }) {
            edges {
              node {
                id
                name
                sameAs
                tier
                retainer
                vertical
                siteRoot
              }
            }
          }
        }
      `, { slug: projectSlug });
      
      const project = data?.projects?.edges?.[0]?.node;
      if (!project) throw new Error(`Project '${projectSlug}' not found in Twenty DB.`);

      let mergedSameAs = siteConfigFallback.business.sameAs || [];
      if (project.sameAs && project.sameAs.trim() !== '') {
        mergedSameAs = project.sameAs.split(',').map((url: string) => url.trim()).filter((url: string) => url !== '');
      }

      cachedProjectConfig = {
        ...siteConfigFallback,
        business: {
          ...siteConfigFallback.business,
          url: (project.siteRoot && project.siteRoot.trim() !== '') ? project.siteRoot : siteConfigFallback.business.url,
          sameAs: mergedSameAs,
        },
        tier: project.tier || 'starter',
        retainer: project.retainer || 'maintain',
        vertical: project.vertical || 'enterprise'
      };
      return cachedProjectConfig;
    } catch (err: any) {
      console.warn(`[Twenty CRM Fallback] getProjectConfig failed, using static fallback:`, err.message);
      cachedProjectConfig = {
        ...siteConfigFallback,
        tier: 'starter',
        retainer: 'maintain',
        vertical: 'enterprise'
      };
      return cachedProjectConfig;
    }
  })();

  return cachedProjectPromise;
}
