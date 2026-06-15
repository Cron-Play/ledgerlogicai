const fs = require('fs');
const path = require('path');
const data = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const dir = path.join(__dirname, '..', 'assets', 'images');
fs.mkdirSync(dir, { recursive: true });
['icon.png', 'adaptive-icon.png', 'splash-icon.png', 'favicon.png'].forEach(name => {
  fs.writeFileSync(path.join(dir, name), data);
});
console.log('Assets created.');
