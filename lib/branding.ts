export const logoOnLight = "/branding/logo-on-light.svg";
export const logoOnDark = "/branding/logo-on-dark.svg";
export const clubBanner = "/branding/club-banner.png";

export function clubBannerSource(image?: string): string {
  return image && image !== "/pickleball-court.jpg" ? image : clubBanner;
}
