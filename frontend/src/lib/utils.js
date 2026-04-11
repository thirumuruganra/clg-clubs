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
