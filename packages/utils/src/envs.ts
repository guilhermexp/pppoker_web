export function getAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  return "http://localhost:3001";
}

export function getEmailUrl() {
  if (process.env.EMAIL_URL) {
    return process.env.EMAIL_URL;
  }

  return "http://localhost:3000";
}

export function getWebsiteUrl() {
  if (process.env.NEXT_PUBLIC_WEBSITE_URL) {
    return process.env.NEXT_PUBLIC_WEBSITE_URL;
  }

  return "http://localhost:3000";
}

export function getCdnUrl() {
  // Allow override via environment variable
  if (process.env.NEXT_PUBLIC_CDN_URL) {
    return process.env.NEXT_PUBLIC_CDN_URL;
  }

  // Fallback to app URL if no CDN configured
  return getAppUrl();
}
