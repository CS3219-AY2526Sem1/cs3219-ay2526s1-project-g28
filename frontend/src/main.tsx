import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./auth/ProtectedRoute";
import { AuthProvider } from "./auth/AuthContext";
import "./index.css";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import MatchingPage from "./pages/MatchingPage";
import Dashboard from "./pages/Dashboard";
import Signup from "./pages/Signup";
import HomePage from "./pages/HomePage";
import LoginSuccess from "./pages/LoginSuccess";
import { ThemeProvider } from "./theme/ThemeProvider";
import Settings from "./pages/Settings";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
  <React.StrictMode>
    <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<div className="p-10">404 Not found</div>} />
        <Route path="/login/success" element={<LoginSuccess />} />
        {/* Everything below requires auth */}
        <Route element={<ProtectedRoute />}>
          <Route path="/settings" element={<Settings />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/matchingpage" element={<MatchingPage />} />
          <Route path="/home" element={<HomePage />} />
          </Route>
      </Routes>

      
</AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
  </ThemeProvider>
);
