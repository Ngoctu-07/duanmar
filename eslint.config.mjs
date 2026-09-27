import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".next-dev/**",
      "out/**",
      "dist/**",
      "coverage/**",
      ".claude/**",
      "plans/**",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
];;

export default config;
