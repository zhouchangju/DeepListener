# 逐句复述训练器 - 产品设计文档

## 功能概述

针对2026年托福新题型"句子复述"（7-8题）设计的专项训练功能。

**核心价值**：
- 无准备时间即兴复述（8-12秒）
- 短时记忆训练
- 发音、语调、准确性评分
- 与原音频对比分析

---

## 用户交互流程

### 场景1：单句复述训练

```
┌─────────────────────────────────────────┐
│  DeepListener - 句子复述训练            │
├─────────────────────────────────────────┤
│                                         │
│  【步骤 1：准备】                        │
│  ┌─────────────────────────────────┐   │
│  │ 📚 当前句子：2/45                 │   │
│  │ 难度：⭐⭐☆☆☆ (中等)             │   │
│  │                                 │   │
│  │ 播放原句 ▶️                       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  【点击播放后】                           │
│  ┌─────────────────────────────────┐   │
│  │ 🔊 正在播放...                     │   │
│  │ "The professor's research on     │   │
│  │  renewable energy has received    │   │
│  │  significant funding."            │   │
│  │                                 │   │
│  │ ⏱️ 2.3秒 / 2.3秒                  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  【播放结束，立即切换】                    │
│  ┌─────────────────────────────────┐   │
│  │ 🎙️ 请复述（12秒倒计时）           │   │
│  │                                 │   │
│  │    ⏰ 08秒 ← [●●●●●●●●○○]         │   │
│  │                                 │   │
│  │     [🎙️ 按住说话]                │   │
│  └─────────────────────────────────┘   │
│                                         │
│  【录音结束或倒计时结束】                  │
│  ┌─────────────────────────────────┐   │
│  │ ✅ 复述完成！                     │   │
│  │                                 │   │
│  │ 正在分析...                      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  【评分结果】                            │
│  ┌─────────────────────────────────┐   │
│  │ 📊 综合评分：72/100                │   │
│  │                                 │   │
│  │ ✅ 内容完整性：85%               │   │
│  │ ⚠️  发音准确性：68%               │   │
│  │ ⚠️  语调节奏：70%                 │   │
│  │ ✅  流利度：75%                   │   │
│  │                                 │   │
│  │ [查看详情] [再试一次] [下一句]      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  【查看详情】                            │
│  ┌─────────────────────────────────┐   │
│  │ 🔍 详细分析                       │   │
│  │                                 │   │
│  │ 📍 发音问题：                    │   │
│  │ • "renewable" 重音在第一个音节   │   │
│  │ • "significant" 的 /g/ 太轻      │   │
│  │                                 │   │
│  │ 📍 语调问题：                    │   │
│  │ • 句末需要降调，你用了升调       │   │
│  │                                 │   │
│  │ 📍 对比波形：                    │
│  │ [原句波形] [你的波形]             │   │
│  │                                 │   │
│  │ [返回] [再来一次]                │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

### 场景2：连续训练模式（模拟真实考试）

```
┌─────────────────────────────────────────┐
│  连续复述训练 - 模拟考试模式              │
├─────────────────────────────────────────┤
│                                         │
│  ⏱️ 总时长：约5分钟（8题 × 平均35秒）    │
│                                         │
│  【第 1 题 / 共 8 题】                   │
│  ┌─────────────────────────────────┐   │
│  │ 准备 → 播放 → 复述 → 评分         │   │
│  │    ↑      ↑      ↑      ↑        │   │
│  │   0秒    一次   12秒   即时       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  当前进度：                              │
│  ●●●●○○○○                              │
│                                         │
│  【完成后】                              │
│  ┌─────────────────────────────────┐   │
│  │ 🎯 训练报告                       │   │
│  │                                 │   │
│  │ 总分：68/100                      │   │
│  │                                 │   │
│  │ 第1题：85/100 ✓                  │   │
│  │ 第2题：72/100 ✓                  │   │
│  │ 第3题：45/100 ✗ (停顿3次)        │   │
│  │ 第4题：78/100 ✓                  │   │
│  │ ...                             │   │
│  │                                 │   │
│  │ 💡 建议：加强复杂句的记忆力训练  │   │
│  │                                 │   │
│  │ [查看错题] [重新训练] [返回]     │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 技术实现方案

