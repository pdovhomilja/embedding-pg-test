import { PGEssay, PGChunk, PGJSON } from "@/types";
import axios from "axios";
import * as cheerio from "cheerio";
import { encode } from "gpt-3-encoder";
import fs from "fs";

const BASE_URL = "http://www.paulgraham.com";
const CHUNK_SIZE = 200;

const getLinks = async () => {
  const html = await axios.get(`${BASE_URL}/articles.html`);
  const $ = cheerio.load(html.data);
  //console.log(html);

  const tables = $("table");

  const linksArr: { url: string; title: string }[] = [];

  tables.each((i, table) => {
    if (i === 2) {
      const links = $(table).find("a");
      links.each((i, link) => {
        const url = $(link).attr("href");
        const title = $(link).text();

        if (url && url.endsWith(".html") && title) {
          const linkObj = {
            url,
            title,
          };
          linksArr.push(linkObj);
        }
      });
    }
  });
  return linksArr;
};

const getEssay = async (url: string, title: string) => {
  //const { title, url } = linkObj;

  let essay: PGEssay = {
    title: "",
    url: "",
    date: "",
    content: "",
    tokens: 0,
    chunks: [],
  };

  const html = await axios.get(`${BASE_URL}/${url}`);
  const $ = cheerio.load(html.data);
  const tables = $("table");

  tables.each((i, table) => {
    if (i === 1) {
      const text = $(table).text();
      //console.log(text, "text");

      let cleanedText = text
        .replace(/\s+/g, " ")
        .replace(/\.([a-zA-Z])/g, ". $1");

      //console.log(cleanedText, "cleanedText");

      const split = cleanedText.match(/([A-Z][a-z]+ [0-9]{4})/);

      let dateStr = "";
      let textWithoutDate = "";

      if (split) {
        dateStr = split[0];
        textWithoutDate = cleanedText.replace(dateStr, "");
      }

      let essayText = textWithoutDate.replace(/\s+/g, " ").trim();

      essay = {
        title,
        url: `${BASE_URL}/${url}`,
        date: dateStr,
        content: essayText,
        tokens: encode(essayText).length,
        chunks: [],
      };
    }
  });
  return essay;
};

const getChunks = (essay: PGEssay) => {
  const { title, url, date, content } = essay;

  let essayTextChunks: string[] = [];

  if (encode(content).length > CHUNK_SIZE) {
    const split = content.split(". ");
    let chunkText = "";

    for (let i = 0; i < split.length; i++) {
      const sentence = split[i];
      const sentenceTokensLength = encode(sentence).length;
      const chunkTextTokensLength = encode(chunkText).length;

      if (chunkTextTokensLength + sentenceTokensLength > CHUNK_SIZE) {
        essayTextChunks.push(chunkText);
        chunkText = "";
      }

      if (sentence[sentence.length - 1].match(/[a-z0-9]/i)) {
        chunkText += sentence + ". ";
      } else {
        chunkText += sentence + " ";
      }
    }
    essayTextChunks.push(chunkText.trim());
  } else {
    essayTextChunks.push(content.trim());
  }
  const essayChunks: PGChunk[] = essayTextChunks.map((chunkText, i) => {
    const chunk: PGChunk = {
      essay_title: title,
      essay_url: url,
      essay_date: date,
      content: chunkText,
      content_tokens: encode(chunkText).length,
      embedding: [],
    };
    return chunk;
  });

  if (essayChunks.length > 1) {
    for (let i = 0; i < essayChunks.length; i++) {
      const chunk = essayChunks[i];
      const prevChunk = essayChunks[i - 1];
      if (chunk.content_tokens < 100 && prevChunk) {
        prevChunk.content += chunk.content;
        prevChunk.content_tokens += encode(prevChunk.content).length;
        essayChunks.splice(i, 1);
      }
    }
  }

  const chunkedEssay: PGEssay = {
    ...essay,
    chunks: essayChunks,
  };

  return chunkedEssay;
};

(async () => {
  const links = await getLinks();

  let essays: PGEssay[] = [];

  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    const essay = await getEssay(link.url, link.title);
    const chunkedEssay = getChunks(essay);
    essays.push(chunkedEssay);
    //console.log(chunkedEssay);
  }
  const json: PGJSON = {
    tokens: essays.reduce((acc, essay) => acc + essay.tokens, 0),
    essays,
  };

  fs.writeFileSync("scripts/pg.json", JSON.stringify(json));
})();
