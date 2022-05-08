import * as React from "react";
import { Link } from "react-router-dom";

export const Missing = () => {
  return (
    <div>
      <h1>404</h1>
      <p>Not found</p>
      <Link to="/">Back to home</Link>
    </div>
  );
};
