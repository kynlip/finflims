module.exports = {
  apps: [
    {
      name: 'phimhay',
      cwd: '/home/phimhay',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
