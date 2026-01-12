export function getAppUrl() {
  // Allow override via environment variable
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Railway environment
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }

  if (process.env.NODE_ENV === "production") {
    return "https://middaydashboard-production.up.railway.app";
  }

  return "http://localhost:3001";
}

export function getEmailUrl() {
  // Allow override via environment variable
  if (process.env.EMAIL_URL) {
    return process.env.EMAIL_URL;
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  return "https://middaydashboard-production.up.railway.app";
}

export function getWebsiteUrl() {
  // Allow override via environment variable
  if (process.env.NEXT_PUBLIC_WEBSITE_URL) {
    return process.env.NEXT_PUBLIC_WEBSITE_URL;
  }

  // Railway environment
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }

  if (process.env.NODE_ENV === "production") {
    return "https://middaydashboard-production.up.railway.app";
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
