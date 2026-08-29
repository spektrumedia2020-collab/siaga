import React, { useState } from 'react';
import { exportToCSV, exportToXLSX, exportToGoogleSheets } from '../lib/exportUtils';
import { googleLogin, isGoogleLoggedIn as checkGoogleLogin, googleLogout } from '../lib/googleSheetsAuth';

interface ExportButtonsProps {
  data: any[];
  filename?: string;
  sheetName?: string;
  onExportStart?: () => void;
  onExportEnd?: () => void;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({
  data,
  filename = 'export',
  sheetName = 'Data',
  onExportStart,
  onExportEnd
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState(checkGoogleLogin());
  const [showMenu, setShowMenu] = useState(false);

  const handleExportCSV = () => {
    onExportStart?.();
    setIsExporting(true);
    try {
      exportToCSV(data, `${filename}.csv`);
    } finally {
      setIsExporting(false);
      onExportEnd?.();
      setShowMenu(false);
    }
  };

  const handleExportXLSX = () => {
    onExportStart?.();
    setIsExporting(true);
    try {
      exportToXLSX(data, `${filename}.xlsx`, sheetName);
    } finally {
      setIsExporting(false);
      onExportEnd?.();
      setShowMenu(false);
    }
  };

  const handleExportGoogleSheets = async () => {
    try {
      if (!isGoogleLoggedIn) {
        onExportStart?.();
        setIsExporting(true);
        await googleLogin();
        setIsGoogleLoggedIn(true);
      }

      onExportStart?.();
      setIsExporting(true);
      await exportToGoogleSheets(data, undefined, sheetName);
    } catch (error) {
      console.error('Export error:', error);
      alert('Gagal mengekspor ke Google Sheets. Silakan coba lagi.');
    } finally {
      setIsExporting(false);
      onExportEnd?.();
      setShowMenu(false);
    }
  };

  const handleGoogleLogout = async () => {
    await googleLogout();
    setIsGoogleLoggedIn(false);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting || data.length === 0}
        style={{
          padding: '8px 16px',
          background: '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 600,
          cursor: isExporting || data.length === 0 ? 'not-allowed' : 'pointer',
          opacity: isExporting || data.length === 0 ? 0.6 : 1,
          transition: 'all 0.2s',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
        title="Export data"
      >
        📥 {isExporting ? 'Mengekspor...' : 'Export'}
      </button>

      {showMenu && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            minWidth: '200px'
          }}
        >
          {/* CSV Export */}
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            style={{
              display: 'block',
              width: '100%',
              padding: '12px 16px',
              background: 'transparent',
              color: '#374151',
              border: 'none',
              borderBottom: '1px solid #e5e7eb',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              textAlign: 'left',
              fontSize: '0.9rem',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            📄 CSV
          </button>

          {/* XLSX Export */}
          <button
            onClick={handleExportXLSX}
            disabled={isExporting}
            style={{
              display: 'block',
              width: '100%',
              padding: '12px 16px',
              background: 'transparent',
              color: '#374151',
              border: 'none',
              borderBottom: '1px solid #e5e7eb',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              textAlign: 'left',
              fontSize: '0.9rem',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            📊 Excel (XLSX)
          </button>

          {/* Google Sheets Export */}
          <button
            onClick={handleExportGoogleSheets}
            disabled={isExporting}
            style={{
              display: 'block',
              width: '100%',
              padding: '12px 16px',
              background: 'transparent',
              color: '#374151',
              border: 'none',
              borderBottom: isGoogleLoggedIn ? '1px solid #e5e7eb' : 'none',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              textAlign: 'left',
              fontSize: '0.9rem',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            🗂️ Google Sheets
          </button>

          {/* Google Logout (show if logged in) */}
          {isGoogleLoggedIn && (
            <button
              onClick={handleGoogleLogout}
              style={{
                display: 'block',
                width: '100%',
                padding: '12px 16px',
                background: 'transparent',
                color: '#ef4444',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.85rem',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#fee2e2')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              🚪 Logout Google
            </button>
          )}
        </div>
      )}

      {/* Close menu when clicking outside */}
      {showMenu && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999
          }}
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};
