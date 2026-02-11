// lib/icon-utils.ts
// Centralized icon utility module with hybrid CDN strategy
// - Company Logos: Brandfetch CDN with fallbacks
// - Tech Icons: Devicon CDN with fallbacks

// ============================================================================
// CDN BASE URLs
// ============================================================================

const BRANDFETCH_CDN = "https://cdn.brandfetch.io";
const UI_AVATARS_API = "https://ui-avatars.com/api";
const DEVICON_CDN = "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons";
const SIMPLE_ICONS_CDN = "https://cdn.simpleicons.org";
const BRANDFETCH_CLIENT_ID =
  process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID?.trim();

// ============================================================================
// COMPANY DOMAIN MAPPINGS
// ============================================================================

// Map of known company names to their domains (for Brandfetch)
const COMPANY_DOMAIN_MAP: Record<string, string> = {
  // Tech Giants
  google: "google.com",
  meta: "meta.com",
  facebook: "meta.com",
  amazon: "amazon.com",
  microsoft: "microsoft.com",
  apple: "apple.com",
  netflix: "netflix.com",

  // Tech Companies
  stripe: "stripe.com",
  airbnb: "airbnb.com",
  uber: "uber.com",
  spotify: "spotify.com",
  slack: "slack.com",
  salesforce: "salesforce.com",
  adobe: "adobe.com",
  tesla: "tesla.com",
  twitter: "x.com",
  x: "x.com",
  linkedin: "linkedin.com",
  github: "github.com",
  gitlab: "gitlab.com",
  zomato: "zomato.com",
  swiggy: "swiggy.com",
  flipkart: "flipkart.com",
  paytm: "paytm.com",
  razorpay: "razorpay.com",
  phonepe: "phonepe.com",
  cred: "cred.club",
  zerodha: "zerodha.com",
  freshworks: "freshworks.com",
  zoho: "zoho.com",
  infosys: "infosys.com",
  tcs: "tcs.com",
  wipro: "wipro.com",
  hcl: "hcltech.com",

  // Consulting/Enterprise
  deloitte: "deloitte.com",
  accenture: "accenture.com",
  ibm: "ibm.com",
  oracle: "oracle.com",
  sap: "sap.com",
  mckinsey: "mckinsey.com",
  bcg: "bcg.com",
  bain: "bain.com",

  // Fintech
  paypal: "paypal.com",
  visa: "visa.com",
  mastercard: "mastercard.com",
  square: "squareup.com",
  plaid: "plaid.com",

  // E-commerce
  shopify: "shopify.com",
  ebay: "ebay.com",
  walmart: "walmart.com",
  target: "target.com",
  etsy: "etsy.com",

  // Crypto/Web3
  coinbase: "coinbase.com",
  binance: "binance.com",
  opensea: "opensea.io",

  // Gaming
  unity: "unity.com",
  epicgames: "epicgames.com",
  "epic games": "epicgames.com",
  "riot games": "riotgames.com",
  riotgames: "riotgames.com",
  valve: "valvesoftware.com",
  blizzard: "blizzard.com",
  activision: "activision.com",

  // Cloud/Infrastructure
  aws: "aws.amazon.com",
  azure: "azure.microsoft.com",
  gcp: "cloud.google.com",
  "google cloud": "cloud.google.com",
  digitalocean: "digitalocean.com",
  heroku: "heroku.com",
  vercel: "vercel.com",
  netlify: "netlify.com",
  cloudflare: "cloudflare.com",

  // Social
  snapchat: "snapchat.com",
  snap: "snapchat.com",
  pinterest: "pinterest.com",
  reddit: "reddit.com",
  discord: "discord.com",
  tiktok: "tiktok.com",
  bytedance: "bytedance.com",
  whatsapp: "whatsapp.com",
  telegram: "telegram.org",

  // Media/Entertainment
  disney: "disney.com",
  hbo: "hbo.com",
  hulu: "hulu.com",
  paramount: "paramount.com",
  "warner bros": "warnerbros.com",

  // Other Tech
  dropbox: "dropbox.com",
  notion: "notion.so",
  figma: "figma.com",
  canva: "canva.com",
  atlassian: "atlassian.com",
  jira: "atlassian.com",
  confluence: "atlassian.com",
  trello: "trello.com",
  asana: "asana.com",
  monday: "monday.com",
  airtable: "airtable.com",
  hubspot: "hubspot.com",
  mailchimp: "mailchimp.com",
  twilio: "twilio.com",
  datadog: "datadoghq.com",
  splunk: "splunk.com",
  elastic: "elastic.co",
  mongodb: "mongodb.com",
  redis: "redis.com",
  snowflake: "snowflake.com",
  databricks: "databricks.com",
  palantir: "palantir.com",
};

