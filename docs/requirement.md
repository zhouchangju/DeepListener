# Product Requirements Document (PRD): DeepListener

**Version:** 2.0 **Date:** 2026-01-24 **Target User:** 备考新版托福的高阶开发者（听力薄弱，急需短期突破） **Tech Stack:** Next.js (App Router), Prisma (Supabase), Tailwind CSS, OpenAI Whisper, WaveSurfer.js

## 1. 产品核心理念 (Core Philosophy)

“刻意练习”：归因与反馈

- **不再泛听**：拒绝无效的背景音磨耳朵，强制进行“原子级”的听力解码。
    
- **数据驱动**：把听不懂的原因量化（是词汇不行？还是连读没听出来？），用数据指导复习。
    
- **闭环训练**：听力输入 -> 难点捕捉 -> 归因分析 -> 间隔复习 (SRS)。
    

## 2. 核心功能模块 (Feature Modules)

### 模块 A: 波形精听台 (The Workbench)

**场景**：每日的精听训练主界面。

- **可视化交互**：
    
    - 使用 `wavesurfer.js` 渲染音频波形。
        
    - **Sentence Bubbles**：基于 Whisper 的时间轴，将波形自动切割成气泡。
        
    - **交互**：点击气泡单句循环；支持键盘快捷键（Space 播放/暂停, Enter 单句循环）。
        
- **三种模式切换**：
    
    1. **Blind Mode (盲听)**：隐藏文本，纯听。
        
    2. **Dictation Mode (听写)**：输入文本，Diff 算法自动标红错误。
        
    3. **Review Mode (明文)**：显示原文，单词随音频高亮（Karaoke Effect）。
        
- **Capture Action (难句捕获)**：
    
    - 在任意模式下，若某句话听不懂，按下快捷键 `S` (Save) 或点击“加入生句库”。
        
    - 系统自动弹出 **“归因标记弹窗”** (见模块 C)。
        

### 模块 B: 难句生词库 (The Sentence Vault & SRS)

**场景**：类似 Anki 的复习系统，专门针对“听不懂的句子”。

- **艾宾浩斯复习算法 (SRS)**：
    
    - 不使用复杂的 SM-2 算法，采用适合短期突击的 **“简易间隔法”**。
        
    - 复习阶段：`Level 0 (刚加入)` -> `4h` -> `12h` -> `1d` -> `3d` -> `7d` -> `Graduated (已掌握)`.
        
- **复习流程 (Review Flow)**：
    
    1. **听音 (Blind)**：只播放该句子的音频（无文本）。
        
    2. **回忆**：用户尝试在脑海中复述或理解。
        
    3. **揭晓 (Reveal)**：点击显示原文 + 中文翻译 + **你当初标记的听不懂原因**（如：这里有吞音）。
        
    4. **评分**：
        
        - _Again (没听出来)_ -> 重置 Level，10分钟后再来。
            
        - _Hard (听得吃力)_ -> 保持当前 Level。
            
        - _Good (秒懂)_ -> 晋升下一 Level。
            

### 模块 C: 归因诊断系统 (Diagnosis System)

**场景**：用户标记难句或查看 Dashboard 时。

- **归因标签 (Error Tags)**： 当用户将句子加入生词库时，**必须**选择一个或多个原因（这是数据可视化的基础）：
    
    - `Linking` (连读/吞音/弱读)：最常见的听力障碍。
        
    - `Vocab` (生词/短语)：纯粹是不认识这个词。
        
    - `Speed` (语速过快)：每个词都懂，凑一起反应不过来。
        
    - `Accent` (口音/语调)：对非标准发音不适应。
        
    - `Grammar` (长难句逻辑)：句子太长，听了后面忘前面。
        
- **智能辅助 (AI Suggestion - Phase 2)**：
    
    - 如果用户在听写模式下写错了，调用 LLM 分析错误类型并自动预选标签（例如：用户漏了 'ed'，AI 自动标记 `Linking/Grammar`）。
        

### 模块 D: 可视化仪表盘 (Data Dashboard)

**场景**：每周复盘，调整训练重心。

- **能力雷达图 (Proficiency Radar)**：展示你在 `Vocabulary`, `Linking Recognition`, `Speed Tolerance` 等维度的得分。
    
- **错误归因饼图 (The "Why" Pie Chart)**：
    
    - 展示你的听力瓶颈分布。
        
    - _Insight_: 如果 `Linking` 占比 60%，说明你不需要背单词，而需要大量的 **Echoing (跟读)** 训练。
        
- **记忆遗忘曲线**：展示未来 7 天需要复习的句子数量堆积图。
    

---

## 3. 数据库设计 (Schema Design)

使用 Prisma (Supabase) 定义核心数据结构。这对于实现 SRS 和归因分析至关重要。

代码段

