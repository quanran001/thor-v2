# ⚡ Thor V2 (SOP Alchemist)

> **The AI Agent that turns chaotic requirements into structured Standard Operating Procedures (SOPs).**
> 
> *把混乱的需求，炼金为标准化的 SOP 蓝图。*

![Thor V2](https://sop.wuyu.chat/thor_avatar.png)

## 🌟 Introduction (简介)
Thor (索尔) is an advanced AI agent designed to act as a **Professional Process Consultant**. Unlike generic chatbots, Thor follows a strict **Consultation → Diagnosis → Prescription** workflow to ensure high-quality output.

索尔不仅仅是一个聊天机器人，它是一位**严谨的流程咨询顾问**。它遵循“咨询-诊断-开方”的专业工作流，确保输出的 SOP 具备落地价值。

## 🚀 Key Features (核心功能)

### 1. 🛡️ Strict Consultation Protocol (严格咨询协议)
*   **Anti-Hallucination**: Thor never assumes user intent. If key information (Input Channel, File Format, Output) is missing, it asks clarifying questions.
*   **3-Stage Workflow**: Inquiry Phase -> Generation Phase -> Closing Phase.

### 2. 📊 Visualized SOP Blueprints (可视化蓝图)
*   Standardized SOP tables (Role, Core Action, Deliverable).
*   **Auto-generated Mermaid Flowcharts** (Logic Visualization).
*   Automatic error correction for Mermaid syntax.

### 3. 💾 Enterprise Integration (企业级集成)
*   **Feishu/Lark Auto-Archive**: Generated SOPs are automatically saved to your Feishu Bitable (多维表格) for knowledge management.
*   **JSON Structured Output**: Ready for n8n/Coze automation workflows.

### 4. 🧪 Automated Testing Framework (自动化测试)
*   Includes a `test_runner` script to simulate various user personas (Finance, HR, Angry Customer).
*   **Chaos Mode**: Tests Thor's resilience against typos, slang, and messy input.

## 🛠️ Tech Stack (技术栈)
*   **Framework**: Next.js 14 (App Router)
*   **AI Model**: DeepSeek V3 (via API)
*   **Styling**: Tailwind CSS
*   **Database**: Feishu Bitable (Lark Base)

## 📦 Quick Start (快速开始)

### Prerequisites
*   Node.js 18+
*   DeepSeek API Key
*   Feishu Open Platform App (for Archiving)

### Installation
```bash
git clone https://github.com/quanran001/thor-v2.git
cd thor-v2
npm install
```

### Configuration
Create a `.env.local` file:
```env
DEEPSEEK_API_KEY=sk-xxxx
FEISHU_APP_ID=cli_xxxx
FEISHU_APP_SECRET=xxxx
FEISHU_BITABLE_APP_TOKEN=xxxx
FEISHU_TABLE_ID_SOP_BLUEPRINTS=tblxxxx
```

### Run
```bash
npm run dev
```

---
*Created by [Wuyu Chat](https://wuyu.chat)*
