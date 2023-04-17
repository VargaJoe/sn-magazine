export const repositoryUrl = "https://eddie.sensenet.cloud"
export const configuration = {
  client_id: "", // clientID of your repository
  automaticSilentRenew: true,
  redirect_uri: `${window.location.origin}/authentication/callback`,
  response_type: "code",
  post_logout_redirect_uri: `${window.location.origin}/`,
  scope: "openid profile sensenet",
  authority: "https://eddie-is.sensenet.cloud",
  silent_redirect_uri: `${window.location.origin}/authentication/silent_callback`,
  extraQueryParams: { snrepo: "https://eddie.sensenet.cloud" },
};