### 1. 数据库设计

**新增表：RetellingSession**

```sql
CREATE TABLE RetellingSession (
  id TEXT PRIMARY KEY,
  userId TEXT,
  sentenceId TEXT,

  -- 录音数据
  audioBlobPath TEXT,  -- 存储用户录音文件路径

  -- AI评分结果
  scoreContent INTEGER,    -- 内容完整性 0-100
  scorePronunciation INTEGER,  -- 发音准确性 0-100
  scoreIntonation INTEGER,  -- 语调节奏 0-100
  scoreFluency INTEGER,    -- 流利度 0-100
  scoreOverall INTEGER,    -- 综合分数

  -- 详细分析JSON
  analysisJson TEXT,  -- 存储发音、语调等详细问题

  -- 时间统计
  duration REAL,  -- 用户实际用时（秒）
  pauseCount INTEGER,  -- 停顿次数

  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (sentenceId) REFERENCES Sentence(id)
);
```

### 2. API端点设计

#### 2.1 创建复述会话

```
POST /api/retelling/start
Request:
{
  "sentenceId": "uuid-123",
  "mode": "single" | "continuous"
}

Response:
{
  "sessionId": "session-uuid",
  "sentence": {
    "text": "The professor's research...",
    "audioUrl": "/uploads/audio1.mp3",
    "duration": 2.3
  }
}
```

#### 2.2 提交录音并评分

```
POST /api/retelling/submit
Request:
{
  "sessionId": "session-uuid",
  "audioBlob": "<base64 audio data>",
  "duration": 8.5
}

Response:
{
  "score": {
    "overall": 72,
    "content": 85,
    "pronunciation": 68,
    "intonation": 70,
    "fluency": 75
  },
  "analysis": {
    "pronunciationIssues": [
      {
        "word": "renewable",
        "issue": "重音应该在第一个音节",
        "timestamp": 1.2
      }
    ],
    "intonationIssues": [
      {
        "type": "sentence_final",
        "issue": "句末需要降调",
        "suggestion": "尝试让尾音下降"
      }
    ],
    "pauses": [
      {"at": 3.2, "duration": 0.5},
      {"at": 5.8, "duration": 0.3}
    ]
  }
}
```

#### 2.3 获取历史记录

```
GET /api/retelling/history?sentenceId=xxx

Response:
{
  "sessions": [
    {
      "id": "session-1",
      "date": "2025-02-02T10:30:00Z",
      "score": 72,
      "duration": 8.5
    },
    {
      "id": "session-2",
      "date": "2025-02-01T15:20:00Z",
      "score": 68,
      "duration": 9.2
    }
  ]
}
```

### 3. AI评分算法

#### 3.1 简化版本（第一阶段）

**使用现有工具，无需AI模型**：

```typescript
// 1. 内容完整性：关键词检测
function scoreContent(original: string, retelling: string): number {
  const keywords = extractKeywords(original); // 提取实词
  const mentioned = keywords.filter(k => retelling.toLowerCase().includes(k.toLowerCase()));
  return (mentioned.length / keywords.length) * 100;
}

// 2. 流利度：停顿次数和语速
function scoreFluency(audioBuffer: AudioBuffer): {
  const pauseCount = detectPauses(audioBuffer); // 检测静音段
  const speechRate = audioBuffer.sampleRate / audioBuffer.duration;

  let score = 100;
  score -= pauseCount * 5;  // 每次停顿扣5分
  if (speechRate < 3 || speechRate > 6) score -= 10;  // 语速异常

  return Math.max(0, score);
}

// 3. 时长准确性
function scoreDuration(expected: number, actual: number): number {
  const ratio = actual / expected;
  if (ratio > 1.5) return 50;  // 太慢
  if (ratio < 0.5) return 60;  // 太快
  return 100;
}
```

