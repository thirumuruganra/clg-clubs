import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getClubIconUrl(club) {
  if (!club) return '';

  const iconUrl = typeof club.icon_url === 'string' ? club.icon_url.trim() : '';
  if (iconUrl) return iconUrl;

  const logoUrl = typeof club.logo_url === 'string' ? club.logo_url.trim() : '';
  if (logoUrl) return logoUrl;

  const adminPicture = typeof club.admin_picture === 'string' ? club.admin_picture.trim() : '';
  if (adminPicture) return adminPicture;

  return '';
}

export function getClubInitial(club) {
  const name = typeof club?.name === 'string' ? club.name.trim() : '';
  return name ? name.charAt(0).toUpperCase() : 'C';
}

const warmedPosterUrls = new Set();

function appendPosterResourceHint(posterUrl, rel) {
  if (typeof document === 'undefined') return;

  const selector = `link[data-poster-hint="${posterUrl}"][rel="${rel}"]`;
  if (document.head.querySelector(selector)) return;

  const link = document.createElement('link');
  link.rel = rel;
  link.as = 'image';
  link.href = posterUrl;
  link.dataset.posterHint = posterUrl;
  document.head.appendChild(link);
}

export function warmPosterImageCache(rawUrl) {
  const posterUrl = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  if (!posterUrl || warmedPosterUrls.has(posterUrl)) return;

  appendPosterResourceHint(posterUrl, 'prefetch');
  warmedPosterUrls.add(posterUrl);
}

export function warmPosterCacheForEvents(events = [], limit = 4) {
  events
    .map((event) => event?.image_url)
    .filter(Boolean)
    .slice(0, limit)
    .forEach((posterUrl) => warmPosterImageCache(posterUrl));
}
