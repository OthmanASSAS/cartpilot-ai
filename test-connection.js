const https = require('https');

const apiKey = process.env.DEEPSEEK_API_KEY;

if (!apiKey) {
  console.error("Erreur : La variable d'environnement DEEPSEEK_API_KEY n'est pas définie.");
  process.exit(1);
}

const options = {
  hostname: 'api.deepseek.com',
  port: 443,
  path: '/v1/user/balance',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Accept': 'application/json',
    'User-Agent': 'NodeJS-Test-Script/1.0'
  },
  timeout: 30000 // 30 secondes de timeout
};

console.log("Tentative de connexion avec le module https de Node.js...");

const req = https.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
  res.on('end', () => {
    console.log('Fin de la réponse.');
  });
});

req.on('error', (e) => {
  console.error(`Problème avec la requête : ${e.message}`);
  console.error(e);
});

req.on('timeout', () => {
  console.error('La requête a expiré (timeout).');
  req.destroy();
});

req.end();