#### 3.2 高级版本（第二阶段）

**集成AI语音识别API**：

```typescript
// 使用 OpenAI Whisper 或 Google Speech-to-Text
async function transcribe(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('audio', audioBlob);

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: formData,
  });

  const data = await response.json();
  return data.text;
}

// 对比原句和转录文本
function compareText(original: string, transcribed: string) {
  // 1. 词级别对比
  const originalWords = original.toLowerCase().split(/\s+/);
  const transcribedWords = transcribed.toLowerCase().split(/\s+/);

  // Levenshtein距离计算相似度
  const similarity = calculateSimilarity(originalWords, transcribedWords);

  return {
    scoreOverall: similarity * 100,
    missingWords: originalWords.filter(w => !transcribedWords.includes(w)),
    extraWords: transcribedWords.filter(w => !originalWords.includes(w)),
  };
}
```

---

## UI组件设计

### 组件1：RetellingPracticeClient

```typescript
interface RetellingPracticeClientProps {
  sentenceId: string;
  sentence: {
    text: string;
    audioUrl: string;
    startTime: number;
    endTime: number;
    duration: number;
  };
  mode?: 'single' | 'continuous';
  onComplete?: (score: RetellingScore) => void;
}

export default function RetellingPracticeClient({
  sentence,
  mode,
  onComplete
}: RetellingPracticeClientProps) {
  const [step, setStep] = useState<'prepare' | 'playing' | 'recording' | 'analyzing' | 'result'>('prepare');
  const [timeLeft, setTimeLeft] = useState(12);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [score, setScore] = useState<RetellingScore | null>(null);

  // 播放原句
  const playOriginal = async () => {
    setStep('playing');
    const audio = new Audio(sentence.audioUrl);
    audio.currentTime = sentence.startTime;

    audio.onended = () => {
      setStep('recording');
      startRecording();
    };

    audio.play();
  };

  // 开始录音
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);

      recorder.start();
      setTimeLeft(12);

      // 倒计时
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  };

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();

      mediaRecorder.ondataavailable = async (e) => {
        const audioBlob = e.data;
        setStep('analyzing');

        // 提交评分
        const result = await submitForScoring(audioBlob);
        setScore(result);
        setStep('result');
        onComplete?.(result);
      };
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      {step === 'prepare' && (
        <PrepareView onPlay={playOriginal} />
      )}

      {step === 'playing' && (
        <PlayingView duration={sentence.duration} />
      )}

      {step === 'recording' && (
        <RecordingView timeLeft={timeLeft} onStop={stopRecording} />
      )}

      {step === 'analyzing' && (
        <AnalyzingView />
      )}

      {step === 'result' && score && (
        <ResultView score={score} onRetry={playOriginal} />
      )}
    </div>
  );
}
```

### 组件2：RecordingView

```typescript
function RecordingView({ timeLeft, onStop }: { timeLeft: number; onStop: () => void }) {
  return (
    <div className="text-center py-12">
      <div className="mb-6">
        <div className="text-6xl font-bold text-indigo-600">{timeLeft}</div>
        <div className="text-gray-500">秒</div>
      </div>

      <div className="mb-8">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all duration-1000"
            style={{ width: `${(timeLeft / 12) * 100}%` }}
          />
        </div>
      </div>

      <Button
        size="lg"
        className="bg-red-600 hover:bg-red-700"
        onMouseUp={onStop}
        onMouseLeave={onStop}
      >
        <Mic className="w-5 h-5 mr-2" />
        按住说话
      </Button>
    </div>
  );
}
```

### 组件3：ResultView

