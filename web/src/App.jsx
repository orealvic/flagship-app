import { Routes, Route, Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "./api";
import Vendors from "./pages/Vendors";
import Requisitions from "./pages/Requisitions";
import NewRequisition from "./pages/NewRequisition";

function Layout({ children }) {
  const [health, setHealth] = useState(null);
  const location = useLocation();
  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth({ status: "error" }));
  }, []);
  const nav = (path, label) => (
    <Link to={path} className={`px-3 py-2 rounded-md text-sm font-medium ${location.pathname === path ? "bg-blue-700 text-white" : "text-gray-200 hover:bg-blue-600 hover:text-white"}`}>{label}</Link>
  );
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-blue-800 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-bold">Flagship Procurement</Link>
            <div className="flex gap-2">
              {nav("/", "Requisitions")}
              {nav("/vendors", "Vendors")}
              {nav("/new", "New Requisition")}
            </div>
          </div>
          <div className="text-xs">
            {health ? (
              <span className={`px-2 py-1 rounded ${health.status === "ok" ? "bg-green-600" : "bg-red-600"}`}>
                API: {health.status} {health.env ? `(${health.env})` : ""}
              </span>
            ) : (
              <span className="px-2 py-1 rounded bg-gray-600">API: checking...</span>
            )}
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Requisitions />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/new" element={<NewRequisition />} />
      </Routes>
    </Layout>
  );
}