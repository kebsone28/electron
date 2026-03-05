
import xlsx from 'xlsx';

const filePath = 'c:/Mes-Sites-Web/GEM_SAAS/Liste/Liste-LSE.xlsx';

try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    // Get headers
    const data = xlsx.utils.sheet_to_json(worksheet);

    console.log('--- Column Names ---');
    if (data.length > 0) {
        console.log(Object.keys(data[0]));
        console.log('--- Sample Row ---');
        console.log(JSON.stringify(data[0], null, 2));
    } else {
        console.log('No data found');
    }
} catch (e) {
    console.error('Error reading Excel:', e.message);
}