```typescript
function ResultView({ score, onRetry }: { score: RetellingScore; onRetry: () => void }) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div className="space-y-6">
      {/* 综合分数 */}
      <div className="text-center">
        <div className="text-5xl font-bold text-indigo-600 mb-2">
          {score.overall}
        </div>
        <div className="text-gray-500">综合评分</div>
      </div>

      {/* 分项评分 */}
      <div className="grid grid-cols-2 gap-4">
        <ScoreCard label="内容完整性" score={score.content} />
        <ScoreCard label="发音准确性" score={score.pronunciation} />
        <ScoreCard label="语调节奏" score={score.intonation} />
        <ScoreCard label="流利度" score={score.fluency} />
      </div>

      {/* 详细分析 */}
      {showDetail ? (
        <DetailView analysis={score.analysis} onClose={() => setShowDetail(false)} />
      ) : (
        <div className="flex gap-3">
          <Button onClick={() => setShowDetail(true)} variant="outline">
            查看详情
          </Button>
          <Button onClick={onRetry}>
            再试一次
          </Button>
        </div>
      )}
    </div>
  );
}
```

---

## 页面集成

### 在AudioPlayer中添加"复述模式"

```typescript
// src/components/feature/AudioPlayer.tsx

<Button
  variant="ghost"
  size="sm"
  onClick={() => {
    setCurrentMode('retelling');
  }}
>
  <Mic className="w-4 h-4 mr-2" />
  复述练习
</Button>

{currentMode === 'retelling' && (
  <RetellingPracticeClient
    sentence={currentSentence}
    mode="single"
    onComplete={(score) => {
      // 记录分数到数据库
      // 更新UI显示
    }}
  />
)}
```

### 独立训练页面

```typescript
// src/app/retelling/practice/page.tsx

export default function RetellingPracticePage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">句子复述训练</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：句子选择 */}
        <div className="lg:col-span-1">
          <SentenceSelector
            type="byDifficulty"
            onSelect={setSentence}
          />
        </div>

        {/* 右侧：复述练习 */}
        <div className="lg:col-span-2">
          <RetellingPracticeClient
            sentence={selectedSentence}
            mode="single"
          />
        </div>
      </div>
    </div>
  );
}
```

---

## MVP实施计划

### Phase 1：基础功能（1-2周）

**目标**：可用的单句复述训练

- [ ] 创建复述练习组件UI
- [ ] 实现音频播放+录音流程
- [ ] 简单评分（时长、关键词匹配）
- [ ] 结果展示界面

### Phase 2：AI评分（1周）

**目标**：接入语音识别API

- [ ] 集成Whisper API
- [ ] 实现文本对比评分
- [ ] 添加详细分析反馈

### Phase 3：高级功能（1-2周）

**目标**：完整的学习体验

- [ ] 连续训练模式
- [ ] 历史记录和进度追踪
- [ ] 难度递进系统
- [ ] 数据统计和可视化

---

## 成功指标

**用户层面**：
- 每日使用时长：15分钟+
- 完成率：>70%
- 复述准确率提升：20%+/月

**技术层面**：
- 录音成功率：>95%
- API响应时间：<3秒
- 用户满意度：>4.0/5.0

---

## 技术风险

### 风险1：浏览器麦克风权限

**缓解方案**：
- 首次访问时显示权限引导
- 提供清晰的权限说明
- 降级方案：允许用户上传录音文件

### 风险2：AI评分成本

**缓解方案**：
- 第一阶段用简单算法
- 第二阶段才调用API
- 设置每日使用限额（如10次免费）

### 风险3：音频质量差异

**缓解方案**：
- 提供麦克风测试工具
- 给出录音质量建议
- 允许用户标记"录音有问题"

---

## 未来扩展

1. **对标训练**：托福历年真题句子复述
2. **AI对话伙伴**：复述后进行延伸提问
3. **发音教练**：针对特定音素的训练
4. **多语言支持**：扩展到其他语言学习

---

## 参考资料

- [2026年托福口语改革详解](https://cz.xhd.cn/toefl/kouyu/964148.html)
- [Whisper API文档](https://platform.openai.com/docs/guides/speech-to-text)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
