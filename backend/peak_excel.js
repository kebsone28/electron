
import xlsx from 'xlsx';
import path from 'path';

const filePath = 'c:/Mes-Sites-Web/GEM_SAAS/Liste/Liste-LSE.xlsx';

try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    console.log('--- Excel Peak (First 10 rows) ---');
    console.log(JSON.stringify(data.slice(0, 10), null, 2));
} catch (e) {
    console.error('Error reading Excel:', e.message);
}
