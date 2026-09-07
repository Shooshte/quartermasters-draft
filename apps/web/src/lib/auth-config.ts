import { sessionPolicy } from "./session-policy";

export const authConfig = {
  ...sessionPolicy(),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string" as const,
        defaultValue: "player",
        input: false,
      },
    },
  },
};