// ============================================================================
// DEVICON TECH MAPPINGS
// ============================================================================

// Map of tech names to Devicon slugs and variants
// Devicon format: icons/{slug}/{slug}-{variant}.svg
// Variants: original, plain, line, original-wordmark, plain-wordmark
const DEVICON_MAP: Record<string, { slug: string; variant: string }> = {
  // JavaScript Ecosystem
  javascript: { slug: "javascript", variant: "original" },
  js: { slug: "javascript", variant: "original" },
  typescript: { slug: "typescript", variant: "original" },
  ts: { slug: "typescript", variant: "original" },
  react: { slug: "react", variant: "original" },
  reactjs: { slug: "react", variant: "original" },
  "react.js": { slug: "react", variant: "original" },
  nextjs: { slug: "nextjs", variant: "original" },
  "next.js": { slug: "nextjs", variant: "original" },
  next: { slug: "nextjs", variant: "original" },
  vue: { slug: "vuejs", variant: "original" },
  vuejs: { slug: "vuejs", variant: "original" },
  "vue.js": { slug: "vuejs", variant: "original" },
  angular: { slug: "angularjs", variant: "original" },
  angularjs: { slug: "angularjs", variant: "original" },
  "angular.js": { slug: "angularjs", variant: "original" },
  svelte: { slug: "svelte", variant: "original" },
  nodejs: { slug: "nodejs", variant: "original" },
  "node.js": { slug: "nodejs", variant: "original" },
  node: { slug: "nodejs", variant: "original" },
  express: { slug: "express", variant: "original" },
  expressjs: { slug: "express", variant: "original" },
  "express.js": { slug: "express", variant: "original" },
  nestjs: { slug: "nestjs", variant: "original" },
  nuxt: { slug: "nuxtjs", variant: "original" },
  nuxtjs: { slug: "nuxtjs", variant: "original" },
  "nuxt.js": { slug: "nuxtjs", variant: "original" },

  // Programming Languages
  python: { slug: "python", variant: "original" },
  java: { slug: "java", variant: "original" },
  go: { slug: "go", variant: "original" },
  golang: { slug: "go", variant: "original" },
  rust: { slug: "rust", variant: "original" },
  ruby: { slug: "ruby", variant: "original" },
  php: { slug: "php", variant: "original" },
  csharp: { slug: "csharp", variant: "original" },
  "c#": { slug: "csharp", variant: "original" },
  cplusplus: { slug: "cplusplus", variant: "original" },
  "c++": { slug: "cplusplus", variant: "original" },
  c: { slug: "c", variant: "original" },
  swift: { slug: "swift", variant: "original" },
  kotlin: { slug: "kotlin", variant: "original" },
  scala: { slug: "scala", variant: "original" },
  dart: { slug: "dart", variant: "original" },
  elixir: { slug: "elixir", variant: "original" },
  haskell: { slug: "haskell", variant: "original" },
  clojure: { slug: "clojure", variant: "original" },
  lua: { slug: "lua", variant: "original" },
  perl: { slug: "perl", variant: "original" },
  r: { slug: "r", variant: "original" },
  julia: { slug: "julia", variant: "original" },

  // Databases
  mongodb: { slug: "mongodb", variant: "original" },
  mongo: { slug: "mongodb", variant: "original" },
  mysql: { slug: "mysql", variant: "original-wordmark" },
  sql: { slug: "azuresqldatabase", variant: "original" },
  SQL: { slug: "azuresqldatabase", variant: "original" },
  sqldeveloper: { slug: "sqldeveloper", variant: "original" },
  mssql: { slug: "microsoftsqlserver", variant: "original" },
  sqlserver: { slug: "microsoftsqlserver", variant: "original" },
  microsoftsqlserver: { slug: "microsoftsqlserver", variant: "original" },
  postgresql: { slug: "postgresql", variant: "original" },
  postgres: { slug: "postgresql", variant: "original" },
  sqlite: { slug: "sqlite", variant: "original" },
  redis: { slug: "redis", variant: "original" },
  cassandra: { slug: "cassandra", variant: "original" },
  couchdb: { slug: "couchdb", variant: "original" },
  dynamodb: { slug: "dynamodb", variant: "original" },
  oracle: { slug: "oracle", variant: "original" },
  neo4j: { slug: "neo4j", variant: "original" },

  // Cloud & DevOps
  aws: { slug: "amazonwebservices", variant: "original-wordmark" },
  "amazon web services": {
    slug: "amazonwebservices",
    variant: "original-wordmark",
  },
  azure: { slug: "azure", variant: "original" },
  gcp: { slug: "googlecloud", variant: "original" },
  "google cloud": { slug: "googlecloud", variant: "original" },
  docker: { slug: "docker", variant: "original" },
  kubernetes: { slug: "kubernetes", variant: "original" },
  k8s: { slug: "kubernetes", variant: "original" },
  terraform: { slug: "terraform", variant: "original" },
  ansible: { slug: "ansible", variant: "original" },
  jenkins: { slug: "jenkins", variant: "original" },
  circleci: { slug: "circleci", variant: "original" },
  "github actions": { slug: "githubactions", variant: "original" },
  "gitlab ci": { slug: "gitlab", variant: "original" },
  nginx: { slug: "nginx", variant: "original" },
  apache: { slug: "apache", variant: "original" },
  linux: { slug: "linux", variant: "original" },
  ubuntu: { slug: "ubuntu", variant: "original" },
  debian: { slug: "debian", variant: "original" },
  centos: { slug: "centos", variant: "original" },

  // Frontend & Styling
  html: { slug: "html5", variant: "original" },
  html5: { slug: "html5", variant: "original" },
  css: { slug: "css3", variant: "original" },
  css3: { slug: "css3", variant: "original" },
  sass: { slug: "sass", variant: "original" },
  scss: { slug: "sass", variant: "original" },
  less: { slug: "less", variant: "plain-wordmark" },
  tailwindcss: { slug: "tailwindcss", variant: "original" },
  tailwind: { slug: "tailwindcss", variant: "original" },
  bootstrap: { slug: "bootstrap", variant: "original" },
  materialui: { slug: "materialui", variant: "original" },
  "material ui": { slug: "materialui", variant: "original" },

  // Build Tools & Package Managers
  webpack: { slug: "webpack", variant: "original" },
  vite: { slug: "vitejs", variant: "original" },
  babel: { slug: "babel", variant: "original" },
  gulp: { slug: "gulp", variant: "original" },
  grunt: { slug: "grunt", variant: "original" },
  npm: { slug: "npm", variant: "original-wordmark" },
  yarn: { slug: "yarn", variant: "original" },
  pnpm: { slug: "pnpm", variant: "original" },

  // Version Control & Collaboration
  git: { slug: "git", variant: "original" },
  github: { slug: "github", variant: "original" },
  gitlab: { slug: "gitlab", variant: "original" },
  bitbucket: { slug: "bitbucket", variant: "original" },

  // Testing
  jest: { slug: "jest", variant: "plain" },
  mocha: { slug: "mocha", variant: "original" },
  cypress: { slug: "cypressio", variant: "original" },
  selenium: { slug: "selenium", variant: "original" },
  pytest: { slug: "pytest", variant: "original" },

  // Mobile
  flutter: { slug: "flutter", variant: "original" },
  "react native": { slug: "react", variant: "original" },
  reactnative: { slug: "react", variant: "original" },
  android: { slug: "android", variant: "original" },
  ios: { slug: "apple", variant: "original" },
  xcode: { slug: "xcode", variant: "original" },

  // Data Science & ML
  tensorflow: { slug: "tensorflow", variant: "original" },
  pytorch: { slug: "pytorch", variant: "original" },
  pandas: { slug: "pandas", variant: "original" },
  numpy: { slug: "numpy", variant: "original" },
  jupyter: { slug: "jupyter", variant: "original" },
  anaconda: { slug: "anaconda", variant: "original" },
  opencv: { slug: "opencv", variant: "original" },

  // Other Frameworks & Tools
  django: { slug: "django", variant: "plain" },
  flask: { slug: "flask", variant: "original" },
  fastapi: { slug: "fastapi", variant: "original" },
  spring: { slug: "spring", variant: "original" },
  "spring boot": { slug: "spring", variant: "original" },
  rails: { slug: "rails", variant: "original" },
  "ruby on rails": { slug: "rails", variant: "original" },
  laravel: { slug: "laravel", variant: "original" },
  symfony: { slug: "symfony", variant: "original" },
  ".net": { slug: "dot-net", variant: "original" },
  dotnet: { slug: "dot-net", variant: "original" },
  graphql: { slug: "graphql", variant: "plain" },
  apollo: { slug: "apollographql", variant: "original" },
  prisma: { slug: "prisma", variant: "original" },
  firebase: { slug: "firebase", variant: "original" },
  supabase: { slug: "supabase", variant: "original" },
  redux: { slug: "redux", variant: "original" },
  electron: { slug: "electron", variant: "original" },
  figma: { slug: "figma", variant: "original" },
  sketch: { slug: "sketch", variant: "original" },
  photoshop: { slug: "photoshop", variant: "original" },
  illustrator: { slug: "illustrator", variant: "original" },

  // Message Queues & Streaming
  kafka: { slug: "apachekafka", variant: "original" },
  rabbitmq: { slug: "rabbitmq", variant: "original" },

  // Others
  wordpress: { slug: "wordpress", variant: "original" },
  woocommerce: { slug: "woocommerce", variant: "original" },
  magento: { slug: "magento", variant: "original" },
  shopify: { slug: "shopify", variant: "original" },
  heroku: { slug: "heroku", variant: "original" },
  vercel: { slug: "vercel", variant: "original" },
  netlify: { slug: "netlify", variant: "original" },
  digitalocean: { slug: "digitalocean", variant: "original" },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Normalizes company name for lookup
 * "Google LLC" → "google"
 * "Meta Platforms, Inc." → "meta"
 */
function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(
      /\s+(inc\.?|llc|ltd\.?|corp\.?|corporation|platform[s]?|technologies|pvt\.?|private|limited)/gi,
      "",
    )
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Normalizes tech name for lookup
 * "React.js" → "react.js"
 * "TypeScript" → "typescript"
 */
function normalizeTechName(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Extracts initials from company name for fallback avatar
 * "Google LLC" → "GL"
 * "Meta" → "M"
 */
function getInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  if (words.length === 0) return "?";
  const firstWord = words[0];
  if (!firstWord) return "?";
  if (words.length === 1) return firstWord.substring(0, 2).toUpperCase();
  const secondWord = words[1];
  const firstChar = firstWord[0] || "";
  const secondChar = secondWord?.[0] || "";
  return (firstChar + secondChar).toUpperCase();
}

/**
 * Converts company name to likely domain
 * "Google" → "google.com"
 * "Riot Games" → "riotgames.com"
 */
function companyToDomain(companyName: string): string {
  const normalized = normalizeCompanyName(companyName);

  // Check if we have a known mapping
  if (COMPANY_DOMAIN_MAP[normalized]) {
    return COMPANY_DOMAIN_MAP[normalized];
  }

  // Try common variations
  const withoutSpaces = normalized.replace(/\s+/g, "");
  if (COMPANY_DOMAIN_MAP[withoutSpaces]) {
    return COMPANY_DOMAIN_MAP[withoutSpaces];
  }

  // Fallback: construct domain from company name
  return `${withoutSpaces}.com`;
}

function clampImageSize(size: number, min: number, max: number): number {
  if (!Number.isFinite(size)) {
    return min;
  }

  return Math.min(Math.max(Math.round(size), min), max);
}

// ============================================================================
// PUBLIC API - COMPANY LOGOS
// ============================================================================

/**
 * Primary company logo URL using Brandfetch CDN
 */
export function getBrandfetchLogoUrl(
  companyName: string,
  size: number = 400,
): string {
  const domain = companyToDomain(companyName);
  const normalizedSize = clampImageSize(size, 16, 1024);

  // Brandfetch CDN requires a valid client id (?c=...).
  // If not configured, fall back to a reliable public source.
  if (
    !BRANDFETCH_CLIENT_ID ||
    BRANDFETCH_CLIENT_ID === "your_brandfetch_client_id"
  ) {
    return getGoogleFaviconUrl(companyName, normalizedSize);
  }

  const encodedDomain = encodeURIComponent(domain);
  const encodedClientId = encodeURIComponent(BRANDFETCH_CLIENT_ID);

  // Brandfetch CDN route format:
  // /domain/{domain}/w/{w}/h/{h}/fallback/{mode}/type/{asset}
  return `${BRANDFETCH_CDN}/domain/${encodedDomain}/w/${normalizedSize}/h/${normalizedSize}/fallback/404/type/icon?c=${encodedClientId}`;
}

/**
 * Alternate: Clearbit Logo API (Often better for well-known tech companies)
 */
export function getClearbitLogoUrl(companyName: string): string {
  const domain = companyToDomain(companyName);
  return `https://logo.clearbit.com/${domain}?size=400`;
}

/**
 * Fallback 1: Google Favicon API
 */
export function getGoogleFaviconUrl(
  companyName: string,
  size: number = 128,
): string {
  const domain = companyToDomain(companyName);
  const normalizedSize = clampImageSize(size, 16, 256);
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${normalizedSize}`;
}

/**
 * Fallback 2: UI Avatars (text-based placeholder)
 */
export function getUIAvatarsUrl(
  companyName: string,
  size: number = 128,
): string {
  const initials = getInitials(companyName);
  const normalizedSize = clampImageSize(size, 16, 512);
  return `${UI_AVATARS_API}/?name=${encodeURIComponent(initials)}&size=${normalizedSize}&background=6366f1&color=fff&bold=true&format=svg`;
}

/**
 * Gets company logo URL with fallback chain info
 * Returns primary URL and fallback URLs for client-side error handling
 */
export function getCompanyLogoUrls(
  companyName: string,
  size: number = 400,
): {
  primary: string;
  fallbacks: string[];
} {
  if (!companyName || companyName === "Unknown Company") {
    return {
      primary: getUIAvatarsUrl("UC", size),
      fallbacks: [],
    };
  }

  const brandfetchPrimary = getBrandfetchLogoUrl(companyName, size);
  const googleFallback = getGoogleFaviconUrl(companyName, size);
  const uiAvatarFallback = getUIAvatarsUrl(companyName, size);

  if (brandfetchPrimary === googleFallback) {
    return {
      primary: googleFallback,
      fallbacks: [uiAvatarFallback],
    };
  }

  return {
    primary: brandfetchPrimary,
    fallbacks: [googleFallback, uiAvatarFallback],
  };
}

/**
 * Simple getter for primary company logo URL
 * Use CompanyLogo component for error handling
 */
export function getCompanyLogoUrl(
  companyName: string,
  size: number = 400,
): string {
  return getCompanyLogoUrls(companyName, size).primary;
}

// ============================================================================
// PUBLIC API - TECH ICONS
// ============================================================================

/**
 * Primary tech icon URL using Devicon CDN
 */
export function getDeviconUrl(techName: string): string {
  const normalized = normalizeTechName(techName);
  const mapping = DEVICON_MAP[normalized];

  if (mapping) {
    return `${DEVICON_CDN}/${mapping.slug}/${mapping.slug}-${mapping.variant}.svg`;
  }

  // Fallback: try to use the tech name directly as slug
  const slug = normalized.replace(/[^a-z0-9]/g, "");
  return `${DEVICON_CDN}/${slug}/${slug}-original.svg`;
}

/**
 * Fallback: Simple Icons CDN
 */
export function getSimpleIconUrl(
  techName: string,
  color: string = "666666",
): string {
  const normalized = normalizeTechName(techName).replace(/[^a-z0-9]/g, "");
  return `${SIMPLE_ICONS_CDN}/${normalized}/${color}`;
}

/**
 * Gets tech icon URL with fallback chain info
 */
export function getTechIconUrls(techName: string): {
  primary: string;
  fallbacks: string[];
} {
  return {
    primary: getDeviconUrl(techName),
    fallbacks: [getSimpleIconUrl(techName)],
  };
}

/**
 * Simple getter for primary tech icon URL
 * Use TechIcon component for error handling
 */
export function getTechIconUrl(techName: string): string {
  return getTechIconUrls(techName).primary;
}

/**
 * Gets array of tech icons with URLs (for backward compatibility)
 */
export function getTechLogosWithFallbacks(techArray?: string[]): Array<{
  tech: string;
  urls: { primary: string; fallbacks: string[] };
}> {
  if (!techArray || !Array.isArray(techArray) || techArray.length === 0) {
    return [];
  }

  return techArray.map((tech) => ({
    tech,
    urls: getTechIconUrls(tech),
  }));
}

// ============================================================================
// EXPORTS FOR BACKWARD COMPATIBILITY
// ============================================================================

export {
  COMPANY_DOMAIN_MAP,
  DEVICON_MAP,
  normalizeCompanyName,
  normalizeTechName,
  getInitials,
  companyToDomain,
};
