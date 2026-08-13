import type { Locale } from "@/features/i18n/config";

/**
 * Static UI strings. Real (human) translations — never AI-translated at runtime.
 * The `ko-KR` shape is the source of truth (Messages type); every other locale
 * implements it, so a missing key is a compile error, not a runtime gap.
 *
 * NOTE: this dictionary covers a shared UI subset (common actions, nav, language
 * settings). App-wide string extraction is incremental — components adopt useI18n
 * as they are localized; unconverted screens keep their existing (Korean) text.
 */
const ko = {
  common: {
    save: "저장",
    cancel: "취소",
    loading: "불러오는 중...",
    retry: "다시 시도",
    delete: "삭제",
    send: "전송",
    error: "문제가 발생했어요. 잠시 후 다시 시도해주세요.",
  },
  groups: {
    learning: "학습",
    content: "콘텐츠",
    plan: "계획",
    social: "소셜",
    support: "지원",
  },
  nav: {
    dashboard: "대시보드",
    tutor: "AI 과외",
    problems: "문제",
    studyBank: "문제은행",
    review: "오답노트",
    mockExam: "모의고사",
    studyBooks: "나만의 교재",
    subjects: "과목",
    lab: "실험실",
    todos: "Todo",
    stats: "통계",
    friends: "친구",
    ranking: "랭킹",
    battle: "배틀",
    support: "문의하기",
    settings: "설정",
    home: "홈",
  },
  account: {
    profile: "내 프로필",
    upgrade: "업그레이드하기",
  },
  language: {
    title: "언어",
    subtitle: "화면에 표시되는 언어를 선택하세요.",
    auto: "자동",
    autoHint: "브라우저·지역을 기준으로 자동 선택",
    saved: "언어 설정을 저장했어요.",
  },
  dashboard: {
    greeting: "안녕하세요, {name}님",
    priorityEyebrow: "오늘의 우선순위",
    todayEyebrow: "오늘의 학습",
    reviewWaitingTitle: "복습 대기 {count}개",
    reviewWaitingDesc: "기억이 사라지기 전에 지금 복습하면 가장 효율적이에요.",
    reviewCta: "지금 복습하기",
    newProblemsTitle: "새 문제로 감을 이어가요",
    newProblemsDesc: "추천 문제를 풀며 오늘의 연속 기록을 이어가세요.",
    newProblemsCta: "문제 풀러 가기",
    streakLabel: "연속 공부일",
    streakUnit: "일",
    progressLabel: "오늘 진행률",
    sectionTodayLearning: "오늘의 학습",
    sectionTodayPlan: "오늘의 계획",
    sectionAnalysis: "분석 & 리포트",
  },
} as const;

export type Messages = {
  [K in keyof typeof ko]: { [P in keyof (typeof ko)[K]]: string };
};

const en: Messages = {
  common: {
    save: "Save",
    cancel: "Cancel",
    loading: "Loading...",
    retry: "Try again",
    delete: "Delete",
    send: "Send",
    error: "Something went wrong. Please try again shortly.",
  },
  groups: {
    learning: "Learning",
    content: "Content",
    plan: "Plan",
    social: "Social",
    support: "Support",
  },
  nav: {
    dashboard: "Dashboard",
    tutor: "AI Tutor",
    problems: "Problems",
    studyBank: "Problem Bank",
    review: "Review",
    mockExam: "Mock Exam",
    studyBooks: "Study Books",
    subjects: "Subjects",
    lab: "Lab",
    todos: "Todos",
    stats: "Stats",
    friends: "Friends",
    ranking: "Ranking",
    battle: "Battle",
    support: "Support",
    settings: "Settings",
    home: "Home",
  },
  account: {
    profile: "My Profile",
    upgrade: "Upgrade",
  },
  language: {
    title: "Language",
    subtitle: "Choose the language shown across the app.",
    auto: "Automatic",
    autoHint: "Detected from your browser and region",
    saved: "Language preference saved.",
  },
  dashboard: {
    greeting: "Hello, {name}",
    priorityEyebrow: "Today's priority",
    todayEyebrow: "Today's study",
    reviewWaitingTitle: "{count} reviews waiting",
    reviewWaitingDesc: "Reviewing now, before you forget, is the most effective.",
    reviewCta: "Review now",
    newProblemsTitle: "Keep your momentum with new problems",
    newProblemsDesc: "Solve recommended problems to keep today's streak going.",
    newProblemsCta: "Go solve problems",
    streakLabel: "Day streak",
    streakUnit: "d",
    progressLabel: "Today's progress",
    sectionTodayLearning: "Today's study",
    sectionTodayPlan: "Today's plan",
    sectionAnalysis: "Analysis & reports",
  },
};

