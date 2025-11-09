import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./auth/ProtectedRoute";
import AdminRoute from "./auth/AdminRoute";
import { AuthProvider } from "./auth/AuthContext";
import "./index.css";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import MatchingPage from "./pages/MatchingPage";
import Signup from "./pages/Signup";
import HomePage from "./pages/HomePage";
import LoginSuccess from "./pages/LoginSuccess";
import QuestionsPage from "./pages/QuestionsPage";
import UsersPage from "./pages/UsersPage";
import HistoryPage from "./pages/HistoryPage";
import CollaborationPage from "./pages/CollaborationPage";
import HistoryDetail from "./pages/HistoryDetail";
import { ThemeProvider } from "./theme/ThemeProvider";
import Settings from "./pages/Settings";
import { Toaster } from "react-hot-toast";
import VerifyEmail from "./pages/VerifyEmail";
import ResetPassword from "./pages/ResetPassword";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000, 
              style: {
                background: "#333",
                color: "#fff",
              },
              success: {
                iconTheme: { primary: "#4ade80", secondary: "#333" },
              },
            }}
          />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="*"
              element={<div className="p-10">404 Not found</div>}
            />
            
            <Route path="/login/success" element={<LoginSuccess />} />
            {/* Everything below requires auth */}
            <Route element={<ProtectedRoute />}>
              <Route path="/settings" element={<Settings />} />
           
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/history/:id" element={<HistoryDetail />} />

              <Route path="/matchingpage" element={<MatchingPage />} />
              <Route path="/home" element={<HomePage />} />
              <Route element={<AdminRoute />}>
                <Route path="/users" element={<UsersPage />} />
                <Route path="/questions" element={<QuestionsPage />} />
              </Route>
              <Route
                path="/collab/:sessionId"
                element={<CollaborationPage />}
              />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  </ThemeProvider>
);
