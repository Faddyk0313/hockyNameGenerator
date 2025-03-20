import { NextResponse } from "next/server";
import OpenAI  from "openai";




export async function POST(req:Request) {
    try{

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
              {"role": "user", "content": 
                `
                You are a creative AI assistant specialized in generating authentic, engaging, and relevant hockey team names. Generate exactly 9 team names based on the following user input:

                Team Vibe: [Funny, Bullies, Nerdy, Futuristic, etc.] 
                Mascot Theme: [Military, Animals, Ocean, etc.] 
                Location Name: [City, State, or Region] 
                Colors: [User's chosen colors or Unknown]

                Guidelines for name generation:
                Each name should be ONLY one or two words: [Location] + [Strong Singular/Plural Noun] or just [Strong Singular/Plural Noun].
                If there is no location provided, return only a single-word name (like “Gladiators”)
                Avoid filler words like “The” or “Club” or “Association”
                Max of one three-word name per results (and only if absolutely necessary).
                Prioritize punchy, memorable names that fit hockey’s tough, competitive style. Unless the Vibe is set to “Funny.”
                If colors are provided, subtly reflect them without forcing them into the name.
                Avoid overly generic or overly silly names. If a name sounds weak, replace it with something tougher. No joke names unless the Vibe is set to “Funny”

                Examples of ideal formats:
                Classic hockey style: Boston Bruins, Philadelphia Flyers, Calgary Flames, Detroit Red Wings
                Modern & aggressive: Chicago Warhawks, Toronto Frost, Philly Shock
                Funny & playful: Nashville Narwhals, Denver Dust Devils, Winnipeg Wombats, Toronto Turtlenecks, Ontario Otters


                Example input & output: 
                Inputs: 
                Vibe: Aggressive
                Mascot theme: Military
                Location: Chicago
                Colors: Black & red
                Output: 
                Chicago Warhawks
                Chicago Icehounds
                Windy City Barrage
                Chicago Ironclads
                Chicago Frost
                Chicago Warriors
                Chicago Commanders

                Here’s a “power word” list that align with hockey’s energy. Use these (plus more along these lines) for stronger outputs that ensure the names feel tough and competitive:
                Animals: Bears, Wolves, Hawks, Stallions, Cougars, Pythons, Scorpions
                Forces of nature: Avalanche, Blizzard, Cyclones, Storm, Thunder, Inferno, Flames
                Aggressive words: Rampage, Fury, Strike, Wrath
                Military & strength: Battalion, Armada, Warhawks, Commanders, Ironclads
                Cold & ice: Frost, Icehounds, Glacier, Freeze, Tundra, Whiteout 

                More examples of inputs and outputs:
                Vibe: Futuristic | Mascot Theme: Sci-Fi | Location: Seattle | Colors: Silver & Blue
                Output: Seattle Shockwave, Seattle Cyberhawks, Seattle Neons, Emerald City Titans, Seattle Mecha

                Vibe: Gritty & Tough | Mascot Theme: Street Fighters | Location: Philadelphia | Colors: Black & Gold
                Output: Philadelphia Bruisers, Philly Sluggers, Philadelphia Havoc, Philly Outlaws, Liberty Brawlers

                Vibe: Cold & Ice-Related | Mascot Theme: Arctic Wildlife | Location: Montreal | Colors: White & Blue
                Output: Montreal Frostbite, Montreal Icehounds, Montreal Polar Kings, Quebec Glacier, Arctic Phantoms


                Strictly Only Names
                `
              },
              {"role": "user", "content": data?.prompt}
          
            ]
      });
      
      return NextResponse.json({ message: "Success",response: { success: true,data:completion.choices[0].message.content }, }, { status: 200 });

    }catch (error) {
        console.error("Error :", error);
        return NextResponse.json({ err:error,message: "Internal server error" }, { status: 500 });
      }
    }
