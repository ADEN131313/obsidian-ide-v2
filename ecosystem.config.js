module.exports = {
  apps: [
    {
      name: "api-server",
      script: "artifacts/api-server/dist/index.mjs",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        DATABASE_URL: "postgresql://user:password@localhost:5432/obsidian",
        JWT_SECRET: "your-jwt-secret",
      },
      watch: false,
      max_memory_restart: "1G",
    },
    {
      name: "obsidian-ide",
      script: "pnpm",
      args: "run serve",
      cwd: "artifacts/obsidian-ide",
      env: {
        NODE_ENV: "production",
        VITE_API_URL: "http://localhost:3000",
      },
      watch: false,
    },
  ],
};
