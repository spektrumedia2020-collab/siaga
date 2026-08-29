import * as XLSX from 'xlsx';
import Papa from 'papaparse';

/**
 * Export data ke CSV format
 * @param data - Array of objects to export
 * @param filename - Nama file yang dihasilkan
 */
export const exportToCSV = (
  data: any[],
  filename: string = 'export.csv'
): void => {
  if (!data || data.length === 0) {
    alert('Tidak ada data untuk diekspor');
    return;
  }

  try {
    const csv = Papa.unparse(data, {
      header: true,
      dynamicTyping: false,
      encoding: 'UTF-8'
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert(`✓ Data berhasil diekspor ke ${filename}`);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    alert('Gagal mengekspor data ke CSV');
  }
};

/**
 * Export data ke XLSX format
 * @param data - Array of objects to export
 * @param filename - Nama file yang dihasilkan
 * @param sheetName - Nama sheet di Excel
 */
export const exportToXLSX = (
  data: any[],
  filename: string = 'export.xlsx',
  sheetName: string = 'Sheet1'
): void => {
  if (!data || data.length === 0) {
    alert('Tidak ada data untuk diekspor');
    return;
  }

  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Auto-size columns
    const colWidths = Object.keys(data[0] || {}).map((key) => ({
      wch: Math.max(
        key.length,
        Math.max(
          ...data.map((row) =>
            String(row[key] || '').length
          )
        )
      ) + 2
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, filename);

    alert(`✓ Data berhasil diekspor ke ${filename}`);
  } catch (error) {
    console.error('Error exporting XLSX:', error);
    alert('Gagal mengekspor data ke XLSX');
  }
};

/**
 * Export data ke Google Sheets
 * @param data - Array of objects to export
 * @param spreadsheetId - ID spreadsheet Google Sheets (opsional)
 * @param sheetName - Nama sheet
 */
export const exportToGoogleSheets = async (
  data: any[],
  spreadsheetId?: string,
  sheetName: string = 'Data'
): Promise<void> => {
  if (!data || data.length === 0) {
    alert('Tidak ada data untuk diekspor');
    return;
  }

  try {
    // Cek apakah user sudah login ke Google
    const accessToken = localStorage.getItem('google_access_token');

    if (!accessToken) {
      alert('Silakan login ke Google terlebih dahulu untuk mengekspor ke Google Sheets');
      // Trigger Google login (akan diimplementasikan di component)
      return;
    }

    // Jika spreadsheet ID tidak diberikan, buat spreadsheet baru
    let targetSpreadsheetId = spreadsheetId;

    if (!targetSpreadsheetId) {
      const createResponse = await fetch(
        'https://sheets.googleapis.com/v4/spreadsheets',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            properties: {
              title: `Export ${new Date().toLocaleDateString('id-ID')}`
            }
          })
        }
      );

      if (!createResponse.ok) {
        throw new Error('Gagal membuat spreadsheet baru');
      }

      const createData = await createResponse.json();
      targetSpreadsheetId = createData.spreadsheetId;
    }

    // Update sheet dengan data
    const headers = Object.keys(data[0] || {});
    const values = [headers, ...data.map((row) => headers.map((h) => row[h] || ''))];

    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${targetSpreadsheetId}/values/${sheetName}!A1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values })
      }
    );

    if (!updateResponse.ok) {
      throw new Error('Gagal mengupdate sheet');
    }

    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}`;
    alert(
      `✓ Data berhasil diekspor ke Google Sheets!\n\nKlik untuk membuka: ${spreadsheetUrl}`
    );

    // Buka spreadsheet di tab baru
    window.open(spreadsheetUrl, '_blank');
  } catch (error) {
    console.error('Error exporting to Google Sheets:', error);
    alert('Gagal mengekspor data ke Google Sheets');
  }
};

/**
 * Format currency untuk display
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

/**
 * Format date untuk display
 */
export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(date));
};
