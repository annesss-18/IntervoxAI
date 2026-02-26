// Centralized logo/icon URL builders with provider-specific fallbacks.
const BRANDFETCH_CDN = "https://cdn.brandfetch.io";
const UI_AVATARS_API = "https://ui-avatars.com/api";
const DEVICON_CDN = "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons";
const SIMPLE_ICONS_CDN = "https://cdn.simpleicons.org";
const BRANDFETCH_CLIENT_ID =
  process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID?.trim();

// Known company-to-domain mappings improve logo lookup accuracy.
const COMPANY_DOMAIN_MAP: Record<string, string> = {
  google: "google.com",
  meta: "meta.com",
  facebook: "meta.com",
  amazon: "amazon.com",
  microsoft: "microsoft.com",
  apple: "apple.com",
  netflix: "netflix.com",

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

  deloitte: "deloitte.com",
  accenture: "accenture.com",
  ibm: "ibm.com",
  oracle: "oracle.com",
  sap: "sap.com",
  mckinsey: "mckinsey.com",
  bcg: "bcg.com",
  bain: "bain.com",

  paypal: "paypal.com",
  visa: "visa.com",
  mastercard: "mastercard.com",
  square: "squareup.com",
  plaid: "plaid.com",

  shopify: "shopify.com",
  ebay: "ebay.com",
  walmart: "walmart.com",
  target: "target.com",
  etsy: "etsy.com",

  coinbase: "coinbase.com",
  binance: "binance.com",
  opensea: "opensea.io",

  unity: "unity.com",
  epicgames: "epicgames.com",
  "epic games": "epicgames.com",
  "riot games": "riotgames.com",
  riotgames: "riotgames.com",
  valve: "valvesoftware.com",
  blizzard: "blizzard.com",
  activision: "activision.com",

  aws: "aws.amazon.com",
  azure: "azure.microsoft.com",
  gcp: "cloud.google.com",
  "google cloud": "cloud.google.com",
  digitalocean: "digitalocean.com",
  heroku: "heroku.com",
  vercel: "vercel.com",
  netlify: "netlify.com",
  cloudflare: "cloudflare.com",

  snapchat: "snapchat.com",
  snap: "snapchat.com",
  pinterest: "pinterest.com",
  reddit: "reddit.com",
  discord: "discord.com",
  tiktok: "tiktok.com",
  bytedance: "bytedance.com",
  whatsapp: "whatsapp.com",
  telegram: "telegram.org",

  disney: "disney.com",
  hbo: "hbo.com",
  hulu: "hulu.com",
  paramount: "paramount.com",
  "warner bros": "warnerbros.com",

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

// Technology aliases mapped to Devicon slug/variant pairs.
const DEVICON_MAP: Record<string, { slug: string; variant: string }> = {
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

  webpack: { slug: "webpack", variant: "original" },
  vite: { slug: "vitejs", variant: "original" },
  babel: { slug: "babel", variant: "original" },
  gulp: { slug: "gulp", variant: "original" },
  grunt: { slug: "grunt", variant: "original" },
  npm: { slug: "npm", variant: "original-wordmark" },
  yarn: { slug: "yarn", variant: "original" },
  pnpm: { slug: "pnpm", variant: "original" },

  git: { slug: "git", variant: "original" },
  github: { slug: "github", variant: "original" },
  gitlab: { slug: "gitlab", variant: "original" },
  bitbucket: { slug: "bitbucket", variant: "original" },

  jest: { slug: "jest", variant: "plain" },
  mocha: { slug: "mocha", variant: "original" },
  cypress: { slug: "cypressio", variant: "original" },
  selenium: { slug: "selenium", variant: "original" },
  pytest: { slug: "pytest", variant: "original" },

  flutter: { slug: "flutter", variant: "original" },
  "react native": { slug: "react", variant: "original" },
  reactnative: { slug: "react", variant: "original" },
  android: { slug: "android", variant: "original" },
  ios: { slug: "apple", variant: "original" },
  xcode: { slug: "xcode", variant: "original" },

  tensorflow: { slug: "tensorflow", variant: "original" },
  pytorch: { slug: "pytorch", variant: "original" },
  pandas: { slug: "pandas", variant: "original" },
  numpy: { slug: "numpy", variant: "original" },
  jupyter: { slug: "jupyter", variant: "original" },
  anaconda: { slug: "anaconda", variant: "original" },
  opencv: { slug: "opencv", variant: "original" },

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

  kafka: { slug: "apachekafka", variant: "original" },
  rabbitmq: { slug: "rabbitmq", variant: "original" },

  wordpress: { slug: "wordpress", variant: "original" },
  woocommerce: { slug: "woocommerce", variant: "original" },
  magento: { slug: "magento", variant: "original" },
  shopify: { slug: "shopify", variant: "original" },
  heroku: { slug: "heroku", variant: "original" },
  vercel: { slug: "vercel", variant: "original" },
  netlify: { slug: "netlify", variant: "original" },
  digitalocean: { slug: "digitalocean", variant: "original" },
};

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

function normalizeTechName(name: string): string {
  return name.toLowerCase().trim();
}

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

function companyToDomain(companyName: string): string {
  const normalized = normalizeCompanyName(companyName);

  if (COMPANY_DOMAIN_MAP[normalized]) {
    return COMPANY_DOMAIN_MAP[normalized];
  }

  const withoutSpaces = normalized.replace(/\s+/g, "");
  if (COMPANY_DOMAIN_MAP[withoutSpaces]) {
    return COMPANY_DOMAIN_MAP[withoutSpaces];
  }

  // Fallback heuristic when no explicit mapping exists.
  return `${withoutSpaces}.com`;
}

function clampImageSize(size: number, min: number, max: number): number {
  if (!Number.isFinite(size)) {
    return min;
  }

  return Math.min(Math.max(Math.round(size), min), max);
}

export function getBrandfetchLogoUrl(
  companyName: string,
  size: number = 400,
): string {
  const domain = companyToDomain(companyName);
  const normalizedSize = clampImageSize(size, 16, 1024);

  if (
    !BRANDFETCH_CLIENT_ID ||
    BRANDFETCH_CLIENT_ID === "your_brandfetch_client_id"
  ) {
    // Fall back to a public source when Brandfetch credentials are missing.
    return getGoogleFaviconUrl(companyName, normalizedSize);
  }

  const encodedDomain = encodeURIComponent(domain);
  const encodedClientId = encodeURIComponent(BRANDFETCH_CLIENT_ID);

  return `${BRANDFETCH_CDN}/domain/${encodedDomain}/w/${normalizedSize}/h/${normalizedSize}/fallback/404/type/icon?c=${encodedClientId}`;
}

export function getGoogleFaviconUrl(
  companyName: string,
  size: number = 128,
): string {
  const domain = companyToDomain(companyName);
  const normalizedSize = clampImageSize(size, 16, 256);
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${normalizedSize}`;
}

export function getUIAvatarsUrl(
  companyName: string,
  size: number = 128,
): string {
  const initials = getInitials(companyName);
  const normalizedSize = clampImageSize(size, 16, 512);
  return `${UI_AVATARS_API}/?name=${encodeURIComponent(initials)}&size=${normalizedSize}&background=6366f1&color=fff&bold=true&format=svg`;
}

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

  // Avoid duplicate fallback URLs when Brandfetch already resolves to Google.
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

export function getCompanyLogoUrl(
  companyName: string,
  size: number = 400,
): string {
  return getCompanyLogoUrls(companyName, size).primary;
}

export function getDeviconUrl(techName: string): string {
  const normalized = normalizeTechName(techName);
  const mapping = DEVICON_MAP[normalized];

  if (mapping) {
    return `${DEVICON_CDN}/${mapping.slug}/${mapping.slug}-${mapping.variant}.svg`;
  }

  // Last-resort slug normalization for unmapped technologies.
  const slug = normalized.replace(/[^a-z0-9]/g, "");
  return `${DEVICON_CDN}/${slug}/${slug}-original.svg`;
}

export function getSimpleIconUrl(
  techName: string,
  color: string = "666666",
): string {
  const normalized = normalizeTechName(techName).replace(/[^a-z0-9]/g, "");
  return `${SIMPLE_ICONS_CDN}/${normalized}/${color}`;
}

export function getTechIconUrls(techName: string): {
  primary: string;
  fallbacks: string[];
} {
  return {
    primary: getDeviconUrl(techName),
    fallbacks: [getSimpleIconUrl(techName)],
  };
}
