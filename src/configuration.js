delete require.cache[require.resolve('./config.json')];
const DATA = require('./config.json');
let clientId = process.env.REACT_APP_CLIENT_ID || DATA.clientId;
// let automaticSilentRenew = process.env.REACT_APP_AUTOMATIC_SILENT_RENEW || DATA.automaticSilentRenew;
// let redirectUri = process.env.REACT_APP_REDIRECT_URI || DATA.redirectUri;
// let responseType = process.env.REACT_APP_RESPONSE_TYPE || DATA.responseType;
// let postLogoutRedirectUri = process.env.REACT_APP_POST_LOGOUT_REDIRECT_URI || DATA.postLogoutRedirectUri;
// let scope = process.env.REACT_APP_SCOPE || DATA.scope;
// let silentRedirectUri = process.env.REACT_APP_SILENT_REDIRECT_URI || DATA.silentRedirectUri;
// let extraQueryParams = process.env.REACT_APP_EXTRA_QUERY_PARAMS || DATA.extraQueryParams;

const maintenanceTemplate = process.env.REACT_APP_MAINTENANCE_TEMPLATE || DATA.maintenanceTemplate || "maintenance";
const maintenanceSiteName = process.env.REACT_APP_MAINTENANCE_SITE_NAME || DATA.maintenanceSiteName || "Logo";
const maintenanceTitle = process.env.REACT_APP_MAINTENANCE_TITLE || DATA.maintenanceTitle || "Site Under Maintenance";
const maintenanceText = process.env.REACT_APP_MAINTENANCE_TEXT || DATA.maintenanceText || "<p>The site is currently undergoing maintenance. Please try again later.</p><p>If the problem persists, contact support.</p>";
const maintenanceEmail = process.env.REACT_APP_MAINTENANCE_EMAIL || DATA.maintenanceEmail;

console.log('Configuration loaded:', { maintenanceTemplate, DATA_maintenanceTemplate: DATA.maintenanceTemplate });

// let repositoryUrl = process.env.REACT_APP_REPOSITORY_URL || DATA.repositoryUrl;
    const apiUrl = process.env.REACT_APP_API_URL || DATA.apiUrl;
// let authority = process.env.REACT_APP_AUTHORITY || DATA.authority;
    const authUrl = process.env.REACT_APP_AUTH_URL || DATA.authUrl;

export const repositoryUrl = apiUrl

export { maintenanceTemplate }
export { maintenanceSiteName }
export { maintenanceTitle }
export { maintenanceText }
export { maintenanceEmail }

export const configuration = {
    client_id: clientId, // spa clientID of your repository
    automaticSilentRenew: true,
    redirect_uri: `${window.location.origin}/authentication/callback`,
    response_type: "code",
    post_logout_redirect_uri: `${window.location.origin}/`,
    scope: "openid profile sensenet",
    authority: authUrl,
    silent_redirect_uri: `${window.location.origin}/authentication/silent_callback`,
    extraQueryParams: { snrepo: repositoryUrl },    
  };