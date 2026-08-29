# 📥 Data Export Feature Documentation

## Overview
SIAGA now supports exporting data in multiple formats:
- **CSV** - Standard comma-separated values format
- **XLSX** - Microsoft Excel format with auto-sized columns
- **Google Sheets** - Direct export with automatic sheet creation and sharing capabilities

## Features

### 1. CSV Export
- **Format**: Standard CSV with UTF-8 encoding and BOM
- **Use case**: Compatibility with most data analysis tools
- **File naming**: `{dataType}_{dateRange}.csv`
- **Example**: `Rekonsiliasi_2026-08-01_2026-08-29.csv`

### 2. XLSX Export
- **Format**: Microsoft Excel format (.xlsx)
- **Auto-sizing**: Columns automatically adjust to content width
- **Use case**: Professional presentations and further analysis in Excel
- **File naming**: `{dataType}_{dateRange}.xlsx`
- **Example**: `Transaksi_2026-08-29.xlsx`

### 3. Google Sheets Export
- **Features**:
  - Automatic Google Sheet creation if not specified
  - Direct link to open sheet in Google Drive
  - Optional sharing capabilities (planned)
- **Authentication**: OAuth 2.0 with Google
- **Use case**: Real-time collaboration and cloud-based data management

## Supported Pages

### ReconciliationsPage
Export reconciliation data comparing expected vs actual transactions:
- **Data fields**: Lapak, Sektor, Pemilik, Tagihan, Realisasi, Selisih, Transaksi, Status
- **Pagination**: Exports current page data (10 items per page)
- **Filename pattern**: `Rekonsiliasi_{dateFrom}_{dateTo}`

### TransactionsPage
Export transaction history:
- **Data fields**: Lapak, Pembayar, Jumlah, Metode, Status, Catatan, Tanggal
- **Pagination**: Exports current page data (10 items per page)
- **Filename pattern**: `Transaksi_{current_date}`

### SetoranPage
Export officer deposits data:

#### Summary View
- **Data fields**: Petugas, Total Setoran, Total Terkumpul, Jumlah Transaksi, Pending, Disetujui, Ditolak
- **Pagination**: Exports current page data (8 items per page)
- **Filename pattern**: `Setoran_Summary_{dateFrom}_{dateTo}`

#### Detail View
- **Data fields**: ID, Petugas, Jumlah, Transaksi, Status, Catatan, Tanggal, Alasan Penolakan
- **Pagination**: Exports current page data (8 items per page)
- **Filename pattern**: `Setoran_Detail_{dateFrom}_{dateTo}`

## Implementation Details

### Component: ExportButtons
Located in `src/components/ExportButtons.tsx`

```tsx
<ExportButtons
  data={dataArray}
  filename="custom_name"
  sheetName="Sheet Name"
/>
```

**Props**:
- `data` (required): Array of objects to export
- `filename` (optional): Base filename without extension (default: "export")
- `sheetName` (optional): Google Sheets tab name (default: "Data")
- `onExportStart` (optional): Callback when export starts
- `onExportEnd` (optional): Callback when export ends

### Utility Functions

#### exportUtils.ts
```typescript
// CSV export
exportToCSV(data, filename)

// XLSX export
exportToXLSX(data, filename, sheetName)

// Google Sheets export
exportToGoogleSheets(data, spreadsheetId?, sheetName)
```

#### googleSheetsAuth.ts
- `initializeGoogleAPI()` - Initialize Google API
- `googleLogin()` - Authenticate with Google
- `googleLogout()` - Logout from Google
- `isGoogleLoggedIn()` - Check authentication status
- `createGoogleSheet(title)` - Create new sheet
- `shareGoogleSheet(spreadsheetId, email, role)` - Share sheet with users
- `appendToGoogleSheet(spreadsheetId, range, values)` - Add data to sheet
- `updateGoogleSheet(spreadsheetId, range, values)` - Update sheet data

## Google Sheets Setup

### Prerequisites
1. Google Cloud Project with Sheets API enabled
2. OAuth 2.0 credentials (Client ID)
3. Environment variables configured:
   ```env
   VITE_GOOGLE_CLIENT_ID=your_client_id
   VITE_GOOGLE_API_KEY=your_api_key
   ```

