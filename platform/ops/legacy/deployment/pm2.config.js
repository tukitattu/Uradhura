module.exports = {
  apps: [
    {
      name: 'uradhura-backend',
      script: 'npm',
      args: 'run start',
      cwd: '/home/uradhura/app/gaming-platform/backend',
      env: {
        NODE_ENV: 'production',
        PORT: '4000',
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    },
    {
      name: 'uradhura-frontend',
      script: 'npm',
      args: 'run start',
      cwd: '/home/uradhura/app/gaming-platform/frontend',
      env: {
        NODE_ENV: 'production',
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    },
  ],
};
