const defaultApiBaseUrl = 'https://web-page-sublime-gracia.onrender.com';

const getApiBaseUrl = () =>
  process.env.APP_API_URL || process.env.VITE_API_URL || defaultApiBaseUrl;

module.exports = { getApiBaseUrl };