### Usage Flow
1. User clicks Export → Google Sheets
2. If not logged in, redirects to Google login
3. System creates new Google Sheet or uses provided ID
4. Data is uploaded to the sheet
5. User gets link to open sheet in Google Drive

## Pagination Behavior

**Important**: Export buttons export data from the currently displayed page, not all available data.

- **ReconciliationsPage**: 10 items per page
- **TransactionsPage**: 10 items per page  
- **SetoranPage**: 8 items per page (both views)

To export all data, navigate through pages and export each page separately, or modify the component to use full dataset.

## UI/UX Features

### Export Button
- **Style**: Green button with download icon (📥)
- **State**: Disabled when no data available
- **Loading**: Shows "Mengekspor..." text during export

### Export Menu
- **Position**: Dropdown menu below button
- **Options**: CSV, XLSX, Google Sheets
- **Auto-close**: Closes when option selected or clicking outside

### Success Feedback
- **Alert**: Shows success message with filename
- **Format**: "✓ Data berhasil diekspor ke {filename}"

## Error Handling

### CSV/XLSX Export
- Validates data before export
- Shows alert if data is empty
- Catches and logs export errors

### Google Sheets Export
- Checks Google authentication status
- Initiates login if needed
- Handles API errors gracefully
- Shows user-friendly error messages

## Data Format Specifications

### CSV
- **Encoding**: UTF-8 with BOM
- **Delimiter**: Comma (,)
- **Quotes**: Auto-escaped for fields containing commas
- **Headers**: Included as first row

### XLSX
- **Format**: Office Open XML
- **Column Types**: Automatic type detection
- **Width**: Auto-sized to content
- **Header**: First row contains column names

### Google Sheets
- **Access**: Shareable link provided
- **Format**: Native Google Sheets format
- **Collaboration**: Real-time multi-user support
- **Version History**: Automatic versioning

## Performance Considerations

### Large Datasets
- CSV/XLSX: Suitable for datasets up to 10,000+ rows
- Google Sheets: API limits may apply (100,000 cells)
- Pagination helps manage large datasets

### Client-Side Processing
- All export processing happens in browser
- No server overhead for CSV/XLSX
- Google Sheets requires API calls

## Future Enhancements

1. **Batch Export**: Export multiple date ranges at once
2. **Custom Templates**: User-defined export templates
3. **Scheduled Exports**: Automatic daily/weekly exports
4. **Email Integration**: Send exports via email
5. **PDF Support**: Export to PDF format
6. **Chart Export**: Export data visualizations

## Troubleshooting

### Export Button Disabled
- **Cause**: No data available or not loaded yet
- **Solution**: Wait for data to load, check filters

### Google Sheets Export Fails
- **Cause**: Not authenticated with Google
- **Solution**: Click "Logout Google" button, re-login
- **Cause**: Invalid API credentials
- **Solution**: Verify VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_API_KEY

### File Download Not Triggered
- **Cause**: Browser popup blocker
- **Solution**: Allow popups for this site
- **Cause**: Large dataset
- **Solution**: Export in smaller batches

## Dependencies

- **xlsx** (v0.18+): XLSX export functionality
- **papaparse** (v5.4+): CSV parsing and export
- Google Sheets API v4: Cloud-based sheet management

## Files Modified/Created

### New Files
- `src/components/ExportButtons.tsx` - Export UI component
- `src/lib/exportUtils.ts` - Export utility functions
- `src/lib/googleSheetsAuth.ts` - Google authentication helpers

### Modified Files
- `src/pages/ReconciliationsPage.tsx` - Added export button
- `src/pages/TransactionsPage.tsx` - Added export button
- `src/pages/SetoranPage.tsx` - Added export button (both views)
- `package.json` - Added xlsx and papaparse dependencies

## Version History

### v1.0.0 (2026-08-29)
- Initial release
- CSV export support
- XLSX export support
- Google Sheets integration (basic)
- Export buttons on 3 main pages

---

**Last Updated**: 2026-08-29  
**Author**: SIAGA Development Team  
**Status**: Production Ready