const ja: Messages = {
  common: {
    save: "保存",
    cancel: "キャンセル",
    loading: "読み込み中...",
    retry: "再試行",
    delete: "削除",
    send: "送信",
    error: "問題が発生しました。しばらくしてからもう一度お試しください。",
  },
  groups: {
    learning: "学習",
    content: "コンテンツ",
    plan: "計画",
    social: "ソーシャル",
    support: "サポート",
  },
  nav: {
    dashboard: "ダッシュボード",
    tutor: "AI家庭教師",
    problems: "問題",
    studyBank: "問題バンク",
    review: "復習ノート",
    mockExam: "模擬試験",
    studyBooks: "自分の教材",
    subjects: "科目",
    lab: "ラボ",
    todos: "ToDo",
    stats: "統計",
    friends: "友だち",
    ranking: "ランキング",
    battle: "バトル",
    support: "お問い合わせ",
    settings: "設定",
    home: "ホーム",
  },
  account: {
    profile: "プロフィール",
    upgrade: "アップグレード",
  },
  language: {
    title: "言語",
    subtitle: "アプリに表示する言語を選択してください。",
    auto: "自動",
    autoHint: "ブラウザと地域から自動判定",
    saved: "言語設定を保存しました。",
  },
  dashboard: {
    greeting: "こんにちは、{name}さん",
    priorityEyebrow: "今日の優先事項",
    todayEyebrow: "今日の学習",
    reviewWaitingTitle: "復習待ち {count} 件",
    reviewWaitingDesc: "忘れる前に今すぐ復習するのが最も効果的です。",
    reviewCta: "今すぐ復習",
    newProblemsTitle: "新しい問題で調子を継続",
    newProblemsDesc: "おすすめの問題を解いて今日の連続記録を伸ばしましょう。",
    newProblemsCta: "問題を解きに行く",
    streakLabel: "連続学習日",
    streakUnit: "日",
    progressLabel: "今日の進捗",
    sectionTodayLearning: "今日の学習",
    sectionTodayPlan: "今日の計画",
    sectionAnalysis: "分析とレポート",
  },
};

const zh: Messages = {
  common: {
    save: "保存",
    cancel: "取消",
    loading: "加载中...",
    retry: "重试",
    delete: "删除",
    send: "发送",
    error: "出现问题，请稍后再试。",
  },
  groups: {
    learning: "学习",
    content: "内容",
    plan: "计划",
    social: "社交",
    support: "支持",
  },
  nav: {
    dashboard: "仪表板",
    tutor: "AI 家教",
    problems: "题目",
    studyBank: "题库",
    review: "错题本",
    mockExam: "模拟考试",
    studyBooks: "我的教材",
    subjects: "科目",
    lab: "实验室",
    todos: "待办",
    stats: "统计",
    friends: "好友",
    ranking: "排行榜",
    battle: "对战",
    support: "帮助",
    settings: "设置",
    home: "主页",
  },
  account: {
    profile: "我的资料",
    upgrade: "升级",
  },
  language: {
    title: "语言",
    subtitle: "选择应用中显示的语言。",
    auto: "自动",
    autoHint: "根据浏览器和地区自动判断",
    saved: "已保存语言设置。",
  },
  dashboard: {
    greeting: "你好，{name}",
    priorityEyebrow: "今日重点",
    todayEyebrow: "今日学习",
    reviewWaitingTitle: "待复习 {count} 个",
    reviewWaitingDesc: "在遗忘之前立即复习最为有效。",
    reviewCta: "立即复习",
    newProblemsTitle: "用新题目保持状态",
    newProblemsDesc: "做推荐题目，延续今天的连续记录。",
    newProblemsCta: "去做题",
    streakLabel: "连续学习天数",
    streakUnit: "天",
    progressLabel: "今日进度",
    sectionTodayLearning: "今日学习",
    sectionTodayPlan: "今日计划",
    sectionAnalysis: "分析与报告",
  },
};

const MESSAGES: Record<Locale, Messages> = {
  "ko-KR": ko,
  "en-US": en,
  "ja-JP": ja,
  "zh-CN": zh,
};

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale];
}
