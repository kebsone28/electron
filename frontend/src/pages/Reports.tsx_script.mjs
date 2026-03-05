import fs from 'fs';

const file = 'c:/Mes-Sites-Web/GEM_SAAS/frontend/src/pages/Reports.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Replace global container
content = content.replace(/className="min-h-[^"]* bg-slate-950 [^"]*"/, 'className="p-4 md:p-8 pb-32"');

// Typography
content = content.replace(/text-white/g, 'text-slate-900 dark:text-white');
content = content.replace(/text-slate-500/g, 'text-slate-500 dark:text-slate-400');
content = content.replace(/text-slate-400/g, 'text-slate-600 dark:text-slate-400');
content = content.replace(/text-slate-300/g, 'text-slate-700 dark:text-slate-300');

// Backgrounds & Borders (cards)
content = content.replace(/bg-slate-900\/50/g, 'glass-card bg-white/50 dark:bg-slate-900/50');
content = content.replace(/bg-slate-900\/30/g, 'glass-card bg-white/30 dark:bg-slate-900/30');
content = content.replace(/bg-slate-950\/50/g, 'bg-slate-50 dark:bg-slate-950/50');
content = content.replace(/bg-slate-900/g, 'bg-white dark:bg-slate-900');
content = content.replace(/bg-slate-950/g, 'bg-slate-50 dark:bg-slate-950');
// Inputs and selects
content = content.replace(/bg-slate-950 border border-slate-800/g, 'bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800');

// Fix border colors
content = content.replace(/border-slate-800\/50/g, 'border-slate-200 dark:border-slate-800/50');
content = content.replace(/border-slate-800/g, 'border-slate-200 dark:border-slate-800');

// Rounded corners
content = content.replace(/rounded-\[2\.5rem\]/g, 'rounded-2xl');
content = content.replace(/rounded-3xl/g, 'rounded-2xl');

// Remove double darkness or bad combinations from multiple replacements
content = content.replace(/glass-card glass-card/g, 'glass-card');
content = content.replace(/text-slate-900 dark:text-slate-900 dark:text-white/g, 'text-slate-900 dark:text-white');

fs.writeFileSync(file, content);
console.log("Updated Reports.tsx");
