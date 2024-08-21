import { OpenAI } from 'openai';

const openai = new OpenAI(process.env.OPENAI_API_KEY);

export async function getAIResponse(message) {
    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: "<system_prompt> You are an AI consultant specializing in business process optimization..." },
            { role: "user", content: message },
        ],
        temperature: 1,
        max_tokens: 737,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
    });

    return response.choices[0].message.content;
}
