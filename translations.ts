
export type Language = 'zh' | 'en';

export const translations = {
  zh: {
    appTitle: "发型卡 StyleSnap",
    heroTitle: "找到你的完美发型",
    heroSubtitle: "上传自拍，AI 专属定制",
    uploadTitle: "添加照片",
    uploadSubtitle: "支持 JPG/PNG",
    btnUpload: "上传图片",
    btnCamera: "拍照",
    takePhoto: "拍摄",
    capture: "拍照",
    cancel: "取消",
    retake: "重拍",
    changePhoto: "重选",
    genderLabel: "1. 性别",
    styleLabel: "2. 风格 (选2项)",
    colorLabel: "3. 发色",
    generateBtn: "生成发型",
    generatingTitle: "设计中...",
    generatingSubtitle: "AI 正在生成 6 种方案",
    selectTitle: "选择方案",
    selectSubtitle: "点击图片查看详情",
    regenerateBtn: "重试",
    nextBtn: "下一步",
    confirmBtn: "确认方案", // Shortened from "Get Stylist Notes"
    analyzingTitle: "生成发型卡...",
    analyzingSubtitle: "正在生成技术参数",
    resultStyle: "风格",
    printBtn: "打印",
    downloadCardBtn: "保存发型卡",
    startOverBtn: "返回首页",
    backBtn: "返回",
    errorTooLarge: "图片太大 (需<5MB)",
    errorInvalid: "无效图片",
    errorValidation: "无法识别",
    errorPermission: "API Key 权限错误",
    errorGeneric: "失败，请重试",
    errorMinStyles: "请至少选 2 种风格",
    validating: "检测中...",
    genderMale: "男士",
    genderFemale: "女士",
    styleOptions: {
      male: {
        short_clean: "清爽短发 (寸头/美式)",
        short_textured: "纹理短发 (飞机头/侧分)",
        medium: "中长发 (背头/分头)",
        long: "男士长发 (扎发/艺术感)"
      },
      female: {
        pixie: "精灵短发 (超短)",
        bob: "波波头 (Bob/Lob)",
        medium_layer: "锁骨发/中长碎发",
        long_straight: "长直发",
        long_curly: "长卷发/大波浪"
      }
    },
    colorOptions: {
      original: "保持原色",
      black: "自然黑",
      dark_brown: "深棕色",
      light_brown: "浅棕/栗色",
      blonde: "金发/亚麻",
      red: "酒红/赤褐",
      silver: "奶奶灰/银色",
      fashion: "潮色 (粉/蓝/紫)"
    },
    steps: {
      upload: "上传",
      generating: "生成",
      selection: "选择",
      describing: "分析",
      result: "完成"
    },
    whyPaidKey: "需要 API Key",
    whyPaidKeyDesc: "使用 Gemini Pro 模型需要连接您的 Google Cloud 项目。",
    connectKey: "连接 Key",
    readDocs: "阅读文档"
  },
  en: {
    appTitle: "StyleSnap",
    heroTitle: "Your Perfect Look",
    heroSubtitle: "AI-powered hairstyle makeovers",
    uploadTitle: "Add Photo",
    uploadSubtitle: "JPG/PNG supported",
    btnUpload: "Upload",
    btnCamera: "Camera",
    takePhoto: "Snap",
    capture: "Capture",
    cancel: "Cancel",
    retake: "Retake",
    changePhoto: "Change",
    genderLabel: "1. Gender",
    styleLabel: "2. Style (Pick 2)",
    colorLabel: "3. Color",
    generateBtn: "Generate",
    generatingTitle: "Designing...",
    generatingSubtitle: "Creating 6 variations",
    selectTitle: "Select Look",
    selectSubtitle: "Tap to view details",
    regenerateBtn: "Retry",
    nextBtn: "Next",
    confirmBtn: "Confirm", // Shortened
    analyzingTitle: "Analyzing...",
    analyzingSubtitle: "Writing technical notes",
    resultStyle: "Style",
    printBtn: "Print",
    downloadCardBtn: "Save Card",
    startOverBtn: "Start Over",
    backBtn: "Back",
    errorTooLarge: "File too large (<5MB)",
    errorInvalid: "Invalid image",
    errorValidation: "Check failed",
    errorPermission: "Permission denied",
    errorGeneric: "Failed, try again",
    errorMinStyles: "Pick at least 2 styles",
    validating: "Scanning...",
    genderMale: "Male",
    genderFemale: "Female",
    styleOptions: {
      male: {
        short_clean: "Short & Clean",
        short_textured: "Textured",
        medium: "Medium Length",
        long: "Long Hair"
      },
      female: {
        pixie: "Pixie / Short",
        bob: "Bob / Lob",
        medium_layer: "Medium Layered",
        long_straight: "Long Straight",
        long_curly: "Wavy / Curly"
      }
    },
    colorOptions: {
      original: "Original",
      black: "Black",
      dark_brown: "Dark Brown",
      light_brown: "Light Brown",
      blonde: "Blonde",
      red: "Red",
      silver: "Silver",
      fashion: "Fashion"
    },
    steps: {
      upload: "Upload",
      generating: "Working",
      selection: "Select",
      describing: "Analysis",
      result: "Done"
    },
    whyPaidKey: "API Key Needed",
    whyPaidKeyDesc: "Pro models require a Google Cloud Project connection.",
    connectKey: "Connect Key",
    readDocs: "Read Docs"
  }
};