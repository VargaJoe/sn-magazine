import {
  AuthenticationProvider,
  useOidcAuthentication,
} from "@sensenet/authentication-oidc-react";
import { Repository } from "@sensenet/client-core";
import { RepositoryContext } from "@sensenet/hooks-react";
import { configuration, repositoryUrl } from "./configuration";
import React, { useMemo } from "react";
import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";

export function AppProviders({ children }) {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RepositoryProvider>{children}</RepositoryProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export const AuthProvider = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const history = {
    location,
    push: navigate,
  };
  return (
    <AuthenticationProvider configuration={configuration} history={history}>
      {children}
    </AuthenticationProvider>
  );
};

export const RepositoryProvider = ({ children }) => {
  const { oidcUser } = useOidcAuthentication();
  const accessToken = oidcUser?.access_token || undefined;
  // Presentation navigation must not replace the repository client and trigger
  // every consumer's data lifecycle. A real credential change still replaces it.
  const repository = useMemo(() => new Repository({ repositoryUrl,
    ...(accessToken ? { accessToken } : {}) }), [accessToken]);
  return (
    <RepositoryContext.Provider value={repository}>
      {children}
    </RepositoryContext.Provider>
  );
};
