import { z } from "zod";

export const mappings = {
  "react.js": "react",
  reactjs: "react",
  react: "react",
  "next.js": "nextjs",
  nextjs: "nextjs",
  next: "nextjs",
  "vue.js": "vuejs",
  vuejs: "vuejs",
  vue: "vuejs",
  "express.js": "express",
  expressjs: "express",
  express: "express",
  "node.js": "nodejs",
  nodejs: "nodejs",
  node: "nodejs",
  mongodb: "mongodb",
  mongo: "mongodb",
  mongoose: "mongoose",
  mysql: "mysql",
  postgresql: "postgresql",
  sqlite: "sqlite",
  firebase: "firebase",
  docker: "docker",
  kubernetes: "kubernetes",
  aws: "aws",
  azure: "azure",
  gcp: "gcp",
  digitalocean: "digitalocean",
  heroku: "heroku",
  photoshop: "photoshop",
  "adobe photoshop": "photoshop",
  html5: "html5",
  html: "html5",
  css3: "css3",
  css: "css3",
  sass: "sass",
  scss: "sass",
  less: "less",
  tailwindcss: "tailwindcss",
  tailwind: "tailwindcss",
  bootstrap: "bootstrap",
  jquery: "jquery",
  typescript: "typescript",
  ts: "typescript",
  javascript: "javascript",
  js: "javascript",
  "angular.js": "angular",
  angularjs: "angular",
  angular: "angular",
  "ember.js": "ember",
  emberjs: "ember",
  ember: "ember",
  "backbone.js": "backbone",
  backbonejs: "backbone",
  backbone: "backbone",
  nestjs: "nestjs",
  graphql: "graphql",
  "graph ql": "graphql",
  apollo: "apollo",
  webpack: "webpack",
  babel: "babel",
  "rollup.js": "rollup",
  rollupjs: "rollup",
  rollup: "rollup",
  "parcel.js": "parcel",
  parceljs: "parcel",
  npm: "npm",
  yarn: "yarn",
  git: "git",
  github: "github",
  gitlab: "gitlab",
  bitbucket: "bitbucket",
  figma: "figma",
  prisma: "prisma",
  redux: "redux",
  flux: "flux",
  redis: "redis",
  selenium: "selenium",
  cypress: "cypress",
  jest: "jest",
  mocha: "mocha",
  chai: "chai",
  karma: "karma",
  vuex: "vuex",
  "nuxt.js": "nuxt",
  nuxtjs: "nuxt",
  nuxt: "nuxt",
  strapi: "strapi",
  wordpress: "wordpress",
  contentful: "contentful",
  netlify: "netlify",
  vercel: "vercel",
  "aws amplify": "amplify",
};

export const feedbackSchema = z.object({
  // Overall Assessment
  totalScore: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "Weighted average of all category scores, calibrated against the role level. Avoid clustering scores around 50-70 — use the full range based on actual performance.",
    ),
  hiringRecommendation: z
    .enum(["Strong Yes", "Yes", "Lean Yes", "Lean No", "No", "Strong No"])
    .describe("Clear hiring recommendation based on the interview"),

  // Technical Assessment - Core Categories
  categoryScores: z.object({
    communicationSkills: z.object({
      score: z.number().min(0).max(100),
      comment: z
        .string()
        .describe(
          "Reference specific moments from the transcript. Note how they structured answers, used analogies, or struggled to explain concepts.",
        ),
    }),
    technicalKnowledge: z.object({
      score: z.number().min(0).max(100),
      comment: z
        .string()
        .describe(
          "Cite specific technical topics discussed. Note depth of understanding, edge-case awareness, and any knowledge gaps.",
        ),
    }),
    problemSolving: z.object({
      score: z.number().min(0).max(100),
      comment: z
        .string()
        .describe(
          "Describe their approach to problems: did they decompose, consider alternatives, optimize? Reference specific questions.",
        ),
    }),
    culturalFit: z.object({
      score: z.number().min(0).max(100),
      comment: z
        .string()
        .describe(
          "Assess collaboration signals, growth mindset, openness to feedback, and alignment with engineering culture.",
        ),
    }),
    confidenceAndClarity: z.object({
      score: z.number().min(0).max(100),
      comment: z
        .string()
        .describe(
          "Note composure under pressure, consistency across easy and hard questions, and how they handled uncertainty.",
        ),
    }),
  }),

  // Behavioral Signal Analysis
  behavioralInsights: z.object({
    confidenceLevel: z
      .enum(["High", "Moderate", "Low", "Variable"])
      .describe("Overall confidence displayed throughout the interview"),
    clarityOfThought: z
      .enum(["Excellent", "Good", "Developing", "Needs Improvement"])
      .describe("Ability to articulate ideas clearly and structured"),
    technicalDepth: z
      .enum(["Expert", "Proficient", "Intermediate", "Foundational"])
      .describe("Level of domain expertise demonstrated"),
    problemApproach: z
      .enum(["Systematic", "Intuitive", "Exploratory", "Uncertain"])
      .describe("How they approach new problems"),
    stressResponse: z
      .enum(["Composed", "Adaptive", "Hesitant", "Struggled"])
      .describe("How they handled challenging questions"),
    observations: z
      .array(z.string())
      .max(5)
      .describe(
        "Key behavioral observations during the interview — each should be a specific, evidence-based observation, not a generic trait",
      ),
  }),

  // Deep Analysis
  strengths: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe(
      "Each strength should reference a specific moment or pattern from the interview, not generic praise. Example: 'Demonstrated strong system design thinking when discussing the caching layer architecture'",
    ),
  areasForImprovement: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe(
      "Each area should identify a specific gap observed in the interview and suggest a concrete way to improve. Example: 'Struggled to explain async/await patterns — consider building small projects using Promise chains to strengthen fundamentals'",
    ),

  // Actionable Career Coaching
  careerCoaching: z.object({
    immediateActions: z
      .array(z.string())
      .min(1)
      .max(3)
      .describe(
        "Specific actions the candidate should take in the next 2 weeks, tied to gaps observed in this interview",
      ),
    learningPath: z
      .array(z.string())
      .min(1)
      .max(3)
      .describe(
        "Skills or technologies to focus on for the next 3-6 months to reach the target role level",
      ),
    interviewTips: z
      .array(z.string())
      .min(1)
      .max(3)
      .describe(
        "Specific advice for improving interview performance based on patterns observed in this transcript",
      ),
    roleReadiness: z
      .string()
      .describe(
        "Honest assessment of readiness for this specific role and level — where they stand, what's missing, and how long it might take to close the gap",
      ),
  }),

  // Summary
  finalAssessment: z
    .string()
    .describe(
      "Comprehensive 2-3 paragraph assessment. First paragraph: overall impression and standout moments. Second paragraph: key gaps and their impact. Third paragraph: path forward and encouragement. Reference specific examples from the interview throughout.",
    ),
});

// Company logos for interview covers (Simple Icons slugs)
export const companyLogos = [
  "adobe",
  "amazon",
  "meta", // Facebook
  "hostinger",
  "pinterest",
  "quora",
  "reddit",
  "skype",
  "spotify",
  "telegram",
  "tiktok",
  "yahoo",
  "google",
  "microsoft",
  "apple",
  "netflix",
  "airbnb",
  "uber",
  "slack",
  "salesforce",
];
