"use client";
import { useState } from "react";
export default function Home() {
  // Local state for rows of config
  const [rows, setRows] = useState([]);

 
  // Handle changes to a single cell
  const handleRowChange = (index, field, value) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  // Add a blank new row
  const addRow = () =>
    setRows([...rows, { key: '', label: '', policy: 'continue' }]);


  // Trigger the sync script on-demand
  const runSync = async () => {
 try {
  console.log("raw",rows)
  return
   const res = await fetch("/api/updateProductState", {
     method: "POST",
     body: {

     }, 
   });
   const data = await res.json();
   if (res.ok) {
     alert("Inventory updated successfully, " + (data?.admin_url ?? ""));
     console.log(data);
   } else {
     alert("❌ Inventory update failed");
     console.error(data);
   }
 } catch (error) {
   console.error("Error uploading file:", error);
   alert("❌ Something went wrong.");
 }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">State Configuration</h1>

      <table className="w-full border-collapse mb-4">
        <thead>
          <tr>
            <th className="border p-2 text-left">State</th>
            <th className="border p-2 text-left">ATC Label</th>
            <th className="border p-2 text-left">Policy</th>
            <th className="border p-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              <td className="border p-2">
                <input
                  type="text"
                  className="w-full"
                  value={row.key}
                  onChange={e => handleRowChange(idx, 'key', e.target.value)}
                />
              </td>
              <td className="border p-2">
                <input
                  type="text"
                  className="w-full"
                  value={row.label || ''}
                  onChange={e => handleRowChange(idx, 'label', e.target.value)}
                />
              </td>
              <td className="border p-2">
                <select
                  className="w-full"
                  value={row.policy}
                  onChange={e => handleRowChange(idx, 'policy', e.target.value)}
                >
                  <option value="continue">Allow oversell</option>
                  <option value="deny">Deny oversell</option>
                </select>
              </td>
              <td className="border p-2 text-center">
                <button
                  className="text-red-500"
                  onClick={() => setRows(rows.filter((_, i) => i !== idx))}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex gap-2">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded"
          onClick={addRow}
        >
          Add State
        </button>
       
        <button
          className="px-4 py-2 bg-purple-500 text-white rounded"
          onClick={runSync}
        >
          Run Sync
        </button>
      </div>
    </div>
  );
}