```
// schema.prisma

model Track {
  id          String   @id @default(uuid())
  title       String
  audioUrl    String
  transcription Json   // 存储 Whisper 生成的带有 word-level timestamp 的 JSON
  createdAt   DateTime @default(now())
  
  sentences   Sentence[]
}

model Sentence {
  id          String   @id @default(uuid())
  trackId     String
  track       Track    @relation(fields: [trackId], references: [id])
  
  text        String
  startTime   Float    // 在音频中的开始时间
  endTime     Float    // 结束时间
  orderIndex  Int      // 句子在文章中的顺序

  // 关联到复习系统
  reviewItem  ReviewItem?
}

// 核心：复习条目表
model ReviewItem {
  id          String   @id @default(uuid())
  sentenceId  String   @unique
  sentence    Sentence @relation(fields: [sentenceId], references: [id])

  // SRS 状态
  level       Int      @default(0) // 当前复习等级 (0-5)
  nextReview  DateTime @default(now()) // 下次复习时间
  
  // 归因分析 (Tags)
  tags        ErrorTag[] // 多对多关系，一个句子可能有多个听不懂的原因
  
  userNote    String?  // 用户自定义笔记 (比如: "这里 of 弱读成了 a")
  createdAt   DateTime @default(now())
}

model ErrorTag {
  id          String       @id @default(uuid())
  name        String       @unique // "Linking", "Vocab", "Speed", "Grammar"
  reviewItems ReviewItem[]
}
```

---

## 4. 技术实现路径 (Implementation Guide)

### Step 1: 音频处理与入库 (API Route)

利用 Next.js API Route 处理文件上传，并调用 OpenAI Whisper。

- **Endpoint**: `POST /api/upload`
    
- **Logic**:
    
    1. 接收 MP3。
        
    2. 调用 `openai.audio.transcriptions.create({ ..., timestamp_granularities: ['word'] })`。
        
    3. 解析 JSON，将整个 Segment 存入 `Sentence` 表。
        
    4. 返回 Track ID。
        

### Step 2: 播放器与波形交互 (Frontend)

核心是同步。

- **Component**: `AudioPlayer.tsx`
    
- **State**: `currentSentenceIndex`
    
- **Sync Logic**:
    
    - `wavesurfer.on('audioprocess', (time) => ...)`: 监听当前播放时间。
        
    - 对比 `sentences` 数组的 `startTime` 和 `endTime`。
        
    - 如果当前时间超出了 `currentSentence.endTime` 且处于“单句循环模式”，则 `wavesurfer.seekTo(currentSentence.startTime)`。
        

### Step 3: 难句复习系统 (SRS Logic)

实现复习算法的 API。

- **Endpoint**: `POST /api/review/grade`
    
- **Body**: `{ reviewItemId, quality }` (quality: 'again' | 'hard' | 'good')
    
- **Logic (伪代码)**:
    
    TypeScript
    
    ```
    const intervals = [0, 4, 12, 24, 72, 168]; // 小时数
    
    if (quality === 'again') {
        newLevel = 0;
    } else if (quality === 'good') {
        newLevel = currentLevel + 1;
    }
    
    nextReviewDate = now + intervals[newLevel] * 60 * 60 * 1000;
    
    await prisma.reviewItem.update({
        where: { id: reviewItemId },
        data: { level: newLevel, nextReview: nextReviewDate }
    });
    ```
    

### Step 4: 归因图表 (Visualization)

- **Library**: 使用 `Recharts` (专为 React 设计，轻量好用) 或你熟悉的 `ECharts` (Next.js 中需要稍微封装一下，解决 SSR 问题)。
    
- **Data Fetching**:
    
    SQL
    
    ```
    -- 聚合查询示例
    SELECT t.name, COUNT(r.id) 
    FROM ErrorTag t 
    JOIN _ErrorTagToReviewItem link ON link.A = t.id 
    JOIN ReviewItem r ON link.B = r.id 
    GROUP BY t.name;
    ```
    

---

## 5. 开发优先级 (Roadmap for MVP)

鉴于你想“短期攻克”，建议按此顺序开发：

1. **Day 1 (Core)**: 完成音频上传 + Whisper 转录入库 + WaveSurfer 基础播放（能看波形，能点句子）。
    
2. **Day 2 (Capture)**: 实现“点击句子 -> 添加到生句库 -> 选择归因标签”的流程。
    
3. **Day 3 (Review)**: 做一个简单的 `/review` 页面，只列出 `nextReview < now` 的句子，实现“听音-看文-打分”闭环。
    
4. **Day 4 (Stats)**: 在首页加上那个**饼图**。相信我，看到“连读错误占 70%”会对你产生巨大的刺激，从而改变你的学习策略。
    

---

## 6. 特别设计：针对 "New TOEFL" 的适应性

- **C-Test Generator (Phase 2)**: 当你的 `Sentence Vault` 积累了足够多的句子后，你可以写一个脚本，把这些你听不懂的句子挖空（特别是你标记为 Vocab 的词），生成填空题给自己做。这是针对新版阅读 C-Test 的终极训练。
    

**Next Action:** 这个文档是否符合你的构想？如果没问题，你可以直接把 `Schema Design` 部分复制到你的 `schema.prisma` 文件里，然后 `npx prisma db push`，你的数据库后端就搭好了。