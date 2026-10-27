import { apply } from '@directus/visual-editing';

function resolveDirectusUrl(): string {
  try {
    if (typeof window !== 'undefined' && document.referrer) {
      const refOrigin = new URL(document.referrer).origin;
      if (
        refOrigin.includes('isjco.com') ||
        refOrigin.includes('8055') ||
        refOrigin.includes('pandafacedigital.com')
      ) {
        return refOrigin;
      }
    }
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      return 'https://cms.isjco.com';
    }
  } catch {
    // fallback below
  }
  return 'http://100.116.114.12:8055';
}

apply({
  directusUrl: resolveDirectusUrl(),
  onSaved: () => {
    setTimeout(() => {
      window.location.reload();
    }, 450);
  },
});

