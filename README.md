<div align="center">
  <h1 align="center">StyleSnap AI</h1>
  <h3>AI 私人发型顾问 V2 (AI Personal Hairstyle Consultant)</h3>
  <p>Product by 答案42</p>
</div>

<div align="center">
  <a href="#中文说明">中文说明</a> | <a href="#english-readme">English README</a>
</div>

---

<h2 id="中文说明">🇨🇳 中文说明</h2>

**StyleSnap** 是一款先进的 AI 发型咨询应用。上传自拍或直接拍照，AI 将为您验证人脸、生成超写实的发型预览图，并提供专业的发型分析卡。

**V2 版本更新**: 采用全新的毛玻璃拟态 (Glassmorphism) UI 设计，引入混合 AI 架构以降低成本，并全面提升了视觉美感。

### ✨ 核心功能

- **📸 双重输入**: 支持文件上传和摄像头实时拍摄。
- **🤖 混合 AI 引擎**:
  - **视觉 & 分析**: `google/gemini-2.5-flash` (极速、低成本)。
  - **图像生成**: `google/gemini-3-pro` (高保真、1K 分辨率)。
- **🎨 高度定制**:
  - 性别选择 (男/女)
  - 9+ 种发型风格分类
  - 8+ 种发色选择 (自然色 & 潮色)
- **💎 V2 UI 设计**: 
  - 中央磨砂玻璃卡片布局 (Central Glass Hero Card)。
  - 电影级噪点纹理与流光金效。
  - 全端自适应光学居中。
- **📋 专业输出**:
  - 每次请求生成 6 张不同变体。
  - 详细的分析卡片 (剪裁结构、色彩配方、打理建议、适合人群)。
  - 中英文双语界面支持。

### 🛠️ 技术栈

- **框架**: React 19 + TypeScript
- **构建工具**: Vite
- **样式**: Tailwind CSS + 自定义动画
- **AI 服务**: OpenRouter API
- **图标库**: Lucide React

### 🚀 快速开始

#### 前置要求
- 已安装 Node.js
- 拥有 OpenRouter API Key (且有余额)

#### 安装步骤

1. **克隆项目** 并安装依赖:
   ```bash
   npm install
   ```

2. **配置 API Key**:
   复制模版文件并填入您的 Key。
   ```bash
   cp .env.example .env.local
   ```
   编辑 `.env.local` 文件:
   ```env
   OPENROUTER_API_KEY=sk-or-v1-xxxxxxxx...
   ```

3. **运行开发服务器**:
   ```bash
   npm run dev
   ```

4. **体验应用**:
   在浏览器打开 [http://localhost:3000](http://localhost:3000)

### 💰 成本说明

本项目采用 **混合架构** 以优化成本：
- **文本/视觉任务**: 约 $0.01 / 会话 (使用 Flash 模型)。
- **图像生成**: 约 $0.80 / 会话 (使用 Gemini 3 Pro 生成 6 张)。
  - *提示: 如需降低成本，可修改 `openrouterService.ts` 减少生成数量。*

---

<h2 id="english-readme">🇺🇸 English README</h2>

**StyleSnap** is an advanced AI-powered application that provides personalized hairstyle consultations. Upload a selfie or take a photo, and verify your face, generate photorealistic hairstyle previews, and receive professional analysis cards.

**V2 Update**: Featuring a brand new Glassmorphism UI, hybrid AI architecture for cost efficiency, and enhanced visual aesthetics.

### ✨ Key Features

- **📸 Dual Input**: Seamless support for File Upload and Camera Capture.
- **🤖 Hybrid AI Engine**:
  - **Vision & Analysis**: `google/gemini-2.5-flash` (Fast, Cost-Effective).
  - **Image Generation**: `google/gemini-3-pro` (High Fidelity, 1K Resolution).
- **🎨 Customization**:
  - Gender (Male/Female)
  - 9+ Hairstyle Categories
  - 8+ Hair Colors (Natural & Fashion)
- **💎 V2 UI Design**: 
  - Central Glass Hero Card layout.
  - Cinematic "Noise" texture and Golden Glow aesthetics.
  - Optical centering for all devices.
- **📋 Professional Output**:
  - Generates 6 variations per request.
  - Detailed Analysis Card (Cut, Color, Styling, Suitability).
  - Bilingual Support (English/Chinese).

### 🛠️ Technology Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Custom Animations
- **AI Provider**: OpenRouter API
- **Icons**: Lucide React

### 🚀 Quick Start

#### Prerequisites
- Node.js installed
- An OpenRouter API Key (with credits)

#### Installation

1. **Clone the repository** & install dependencies:
   ```bash
   npm install
   ```

2. **Configure API Key**:
   Copy the example file and add your key.
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` and paste your key:
   ```env
   OPENROUTER_API_KEY=sk-or-v1-xxxxxxxx...
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

4. **Experience It**:
   Open [http://localhost:3000](http://localhost:3000) in your browser.

### 💰 Cost Note

This project uses a **Hybrid Architecture** to optimize costs:
- **Text/Vision Tasks**: ~$0.01 per session (using Flash model).
- **Image Generation**: ~$0.80 per session (6 images via Gemini 3 Pro). 
  - *Note: You can modify `openrouterService.ts` to reduce `numberOfVariations` if needed.*

---

## 📄 License
Designed for perfection.
Product by 答案42.
