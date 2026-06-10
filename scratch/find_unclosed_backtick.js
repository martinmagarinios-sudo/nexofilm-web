import fs from 'fs';

const content = fs.readFileSync('api/comercial/admin.js', 'utf8');
const lines = content.split('\n');

let openBacktickLine = -1;
let escape = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (escape) {
            escape = false;
            continue;
        }
        if (char === '\\') {
            escape = true;
            continue;
        }
        if (char === '`') {
            if (openBacktickLine === -1) {
                openBacktickLine = i + 1;
            } else {
                openBacktickLine = -1;
            }
        }
    }
    // Newline resets escape sequence
    escape = false;
}

if (openBacktickLine !== -1) {
    console.log(`Unclosed backtick starts on line: ${openBacktickLine}`);
    console.log(`Content of that line: ${lines[openBacktickLine - 1]}`);
} else {
    console.log("No unclosed backtick found.");
}
