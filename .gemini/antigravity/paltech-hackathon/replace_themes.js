const fs = require('fs');
const glob = require('glob');

const files = fs.readdirSync('public').filter(f => f.endsWith('.html'));

for (const file of files) {
    const path = `public/${file}`;
    let content = fs.readFileSync(path, 'utf8');
    
    // regex to match the tailwind-config script block
    const regex = /<script id="tailwind-config">[\s\S]*?<\/script>/;
    
    if (regex.test(content)) {
        content = content.replace(regex, '<link rel="stylesheet" href="/theme.css">\n    <script src="/theme.js"></script>');
        fs.writeFileSync(path, content);
        console.log(`Updated ${path}`);
    } else {
        console.log(`No tailwind-config found in ${path}`);
    }
}
