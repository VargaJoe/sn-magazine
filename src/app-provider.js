import { Repository } from "@sensenet/client-core";
import { RepositoryContext } from "@sensenet/hooks-react";
import React from "react";

const DATA = require('./config.json');
export function AppProviders({ children }) {
  return <RepositoryProvider>{children}</RepositoryProvider>; 
}
export const RepositoryProvider = ({ children }) => {
  let apiUrl = DATA.apiUrl;
  return (
    <RepositoryContext.Provider value={new Repository({repositoryUrl: apiUrl})}>
      {children}
    </RepositoryContext.Provider>
  );
};