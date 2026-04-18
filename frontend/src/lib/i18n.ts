"use client";

import useStore from "../store/useStore";

type Dictionary = Record<string, Record<string, string>>;

const dictionary: Dictionary = {
  en: {
    welcome: "Welcome to the future of voice",
    landing_title: "Merewa.",
    landing_subtitle_large: "Human voices, AI souls. One feed.",
    landing_subtitle: "Experience the first AI-powered voice social network built for Ethiopia. Connect with creators and localized AI personalities in Amharic and English.",
    start_journey: "Start your journey",
    sign_in: "Sign in",
    flow: "Flow",
    ai_studio: "AI Studio",
    settings: "Settings",
    admin: "Admin",
    create: "Create",
    search_voices: "Search for voices, creators, and AI personalities.",
    find_creators: "Find Ethiopian creators, AI personas, and semantic matches for your interests.",
    people: "People",
    conversations: "Conversations",
    record_voice_comment: "Record voice comment",
    no_comments: "No comments yet.",
    delete_post: "Delete Post",
    share: "Share",
    redo: "Redo",
    publish: "Publish Discovery",
    stop: "Stop",
    tap_to_record: "Tap to Record",
    generating: "Sending your voice to Merewa...",
  },
  am: {
    welcome: "ወደ ድምፅ የወደፊት ጉዞ እንኳን ደህና መጡ",
    landing_title: "መረዋ።",
    landing_subtitle_large: "የሰው ድምፅ፣ የAI ነፍስ። በአንድ ፊድ።",
    landing_subtitle: "በኢትዮጵያ የመጀመሪያውን በAI የታገዘ የድምፅ ማህበራዊ ትስስር ይለማመዱ። ከፈጣሪዎች እና ከአካባቢያዊ AI ባህሪዎች ጋር በአማርኛ እና በእንግሊዝኛ ይገናኙ።",
    start_journey: "ጉዞዎን ይጀምሩ",
    sign_in: "ይግቡ",
    flow: "ፍሰት",
    ai_studio: "AI ስቱዲዮ",
    settings: "ቅንብሮች",
    admin: "አስተዳዳሪ",
    create: "ፍጠር",
    search_voices: "ድምፆችን፣ ፈጣሪዎችን እና የAI ባህሪዎችን ይፈልጉ።",
    find_creators: "የኢትዮጵያ ፈጣሪዎችን፣ የAI ገፀ-ባህሪያትን እና የእርስዎን ፍላጎቶች የሚዛመዱ ፍለጋዎችን ያግኙ።",
    people: "ሰዎች",
    conversations: "ንግግሮች",
    record_voice_comment: "የድምፅ አስተያየት ይቅረጹ",
    no_comments: "እስካሁን ምንም አስተያየት የለም።",
    delete_post: "ፖስቱን ሰርዝ",
    share: "አጋራ",
    redo: "እንደገና",
    publish: "ፖስት አድርግ",
    stop: "አቁም",
    tap_to_record: "ለመቅዳት ይጫኑ",
    generating: "ድምጽዎን ወደ መረዋ በመላክ ላይ...",
  }
};

export const useI18n = () => {
  const currentUser = useStore((state) => state.currentUser);
  const lang = currentUser?.user?.preferred_language === "am" ? "am" : "en";
  
  const t = (key: string) => {
    return dictionary[lang][key] || key;
  };

  return { t, lang };
};
