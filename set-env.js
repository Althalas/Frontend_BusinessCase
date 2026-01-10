const fs = require('fs');
require('dotenv').config(); // Load env vars from .env file
const targetPath = './src/environments/environment.ts';
const targetPathProd = './src/environments/environment.prod.ts';
const targetPathDocker = './src/environments/environment.docker.ts';

// Les couleurs pour la console
const colors = {
    cyan: '\x1b[36m%s\x1b[0m',
    green: '\x1b[32m%s\x1b[0m',
};

const envDir = './src/environments';
if (!fs.existsSync(envDir)) {
    fs.mkdirSync(envDir, { recursive: true });
}

const getEnvConfigFile = (mode) => {
    let api, stripe, isProd;
    
    switch(mode) {
        case 'prod':
            api = process.env.NG_APP_API_URL_PROD;
            stripe = process.env.STRIPE_PUBLIC_KEY_PROD;
            isProd = true;
            break;
        case 'docker':
            api = process.env.NG_APP_API_URL_DOCKER;
            stripe = process.env.STRIPE_PUBLIC_KEY_DOCKER;
            isProd = false;
            break;
        case 'dev':
        default:
            api = process.env.NG_APP_API_URL_DEV;
            stripe = process.env.STRIPE_PUBLIC_KEY_DEV;
            isProd = false;
            break;
    }

    return `export const environment = {
   production: ${isProd},
   apiUrl: '${api || "http://localhost:3000/api"}',
   stripePublicKey: '${stripe || ""}'
};
`;
};

// Generate environment.ts
fs.writeFile(targetPath, getEnvConfigFile('dev'), function (err) {
   if (err) {
       throw console.error(err);
   } else {
       console.log(colors.cyan, `Angular environment.ts file generated correctly at ${targetPath} \n`);
   }
});

// Generate environment.prod.ts
fs.writeFile(targetPathProd, getEnvConfigFile('prod'), function (err) {
   if (err) {
       throw console.error(err);
   } else {
       console.log(colors.cyan, `Angular environment.prod.ts file generated correctly at ${targetPathProd} \n`);
   }
});

// Generate environment.docker.ts
fs.writeFile(targetPathDocker, getEnvConfigFile('docker'), function (err) {
   if (err) {
       throw console.error(err);
   } else {
       console.log(colors.cyan, `Angular environment.docker.ts file generated correctly at ${targetPathDocker} \n`);
   }
});
