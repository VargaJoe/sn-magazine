const clientId = process.env.REACT_APP_CLIENT_ID;
// let automaticSilentRenew = process.env.REACT_APP_AUTOMATIC_SILENT_RENEW;
// let redirectUri = process.env.REACT_APP_REDIRECT_URI;
// let responseType = process.env.REACT_APP_RESPONSE_TYPE;
// let postLogoutRedirectUri = process.env.REACT_APP_POST_LOGOUT_REDIRECT_URI;
// let scope = process.env.REACT_APP_SCOPE;
// let silentRedirectUri = process.env.REACT_APP_SILENT_REDIRECT_URI;
// let extraQueryParams = process.env.REACT_APP_EXTRA_QUERY_PARAMS;

const maintenanceTemplate = process.env.REACT_APP_MAINTENANCE_TEMPLATE || "maintenance";
const maintenanceSiteName = process.env.REACT_APP_MAINTENANCE_SITE_NAME || "Logo";
const maintenanceTitle = process.env.REACT_APP_MAINTENANCE_TITLE || "Site Under Maintenance";
const maintenanceText = process.env.REACT_APP_MAINTENANCE_TEXT || "<p>The site is currently undergoing maintenance. Please try again later.</p><p>If the problem persists, contact support.</p>";
const maintenanceEmail = process.env.REACT_APP_MAINTENANCE_EMAIL;

console.log('Configuration loaded from env');

// let repositoryUrl = process.env.REACT_APP_REPOSITORY_URL;
    const apiUrl = process.env.REACT_APP_API_URL;
// let authority = process.env.REACT_APP_AUTHORITY;
    const authUrl = process.env.REACT_APP_AUTH_URL;

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