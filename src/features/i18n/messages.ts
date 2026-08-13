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
