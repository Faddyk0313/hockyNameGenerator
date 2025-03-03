"use client"
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function Home() {
  const [teamStyle, setTeamStyle] = useState("");
  const [location, setLocation] = useState("");
  const [data, setData] = useState("");

  const styles = [
    "Classic",
    "Funny",
    "Aggressive",
    "Military",
    "Weather",
    "Animal",
    "Mythical",
    "Heroic",
  ];
  const mascot = [
    "Military", "Animals", "Ocean" 
  ];
async function handleClick(){
  const response = await fetch("/api/hockyNameGenerator", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      "prompt":"location:newyork,color:black,vibe:funny,mascot:animals"
    }),
  });
  const data = await response.json();
  console.log(data);
  setData(data.response.data)
}
  return (
    <>
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-6">
      <Card className="w-full max-w-md p-6 bg-white shadow-lg rounded-xl">
        <h1 className="text-2xl font-bold text-center mb-4">Titan's Hockey Team Name Generator</h1>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Team Style:</label>
          <div className="relative">
            <select
              className="w-full border border-gray-300 rounded-md p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={teamStyle}
              onChange={(e) => setTeamStyle(e.target.value)}
            >
              <option value="">Select Team Style</option>
              {styles.map((style) => (
                <option key={style} value={style.toLowerCase()}>
                  {style}
                </option>
              ))}
            </select>
           
          </div>
         
        </div>
        <div className="mb-4">

        <label className="block text-sm font-semibold mb-2">Mascot Theme:</label>
          <div className="relative">
            <select
              className="w-full border border-gray-300 rounded-md p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={teamStyle}
              onChange={(e) => setTeamStyle(e.target.value)}
            >
              <option value="">Select Mascot Theme</option>
              {mascot.map((style) => (
                <option key={style} value={style.toLowerCase()}>
                  {style}
                </option>
              ))}
            </select>
           
          </div>
          </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Location:</label>
          <Input
            type="text"
            placeholder="Enter location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Color:</label>
          <Input
            type="text"
            placeholder="Enter location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <Button className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition" onClick={handleClick}>
          Generate
        </Button>
      </Card>

    </div>
      {data}
      </>
  );
}
