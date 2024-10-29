const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const generateTags = async (title, description) => {
    const prompt = `Based on the following movie description: "${description}", and title: "${title}" please suggest relevant tags for the movie. The tags should be formatted as a comma-separated list, without any additional headings or bullet points. The tags should reflect the themes, genres, and significant elements of the movie, providing useful suggestions for users who may be interested in this film. Please limit your suggestions to no more than 8 tags. Answer in Polish.`;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        throw Error(error);
    }
}

module.exports = generateTags;
