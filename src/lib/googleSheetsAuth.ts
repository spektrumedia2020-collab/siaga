/**
 * Google Sheets Authentication dan API helpers
 */

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'];

/**
 * Inisialisasi Google API
 */
export const initializeGoogleAPI = async (): Promise<void> => {
  if (!window.gapi) {
    // Load Google API script
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi?.load('client:auth2', () => {
          resolve();
        });
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
};

/**
 * Login ke Google
 */
export const googleLogin = async (): Promise<string | null> => {
  try {
    await initializeGoogleAPI();

    if (!window.gapi?.auth2) {
      throw new Error('Google API not initialized');
    }

    const auth = window.gapi.auth2.getAuthInstance() || 
      await window.gapi.auth2.init({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES.join(' ')
      });

    const user = await auth.signIn();
    const token = user.getAuthResponse().id_token;

    localStorage.setItem('google_access_token', token);
    localStorage.setItem('google_user', JSON.stringify(user.getBasicProfile()));

    return token;
  } catch (error) {
    console.error('Google login error:', error);
    throw error;
  }
};

/**
 * Logout dari Google
 */
export const googleLogout = async (): Promise<void> => {
  try {
    if (window.gapi?.auth2) {
      const auth = window.gapi.auth2.getAuthInstance();
      if (auth) {
        await auth.signOut();
      }
    }

    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_user');
  } catch (error) {
    console.error('Google logout error:', error);
  }
};

/**
 * Cek apakah user sudah login ke Google
 */
export const isGoogleLoggedIn = (): boolean => {
  return !!localStorage.getItem('google_access_token');
};

/**
 * Buat spreadsheet baru di Google Drive
 */
export const createGoogleSheet = async (
  title: string
): Promise<string> => {
  const token = localStorage.getItem('google_access_token');

  if (!token) {
    throw new Error('Not authenticated with Google');
  }

  const response = await fetch(
    'https://sheets.googleapis.com/v4/spreadsheets',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title: title,
          locale: 'id_ID',
          timeZone: 'Asia/Jakarta'
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message || 'Failed to create spreadsheet');
  }

  const data = await response.json();
  return data.spreadsheetId;
};

/**
 * Share spreadsheet ke email tertentu
 */
export const shareGoogleSheet = async (
  spreadsheetId: string,
  email: string,
  role: 'reader' | 'commenter' | 'writer' = 'reader'
): Promise<void> => {
  const token = localStorage.getItem('google_access_token');

  if (!token) {
    throw new Error('Not authenticated with Google');
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: role,
        type: 'user',
        emailAddress: email
      })
    }
  );

  if (!response.ok) {
    throw new Error('Failed to share spreadsheet');
  }
};

/**
 * Append data ke Google Sheet
 */
export const appendToGoogleSheet = async (
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<void> => {
  const token = localStorage.getItem('google_access_token');

  if (!token) {
    throw new Error('Not authenticated with Google');
  }

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values })
    }
  );

  if (!response.ok) {
    throw new Error('Failed to append data to sheet');
  }
};

/**
 * Update data di Google Sheet
 */
export const updateGoogleSheet = async (
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<void> => {
  const token = localStorage.getItem('google_access_token');

  if (!token) {
    throw new Error('Not authenticated with Google');
  }

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values })
    }
  );

  if (!response.ok) {
    throw new Error('Failed to update sheet');
  }
};

// Type augmentation untuk window.gapi
declare global {
  interface Window {
    gapi: any;
  }
}
