import React from "react";
import ReactDOM from "react-dom/client";
import { Amplify } from "aws-amplify";
import App from "../src/App";
import { AuthProvider } from "./context/AuthContext";
import awsConfig from "./aws-config";
import "../src/index.css";

Amplify.configure(awsConfig);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);