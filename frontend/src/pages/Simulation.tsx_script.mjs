import fs from 'fs';

const file = 'c:/Mes-Sites-Web/GEM_SAAS/frontend/src/pages/Simulation.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Replace large border radii
content = content.replace(/rounded-\[2\.5rem\]/g, 'glass-card');
content = content.replace(/rounded-\[3rem\]/g, 'glass-card');
content = content.replace(/rounded-3xl/g, 'rounded-2xl');

// Add dark mode variants and light mode defaults
content = content.replace(/bg-slate-950/g, 'bg-slate-50 dark:bg-slate-950');
content = content.replace(/bg-slate-900\/50/g, 'bg-white/50 dark:bg-slate-900/50');
content = content.replace(/bg-slate-900\/80/g, 'bg-white/80 dark:bg-slate-900/80');
content = content.replace(/bg-slate-900/g, 'bg-white dark:bg-slate-900');
content = content.replace(/bg-slate-950\/50/g, 'bg-slate-50 dark:bg-slate-950/50');
content = content.replace(/bg-indigo-950\/40/g, 'bg-indigo-50 dark:bg-indigo-950/40');
content = content.replace(/bg-indigo-950\/30/g, 'bg-indigo-50 dark:bg-indigo-950/30');

// Text colors
content = content.replace(/text-white/g, 'text-slate-900 dark:text-white');
content = content.replace(/text-slate-200/g, 'text-slate-800 dark:text-slate-200');
content = content.replace(/text-slate-300\/70/g, 'text-slate-600 dark:text-slate-300/70');
content = content.replace(/text-indigo-300\/70/g, 'text-indigo-600 dark:text-indigo-300/70');
content = content.replace(/text-slate-400/g, 'text-slate-600 dark:text-slate-400');
content = content.replace(/text-slate-500/g, 'text-slate-500 dark:text-slate-400');

// Borders
content = content.replace(/border-slate-800\/50/g, 'border-slate-200 dark:border-slate-800/50');
content = content.replace(/border-slate-800/g, 'border-slate-200 dark:border-slate-800');

// Fix accidental double darks or classes if there's any
content = content.replace(/text-slate-900 dark:text-slate-900 dark:text-white/g, 'text-slate-900 dark:text-white');
content = content.replace(/text-slate-500 dark:text-slate-600 dark:text-slate-400/g, 'text-slate-600 dark:text-slate-400');

// Fix the main wrapper which now says bg-slate-50 dark:bg-slate-950 but we don't need it if we're blending
content = content.replace(/className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 pb-32"/, 'className="min-h-screen p-4 md:p-8 pb-32"');

fs.writeFileSync(file, content);
console.log("Updated Simulation.tsx");
