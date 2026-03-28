module.exports = {
  apps: [
    {
      name: "neurosprint-backend",
      cwd: "/home/neurosprint/apps/NeuroSprint/backend",
      script: "dist/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3211,
        WS_PORT: 3212
      }
    }
  ]
};
