module.exports = {
  apps: [
    {
      name: 'cams-backend',
      script: 'npm',           // same as: pm2 start npm -- run start
      args: 'run start',
      cwd: '/var/www/CAMS_Backend',

      env: {
        NODE_ENV: 'development',
      },

      env_production: {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://doadmin:AVNS_TP13M3HO1XcHlVr7H_j@camsdb-do-user-31745824-0.g.db.ondigitalocean.com:25060/defaultdb',
      },
    },
  ],
};
