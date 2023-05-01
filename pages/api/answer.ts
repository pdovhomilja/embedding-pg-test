import { OpenAIStream } from "@/utils/openAIStream";

export const config = {
  runtime: "edge",
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { prompt } = (await req.json()) as { prompt: string };

    const stream = await OpenAIStream(prompt);

    return new Response(stream, { status: 200 });
  } catch (e) {
    return new Response("error", { status: 500 });
  }
};

export default handler;
