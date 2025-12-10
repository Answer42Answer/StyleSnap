
import { GoogleGenAI, Type } from "@google/genai";
import { ValidationResult, Gender, HairColor, HairDescription, GeneratedImage } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is missing");
  }
  return new GoogleGenAI({ apiKey });
};

// 1. Validate Face
export const validateFace = async (base64Image: string): Promise<ValidationResult> => {
  const ai = getAiClient();
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64,
            },
          },
          {
            text: `Analyze this image. Determine if it contains a single, clear, front-facing human face suitable for hairstyle simulation. 
            
            Rules:
            1. **Glasses/Eyewear are ACCEPTABLE**. Do NOT fail validation because the person is wearing glasses.
            2. The face should not be obscured by hands, masks, or large objects.
            3. The image must be clear (not blurry) and well-lit.
            
            Return JSON with structure: { "isValid": boolean, "reason": string }. 
            If valid, reason can be "Ok". If invalid, explain why (e.g., "Face not detected", "Too blurry", "Face covered by hand").`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: { type: Type.BOOLEAN },
            reason: { type: Type.STRING },
          },
          required: ["isValid", "reason"],
        },
      },
    });

    const text = response.text;
    if (!text) return { isValid: false, reason: "No response from AI" };
    
    return JSON.parse(text) as ValidationResult;
  } catch (error) {
    console.error("Face validation error:", error);
    return { isValid: false, reason: "Could not validate image. Please try again." };
  }
};

// 2. Generate Hairstyle Options
export const generateHairstyleImage = async (
  base64Image: string, 
  gender: Gender,
  stylePrompt: string,
  hairColor: HairColor,
  variationIndex: number
): Promise<string | null> => {
  const ai = getAiClient();
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

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
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: {
        parts: [
          {
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
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64,
            },
          },
        ],
      },
      config: {
        imageConfig: {
          imageSize: "1K", // Locked to 1K for efficiency
          aspectRatio: "1:1",
        },
      },
    });

    // Extract image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData && part.inlineData.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image generation error:", error);
    return null; 
  }
};

// 3. Generate Technical Description (Multi-Select Support)
export const generateHairstyleDescription = async (
  selectedImages: GeneratedImage[],
  language: 'zh' | 'en' = 'zh'
): Promise<HairDescription[]> => {
  const ai = getAiClient();
  
  // Construct parts: Prompt first, then images
  const parts: any[] = [];
  
  const promptText = language === 'zh' 
    ? `你是一位世界顶级发型教育总监。我将上传 ${selectedImages.length} 张不同的发型设计图（按 Image 1, Image 2... 顺序）。
       
       **核心任务**：
       请仔细观察每一张图片，识别图片中的特定发型，并为每一张图分别撰写一份【专业发型分析卡】。
       
       **严正警告 (Strict Rules)**：
       1. **拒绝雷同**：每一张图片的分析必须**完全基于该图片的视觉特征**。如果 Image 1 是短发，Image 2 是长发，它们的描述必须完全不同。严禁复制粘贴。
       2. **标题规范**：Title 必须是该发型的具体专业名称（例如：“日系纹理烫”、“法式慵懒卷”、“美式渐变寸头”、“韩式气垫烫”）。**绝对不要**使用“图片1”、“发型方案”、“设计图”这种泛指词。标题要简短、优雅。
       3. **专业性**：内容需包含具体的修剪结构、色彩建议和打理手法，供专业发型师参考。

       **输出格式 (JSON)**：
       请按图片顺序返回一个 JSON 数组，包含 ${selectedImages.length} 个对象。
       每个对象包含 title 和 sections。
       
       sections 必须包含以下 4 个固定部分：
       1. 剪裁结构 (Cut Structure)
       2. 色彩方案 (Color Formula)
       3. 造型打理 (Styling)
       4. 适合人群 (Suitability)

       每个部分的 content 请用分点符号（•）开头，保持简练（30字以内），直击重点。`
    : `You are a World-Class Hair Education Director. I am uploading ${selectedImages.length} different hairstyle images (labeled Image 1, Image 2...).
       
       **Core Task**:
       Carefully observe EACH image, identify the specific hairstyle, and write a [Professional Hairstyle Analysis Card] for each one.
       
       **STRICT RULES**:
       1. **No Duplicates**: The analysis for each image must be **strictly based on the visual evidence** of that specific image. If Image 1 is a crop and Image 2 is a bob, the descriptions MUST be completely different. DO NOT copy-paste generic text.
       2. **Specific Titles**: The 'title' field MUST be the specific professional name of the style (e.g., "Textured French Crop", "Soft Layered Bob", "Platinum Pixie"). **DO NOT** use "Image 1" or "Hairstyle Plan".
       3. **Professionalism**: Include technical cut structure, color codes, and styling advice.

       **Output Format (JSON)**:
       Return a JSON array with ${selectedImages.length} items, corresponding to the images in order.
       Each item has 'title' and 'sections'.
       
       Sections must include:
       1. Cut Structure
       2. Color Formula
       3. Styling Guide
       4. Suitability

       Keep content concise (bullet points), technical, and actionable.`;

  parts.push({ text: promptText });
  parts.push({ text: `Return a JSON object with a "results" array containing ${selectedImages.length} items.` });

  // Add images to parts
  selectedImages.forEach((img, index) => {
    const cleanBase64 = img.url.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
    parts.push({ text: `Image ${index + 1}:` });
    parts.push({
      inlineData: { mimeType: "image/jpeg", data: cleanBase64 },
    });
  });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: parts,
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            results: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  sections: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        heading: { type: Type.STRING },
                        content: { type: Type.STRING }
                      },
                      required: ["heading", "content"]
                    }
                  },
                },
                required: ["title", "sections"],
              }
            }
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No text response");
    
    const json = JSON.parse(text);
    
    // Map back to images
    return json.results.map((res: any, idx: number) => ({
      ...res,
      imageId: selectedImages[idx]?.id || 'unknown'
    }));
  } catch (error) {
    console.error("Description generation error:", error);
    // Fallback: return generic results for each image
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
