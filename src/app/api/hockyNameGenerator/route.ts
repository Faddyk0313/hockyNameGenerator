import { NextResponse } from "next/server";
import OpenAI  from "openai";




export async function POST(req:Request,res:NextResponse) {
    try{
      res.headers.set("Access-Control-Allow-Origin", "*");
      res.headers.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
      res.headers.set("Access-Control-Allow-Headers", "Content-Type");
        const data = await req.json();

        // open ai config
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

 
        if (!data?.prompt ) {
          return NextResponse.json({ error: "Missing required fields prompt" }, { status: 400 });
        }
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          store: true,
          messages: [
              {"role": "user", "content": "You are a creative AI assistant specialized in generating unique, engaging, and relevant hockey team names. Generate 5-10 team names based on the following user input: Team Vibe: [Funny, Bullies, Nerdy, Futuristic, etc.] Mascot Theme: [Military, Animals, Ocean, etc.] Location Name: [City, State, or Region] Colors: [User's chosen colors or Unknown] Each team name should reflect the given vibe, mascot theme, and location. If colors are provided, subtly incorporate their essence into the name’s tone (e.g., Blue in a name for a blue-themed team). The names should be catchy, unique, and fitting for a hockey team. Examples: Vibe: Aggressive | Mascot Theme: Military | Location: Chicago | Colors: Black & Red Generated Names: Chicago Ice Commanders, Chicago Bloodhounds, Windy City Warhawks Vibe: Funny | Mascot Theme: Animals | Location: Toronto | Colors: Green & Yellow Generated Names: Toronto Turtlenecks, The Laughing Llamas, Ontario Otter Pops Generate a diverse mix of serious, humorous, and edgy names so the user has great options. Only Names"},
              {"role": "user", "content": data?.prompt}
          
            ]
      });
      
      return NextResponse.json({ message: "Success",response: { success: true,data:completion.choices[0].message.content }, }, { status: 200 });

    }catch (error) {
        console.error("Error :", error);
        return NextResponse.json({ err:error,message: "Internal server error" }, { status: 500 });
      }
    }