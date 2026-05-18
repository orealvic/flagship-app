import { useEffect, useState } from "react";
import { api } from "../api";

export default function Requisitions() {
  const [reqs, setReqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.listRequisitions()
      .then(d => setReqs(d.requisitions))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading requisitions...</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Requisitions</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requester</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reqs.map(r => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.title}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{r.requester}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{r.vendor_name || "-"}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{r.line_item_count}</td>
                <td className="px-4 py-3 text-sm text-gray-900">${Number(r.total_amount).toFixed(2)}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${r.status === "approved" || r.status === "fulfilled" ? "bg-green-100 text-green-800" : r.status === "submitted" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"}`}>{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}