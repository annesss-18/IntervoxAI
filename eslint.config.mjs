import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextTypescript,
  {
    rules: {
      // Keep console usage limited to explicit warning/error paths.
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
