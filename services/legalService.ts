
import { GoogleGenAI, Part } from "@google/genai";
import { Message, Role, Attachment } from "../types";

const GEMINI_API_KEY = process.env.API_KEY || "";

const SYSTEM_INSTRUCTION = `你是一位拥有20年执业经验的资深中国法律专家。
你的目标是：
1. 深入分析用户提供的法律问题、合同、文书或案件证据图片。
2. 引用相关的法律条文（如《民法典》、《刑法》、《劳动合同法》等）。
3. 提供严谨、逻辑清晰的风险评估和建议解决方案。
4. 始终在回答最后包含一段免责声明，明确指出AI生成的建议不能替代执业律师的正式法律意见。
5. 采用专业、客观、同理心的语气。

对于文档和图片，请首先概括其核心内容，然后分析其法律效力和潜在风险。`;

export const generateLegalAdvice = async (
  prompt: string,
  history: Message[],
  attachments: Attachment[] = [],
  config: { engine: 'gemini' | 'deepseek', deepseekApiKey?: string }
): Promise<string> => {
  
  if (config.engine === 'deepseek') {
    if (!config.deepseekApiKey) {
      throw new Error("请先在设置中配置 DeepSeek API Key");
    }
    return callDeepSeek(prompt, history, attachments, config.deepseekApiKey);
  }

  // Gemini Implementation
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const model = 'gemini-3-pro-preview';

  const attachmentParts: Part[] = attachments.map(att => ({
    inlineData: {
      data: att.data.split(',')[1],
      mimeType: att.type
    }
  }));

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [
        { role: 'user', parts: [{ text: SYSTEM_INSTRUCTION }] },
        ...history.map(m => ({
          role: m.role === Role.USER ? 'user' : 'model',
          parts: [{ text: m.content }]
        })),
        { role: 'user', parts: [...attachmentParts, { text: prompt }] }
      ],
      config: {
        thinkingConfig: { thinkingBudget: 16384 },
        temperature: 0.2,
      }
    });

    return response.text || "未能生成回答，请重试。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Gemini 引擎连接失败。");
  }
};

async function callDeepSeek(
  prompt: string,
  history: Message[],
  attachments: Attachment[],
  apiKey: string
): Promise<string> {
  // DeepSeek currently handles images/PDFs via specific specialized models or text extraction
  // Here we implement the chat completion logic.
  const messages = [
    { role: "system", content: SYSTEM_INSTRUCTION },
    ...history.map(m => ({
      role: m.role === Role.USER ? "user" : "assistant",
      content: m.content
    })),
    { 
      role: "user", 
      content: attachments.length > 0 
        ? `${prompt}\n\n[附件信息: 已上传 ${attachments.length} 个文件，DeepSeek 当前模式优先处理文本描述，请确保已在提问中描述关键内容]` 
        : prompt 
    }
  ];

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat", // or deepseek-reasoner
        messages: messages,
        stream: false
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "DeepSeek API 调用失败");
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error: any) {
    console.error("DeepSeek API Error:", error);
    throw new Error(error.message || "DeepSeek 引擎连接失败。");
  }
}
