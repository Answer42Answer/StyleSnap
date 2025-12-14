/**
 * OpenRouter API Service
 * 替代原有的 Gemini API，统一使用 OpenRouter 调用多种模型
 */

import { ValidationResult, Gender, HairColor, HairDescription, GeneratedImage } from "../types";

// 声明 process.env 类型（Vite 注入）
declare const process: {
  env: {
    OPENROUTER_API_KEY?: string;
  };
};

// OpenRouter API 配置
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

// 模型配置 - 可以根据需要切换
const MODELS = {
  // 用于文本分析（人脸验证、发型描述生成）- 使用支持 vision 的模型
  text: "google/gemini-2.5-flash",
  // 用于图像生成 - Gemini 3 Pro Image Preview（专门用于图像生成）
  imageGeneration: "google/gemini-3-pro-image-preview",
};

const getApiKey = () => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is missing");
  }
  return apiKey;
};

interface OpenRouterMessage {
  role: "user" | "assistant" | "system";
  content: string | Array<{
    type: "text" | "image_url";
    text?: string;
    image_url?: { url: string };
  }>;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
      images?: Array<{
        type: string;
        image_url: { url: string };
      }>;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// 通用 API 调用函数
async function callOpenRouter(
  model: string,
  messages: OpenRouterMessage[],
  options: {
    modalities?: string[];
    image_config?: { aspect_ratio?: string };
    response_format?: { type: string };
    max_tokens?: number;
  } = {}
): Promise<OpenRouterResponse> {
  const apiKey = getApiKey();

  const payload: any = {
    model,
    messages,
    // 限制 max_tokens 以节省费用
    max_tokens: options.max_tokens || 4096,
    ...options,
  };

  const response = await fetch(OPENROUTER_BASE_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": typeof window !== 'undefined' ? window.location.origin : "http://localhost:3000",
      "X-Title": "StyleSnap AI Hairstyle Consultant",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// 1. 验证人脸
export const validateFace = async (base64Image: string): Promise<ValidationResult> => {
  // 保留完整的 data URL 格式
  const imageDataUrl = base64Image.startsWith('data:')
    ? base64Image
    : `data:image/jpeg;base64,${base64Image}`;

  try {
    const response = await callOpenRouter(MODELS.text, [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze this image. Determine if it contains a single, clear, front-facing human face suitable for hairstyle simulation. 
            
            Rules:
            1. **Glasses/Eyewear are ACCEPTABLE**. Do NOT fail validation because the person is wearing glasses.
            2. The face should not be obscured by hands, masks, or large objects.
            3. The image must be clear (not blurry) and well-lit.
            
            Return ONLY a valid JSON object with structure: { "isValid": boolean, "reason": string }. 
            If valid, reason should be "Ok". If invalid, explain why (e.g., "Face not detected", "Too blurry", "Face covered by hand").
            Do not include any markdown formatting, just pure JSON.`,
          },
          {
            type: "image_url",
            image_url: { url: imageDataUrl },
          },
        ],
      },
    ]);

    const text = response.choices[0]?.message?.content;
    if (!text) return { isValid: false, reason: "No response from AI" };

    // 清理可能的 markdown 格式
    const cleanJson = text.replace(/```json\s*|\s*```/g, "").trim();
    return JSON.parse(cleanJson) as ValidationResult;
  } catch (error: any) {
    console.error("Face validation error:", error);
    console.error("Error details:", error?.message || error);
    return { isValid: false, reason: `Validation failed: ${error?.message || 'Unknown error'}` };
  }
};

// 2. 生成发型图片
export const generateHairstyleImage = async (
  base64Image: string,
  gender: Gender,
  stylePrompt: string,
  hairColor: HairColor,
  variationIndex: number
): Promise<string | null> => {
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
  const imageDataUrl = `data:image/jpeg;base64,${cleanBase64}`;

  let colorPrompt = "";
  switch (hairColor) {
    case 'original':
      colorPrompt = "Keep the person's original hair color or a natural matching shade.";
      break;
    case 'black':
      colorPrompt = "The hair color must be Natural Black.";
      break;
    case 'dark_brown':
      colorPrompt = "The hair color must be Dark Brown.";
      break;
    case 'light_brown':
      colorPrompt = "The hair color must be Light Brown or Chestnut.";
      break;
    case 'blonde':
      colorPrompt = "The hair color must be Blonde.";
      break;
    case 'red':
      colorPrompt = "The hair color must be Red or Auburn.";
      break;
    case 'silver':
      colorPrompt = "The hair color must be Silver or Grey.";
      break;
    case 'fashion':
      colorPrompt = "The hair color should be a trendy fashion color (like pastel pink, blue, or purple) that suits the style.";
      break;
  }

  try {
    const response = await callOpenRouter(
      MODELS.imageGeneration,
      [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Generate a photorealistic portrait of this ${gender} person with a new hairstyle.
            
            Target Hairstyle: ${stylePrompt}.
            ${colorPrompt}
            
            Key Requirements:
            1. **Identity**: Maintain the person's original facial features but apply subtle improvements.
            2. **Aesthetics**: Apply skin smoothing and moderate face slimming to enhance facial contour and aesthetics. Make the person look their best.
            3. **Expression**: The person should have a warm, natural, and charming smile.
            4. **Lighting**: Cinematic Rembrandt lighting to create depth, dimension, and a premium 3D look.
            5. **Background**: Professional high-end studio photography background (soft off-white or light grey) to ensure hair details and silhouette are clearly visible.
            6. **Texture**: Realistic hair texture.
            
            Variation seed: ${variationIndex + 1}.`,
            },
            {
              type: "image_url",
              image_url: { url: imageDataUrl },
            },
          ],
        },
      ],
      {
        modalities: ["image", "text"],
        // 使用最低分辨率节省费用：1:1 = 1024x1024
        image_config: {
          aspect_ratio: "1:1",
        },
      }
    );

    // 从响应中提取图片
    console.log("Image generation response:", JSON.stringify(response, null, 2));

    const message = response.choices?.[0]?.message;
    console.log("Message object:", message);

    // OpenRouter 返回的图片可能在不同位置
    if (message?.images && message.images.length > 0) {
      console.log("Found images in message.images");
      const img = message.images[0] as any;
      return img.image_url?.url || img.imageUrl?.url;
    }

    // 某些模型可能直接在 content 中返回 base64
    if (message?.content && message.content.includes('data:image')) {
      console.log("Found image in message.content");
      const match = message.content.match(/(data:image\/[^;]+;base64,[^\s"]+)/);
      if (match) return match[1];
    }

    console.log("No images found in response");
    return null;
  } catch (error: any) {
    console.error("Image generation error:", error);
    console.error("Error details:", error?.message || error);
    return null;
  }
};

// 3. 生成发型描述（支持多选）
export const generateHairstyleDescription = async (
  selectedImages: GeneratedImage[],
  language: 'zh' | 'en' = 'zh'
): Promise<HairDescription[]> => {
  // 构建消息内容
  const contentParts: Array<{ type: "text" | "image_url"; text?: string; image_url?: { url: string } }> = [];

  const promptText = language === 'zh'
    ? `你是一位世界顶级发型教育总监。我将上传 ${selectedImages.length} 张不同的发型设计图（按 Image 1, Image 2... 顺序）。
       
       **核心任务**：
       请仔细观察每一张图片，识别图片中的特定发型，并为每一张图分别撰写一份【专业发型分析卡】。
       
       **严正警告 (Strict Rules)**：
       1. **拒绝雷同**：每一张图片的分析必须**完全基于该图片的视觉特征**。如果 Image 1 是短发，Image 2 是长发，它们的描述必须完全不同。严禁复制粘贴。
       2. **标题规范**：Title 必须是该发型的具体专业名称（例如："日系纹理烫"、"法式慵懒卷"、"美式渐变寸头"、"韩式气垫烫"）。**绝对不要**使用"图片1"、"发型方案"、"设计图"这种泛指词。标题要简短、优雅。
       3. **专业性**：内容需包含具体的修剪结构、色彩建议和打理手法，供专业发型师参考。

       **输出格式 (JSON)**：
       请返回一个 JSON 对象，包含 "results" 数组，数组中有 ${selectedImages.length} 个对象。
       每个对象包含 "title" 和 "sections" 数组。
       
       "sections" 数组里的每个对象必须严格包含以下两个字段：
       - "heading": 小标题名称（例如 "剪裁结构"）
       - "content": 具体内容（请用分点符号 • 开头，保持简练）
       
       必须包含以下 4 个 heading：
       1. 剪裁结构 (Cut Structure)
       2. 色彩方案 (Color Formula)
       3. 造型打理 (Styling)
       4. 适合人群 (Suitability)

       内容请保持简练（30字以内），直击重点。
       
       只返回纯 JSON，不要包含 markdown 格式。`
    : `You are a World-Class Hair Education Director. I am uploading ${selectedImages.length} different hairstyle images (labeled Image 1, Image 2...).
       
       **Core Task**:
       Carefully observe EACH image, identify the specific hairstyle, and write a [Professional Hairstyle Analysis Card] for each one.
       
       **STRICT RULES**:
       1. **No Duplicates**: The analysis for each image must be **strictly based on the visual evidence** of that specific image. If Image 1 is a crop and Image 2 is a bob, the descriptions MUST be completely different. DO NOT copy-paste generic text.
       2. **Specific Titles**: The 'title' field MUST be the specific professional name of the style (e.g., "Textured French Crop", "Soft Layered Bob", "Platinum Pixie"). **DO NOT** use "Image 1" or "Hairstyle Plan".
       3. **Professionalism**: Include technical cut structure, color codes, and styling advice.

       **Output Format (JSON)**:
       Return a JSON object with a "results" array containing ${selectedImages.length} items, corresponding to the images in order.
       Each item has 'title' and 'sections'.

       The 'sections' array MUST contain objects with specific keys:
       - "heading": The name of the section (e.g., "Cut Structure")
       - "content": The details (bullet points)
       
       Sections must include these 4 headings:
       1. Cut Structure
       2. Color Formula
       3. Styling Guide
       4. Suitability

       Keep content concise (bullet points), technical, and actionable.
       Return pure JSON only, no markdown formatting.`;

  contentParts.push({ type: "text", text: promptText });

  // 添加图片
  selectedImages.forEach((img, index) => {
    const cleanBase64 = img.url.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
    contentParts.push({ type: "text", text: `Image ${index + 1}:` });
    contentParts.push({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${cleanBase64}` },
    });
  });

  try {
    const response = await callOpenRouter(MODELS.text, [
      {
        role: "user",
        content: contentParts,
      },
    ], {
      max_tokens: 2048, // 限制输出 tokens
    });

    const text = response.choices[0]?.message?.content;
    console.log("Description response text:", text);

    if (!text) throw new Error("No text response");

    // 清理可能的 markdown 格式
    const cleanJson = text.replace(/```json\s*|\s*```/g, "").trim();
    console.log("Clean JSON:", cleanJson);

    const json = JSON.parse(cleanJson);
    console.log("Parsed JSON:", json);

    // 处理不同的响应格式
    let results = json.results || json;
    if (!Array.isArray(results)) {
      results = [results];
    }

    // 映射回图片，并确保 sections 格式正确
    return results.map((res: any, idx: number) => {
      // 确保 sections 是数组
      let sections = res.sections;
      if (!Array.isArray(sections)) {
        // 如果 sections 不是数组，尝试转换
        if (typeof sections === 'object' && sections !== null) {
          sections = Object.entries(sections).map(([key, value]) => ({
            heading: key,
            content: Array.isArray(value) ? value.join('\n') : String(value || '')
          }));
        } else {
          sections = [{ heading: "描述", content: String(sections || "暂无描述") }];
        }
      } else {
        // sections 是数组，但要确保每个 content 是字符串
        sections = sections.map((s: any) => ({
          heading: s.heading || '',
          content: Array.isArray(s.content) ? s.content.join('\n') : String(s.content || '')
        }));
      }

      return {
        imageId: selectedImages[idx]?.id || 'unknown',
        title: res.title || (language === 'zh' ? "时尚造型" : "Stylish Look"),
        sections: sections
      };
    });
  } catch (error) {
    console.error("Description generation error:", error);
    // 回退：返回每张图片的通用结果
    return selectedImages.map(img => ({
      imageId: img.id,
      title: language === 'zh' ? "时尚定制造型" : "Modern Customized Look",
      sections: language === 'zh' ? [
        { heading: "分析失败", content: "无法获取详细说明，请重试。" }
      ] : [
        { heading: "Error", content: "Could not generate details." }
      ]
    }));
  }
};

