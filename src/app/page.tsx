"use client";
import { useState } from "react";
export default function Home() {
  // Local state for rows of config
  const [rows, setRows] = useState<StateRow[]>([]);
  const [password, setPassword] = useState<string>("");

 // Define the shape of a state row
interface StateRow {
  key: string;
  label: string;
  policy: string;
}

  // Handle changes to a single cell
  const handleRowChange = (
  index: number,
    field: keyof StateRow,
    value: string  ) => {
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
  if(password == ""){
    alert("please provide password")
    return
  }
  console.log("raw",rows)
   const res = await fetch("/api/updateProductState", {
     method: "POST",
      body: JSON.stringify({ config: rows,password }),
       headers: {
        "Content-Type": "application/json",
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
        <input
          className="px-4 py-2 bg-white-500 black-white rounded border p-2"
          placeholder="password"
          type="password"
          onChange={(e)=>setPassword(e.target.value)}
        />
      </div>
    </div>
  );
}

