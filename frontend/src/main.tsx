import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
function Signup() { return <div className="min-h-screen flex items-center justify-center">Signup page</div>; }

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login/>} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<div className="p-10">404 Not found</div>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
