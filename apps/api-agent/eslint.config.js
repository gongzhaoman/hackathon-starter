import { config } from "@workspace/eslint-config/base";

export default [
  ...config,
  {
    rules: {
      "no-console": "off",
    },
  },
];