import { Repository } from "@sensenet/client-core";
import { RepositoryContext } from "@sensenet/hooks-react";
import { repositoryUrl } from "./configuration";
import React from "react";

export function AppProviders({ children }) {
  return <RepositoryProvider>{children}</RepositoryProvider>;
}
export const RepositoryProvider = ({ children }) => {
  return (
    <RepositoryContext.Provider value={new Repository({ repositoryUrl })}>
      {children}
    </RepositoryContext.Provider>
  );
};