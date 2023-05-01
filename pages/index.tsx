import { Answer } from "@/components/Answer";
import { PGChunk } from "@/types";
import endent from "endent";
import { Inter } from "next/font/google";
import Head from "next/head";
import { useState } from "react";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [chunks, setChunks] = useState<PGChunk[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAnswer = async () => {
    setLoading(true);

    const searchResponse = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!searchResponse.ok) {
      console.error("Error searching for answer");
      return;
    }

    const results: PGChunk[] = await searchResponse.json();
    setChunks(results);
    console.log(results);

    //endent clear all whitespace in template strings `
    const prompt = endent`
    Use the following passages to answer the query: ${query}

    ${results.map((chunk) => chunk.content).join("\n")}
    `;
    //end of endent

    console.log(prompt);

    const answerResponse = await fetch("/api/answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!answerResponse.ok) {
      return;
    }

    const data = await answerResponse.body;

    if (!data) {
      return;
    }

    const reader = data.getReader();
    const decoder = new TextDecoder();
    let done = false;

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      const chunkValue = decoder.decode(value);
      setAnswer((prev) => prev + chunkValue);
    }
    setLoading(false);
  };

  return (
    <>
      <Head>
        <title>Paul Graham GPT</title>
        <meta name="desctiption" content="" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex flex-col w-full h-screen items-start justify-center pt-10">
        <div className="flex w-full h-24 items-center justify-center">
          <h1>Next.js + Tailwind CSS</h1>
        </div>
        <div className="flex flex-row space-x-2 w-full px-36">
          <input
            className="border-2 border-gray-500 w-full px-5 rounded-md"
            type="text"
            placeholder="Ask Paul Graham a question"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            className="bg-slate-900 px-5 py-2 rounded-md text-white"
            onClick={handleAnswer}
          >
            Ask
          </button>
        </div>
        <div className="mt-4 px-36">
          {loading ? <div>Loading ...</div> : <Answer text={answer} />}
        </div>
        <div className="flex grow" />
      </main>
    </>
  );
}
