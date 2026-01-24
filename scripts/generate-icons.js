const https = require('https');
const fs = require('fs');
const path = require('path');

const icons = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 }
];

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    // 忽略 SSL 验证，防止之前的 curl 错误再次发生
    const agent = new https.Agent({ rejectUnauthorized: false });
    
    https.get(url, { agent }, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
};

async function start() {
  for (const icon of icons) {
    const url = `https://placehold.jp/4f46e5/ffffff/${icon.size}x${icon.size}.png?text=DL`;
    const dest = path.join(process.cwd(), 'public', icon.name);
    try {
      console.log(`Downloading ${icon.name}...`);
      await download(url, dest);
      console.log(`Successfully saved ${icon.name}`);
    } catch (err) {
      console.error(`Error downloading ${icon.name}:`, err.message);
    }
  }
}

start();
