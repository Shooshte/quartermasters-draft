export const authConfig = {
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60, // 1 hour in seconds
    updateAge: 0, // Sliding expiration: refresh on every request
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
