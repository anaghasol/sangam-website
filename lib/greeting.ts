/**
 * Dynamic Contextual Greeting Generator for Arjun (Sangam Catering Manager).
 *
 * Generates personalized, time-of-day, day-of-week, season, and festival-aware
 * greetings while preserving Arjun's core catering & banquet concierge identity.
 * Available in English, Telugu and Hindi — pass the currently selected chat
 * language so a fresh chat (or a language switch before the customer has
 * sent anything) opens in the right language immediately, not just once the
 * AI replies.
 */

type Lang = 'en' | 'te' | 'hi'

export function getDynamicArjunGreeting(lang: Lang = 'en'): string {
  const now = new Date()
  // Adjust to IST (UTC + 5:30)
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const istDate = new Date(utc + 3600000 * 5.5)
  const hours = istDate.getHours()
  const day = istDate.getDay() // 0: Sunday, 6: Saturday
  const month = istDate.getMonth() + 1 // 1-12
  const date = istDate.getDate()

  let timeSlot: 'morning' | 'afternoon' | 'evening' | 'late' = 'late'
  if (hours >= 5 && hours < 12) timeSlot = 'morning'
  else if (hours >= 12 && hours < 17) timeSlot = 'afternoon'
  else if (hours >= 17 && hours < 22) timeSlot = 'evening'
  else timeSlot = 'late'

  let daySlot: 'weekend' | 'sunday' | 'weekday' = 'weekday'
  if (day === 5 || day === 6) daySlot = 'weekend'
  else if (day === 0) daySlot = 'sunday'

  let festiveSlot: 'aug_sep' | 'oct_nov' | 'dec_jan' | 'none' = 'none'
  if (month === 8 || (month === 9 && date <= 15)) festiveSlot = 'aug_sep'
  else if (month === 10 || month === 11) festiveSlot = 'oct_nov'
  else if (month === 12 || month === 1) festiveSlot = 'dec_jan'

  const TEXT: Record<Lang, {
    timeGreeting: Record<'morning' | 'afternoon' | 'evening' | 'late', string>
    dayContext: Record<typeof daySlot, string>
    festiveContext: Record<typeof festiveSlot, string>
    variations: (tg: string, dc: string, fc: string) => string[]
  }> = {
    en: {
      timeGreeting: {
        morning: 'Subhodayam & Good morning',
        afternoon: 'Good afternoon',
        evening: 'Good evening',
        late: 'Warm greetings',
      },
      dayContext: {
        weekend: 'Planning a special weekend celebration or upcoming family get-together?',
        sunday: 'Hope you are having a wonderful Sunday! Planning an upcoming auspicious celebration?',
        weekday: 'Planning an upcoming wedding, birthday, or corporate event?',
      },
      festiveContext: {
        aug_sep: 'Happy festive season! ',
        oct_nov: 'Wishing you a joyful festive & wedding season! ',
        dec_jan: 'Winter wedding & celebration season is here! ',
        none: '',
      },
      variations: (tg, dc, fc) => [
        `Namaste! 🙏 ${tg}! I'm Arjun, hospitality & catering manager at **Sangam Hotels Hyderabad**. ${fc}${dc} How may I assist you with an **Indoor AC Banquet Hall** or **Outdoor Catering** quote today?`,
        `Namaste! 🙏 ${tg}! This is Arjun from **Sangam Hotels Hyderabad**. ${dc} Whether you need our grand **AC Banquet Halls (up to 600 guests)** or **Outdoor Catering & Trays**, I can share instant menus and customized quotes!`,
        `Namaste & ${tg}! 🙏 I'm Arjun, catering concierge at **Sangam Hotels Hyderabad**. ${fc}Looking for authentic **Hyderabadi Catering** or grand **AC Banquet Spaces**? Which service would you like to explore?`,
        `Namaste! 🙏 ${tg}! Arjun here from **Sangam Hotels Hyderabad**. ${dc} I can help you with **Indoor AC Banquet Packages**, **Custom Tray Estimates**, or **Live Catering Setups** across our branches. What are you planning?`,
      ],
    },
    te: {
      timeGreeting: {
        morning: 'శుభోదయం',
        afternoon: 'శుభ మధ్యాహ్నం',
        evening: 'శుభ సాయంత్రం',
        late: 'హృదయపూర్వక శుభాకాంక్షలు',
      },
      dayContext: {
        weekend: 'ప్రత్యేక వీకెండ్ వేడుక లేదా రాబోయే కుటుంబ గెట్‌టుగెదర్ ప్లాన్ చేస్తున్నారా?',
        sunday: 'మీ ఆదివారం చాలా బాగుండాలని ఆశిస్తున్నాను! రాబోయే శుభకార్యం ప్లాన్ చేస్తున్నారా?',
        weekday: 'రాబోయే వివాహం, పుట్టినరోజు లేదా కార్పొరేట్ ఈవెంట్ ప్లాన్ చేస్తున్నారా?',
      },
      festiveContext: {
        aug_sep: 'పండుగ సీజన్ శుభాకాంక్షలు! ',
        oct_nov: 'ఆనందకరమైన పండుగ & వివాహాల సీజన్ శుభాకాంక్షలు! ',
        dec_jan: 'వింటర్ వెడ్డింగ్ & సెలబ్రేషన్ సీజన్ వచ్చేసింది! ',
        none: '',
      },
      variations: (tg, dc, fc) => [
        `నమస్తే! 🙏 ${tg}! నేను అర్జున్, **సంగం హోటల్స్ హైదరాబాద్**లో హాస్పిటాలిటీ & కేటరింగ్ మేనేజర్. ${fc}${dc} ఈరోజు **ఇండోర్ AC బ్యాంక్వెట్ హాల్** లేదా **అవుట్‌డోర్ కేటరింగ్** కోటేషన్ కోసం నేను ఎలా సహాయపడగలను?`,
        `నమస్తే! 🙏 ${tg}! ఇది **సంగం హోటల్స్ హైదరాబాద్** నుండి అర్జున్. ${dc} మీకు మా గ్రాండ్ **AC బ్యాంక్వెట్ హాల్స్ (600 మంది వరకు)** అయినా, **అవుట్‌డోర్ కేటరింగ్ & ట్రేలు** అయినా, నేను తక్షణ మెనూలు మరియు అనుకూలీకరించిన కోటేషన్‌లను పంచుకోగలను!`,
        `నమస్తే & ${tg}! 🙏 నేను అర్జున్, **సంగం హోటల్స్ హైదరాబాద్**లో కేటరింగ్ కన్సియర్జ్. ${fc}అసలైన **హైదరాబాదీ కేటరింగ్** లేదా గ్రాండ్ **AC బ్యాంక్వెట్ స్పేసెస్** కోసం చూస్తున్నారా? మీరు ఏ సేవను అన్వేషించాలనుకుంటున్నారు?`,
        `నమస్తే! 🙏 ${tg}! ఇది **సంగం హోటల్స్ హైదరాబాద్** నుండి అర్జున్. ${dc} నేను మీకు **ఇండోర్ AC బ్యాంక్వెట్ ప్యాకేజీలు**, **కస్టమ్ ట్రే ఎస్టిమేట్‌లు**, లేదా మా బ్రాంచీలలో **లైవ్ కేటరింగ్ సెటప్‌లు** విషయంలో సహాయం చేయగలను. మీరు ఏమి ప్లాన్ చేస్తున్నారు?`,
      ],
    },
    hi: {
      timeGreeting: {
        morning: 'सुप्रभात',
        afternoon: 'शुभ दोपहर',
        evening: 'शुभ संध्या',
        late: 'हार्दिक शुभकामनाएं',
      },
      dayContext: {
        weekend: 'कोई खास वीकेंड सेलिब्रेशन या आने वाला फैमिली गेट-टुगेदर प्लान कर रहे हैं?',
        sunday: 'आशा है आपका रविवार शानदार गुजर रहा होगा! कोई शुभ आयोजन प्लान कर रहे हैं?',
        weekday: 'आने वाली शादी, जन्मदिन या कॉर्पोरेट इवेंट प्लान कर रहे हैं?',
      },
      festiveContext: {
        aug_sep: 'शुभ त्योहारी सीजन! ',
        oct_nov: 'खुशियों भरे त्योहारी और शादी के सीजन की शुभकामनाएं! ',
        dec_jan: 'विंटर वेडिंग और सेलिब्रेशन सीजन आ गया है! ',
        none: '',
      },
      variations: (tg, dc, fc) => [
        `नमस्ते! 🙏 ${tg}! मैं अर्जुन हूँ, **संगम होटल्स हैदराबाद** में हॉस्पिटैलिटी और केटरिंग मैनेजर। ${fc}${dc} आज मैं आपकी **इंडोर AC बैंक्वेट हॉल** या **आउटडोर केटरिंग** कोटेशन में कैसे मदद कर सकता हूँ?`,
        `नमस्ते! 🙏 ${tg}! यह **संगम होटल्स हैदराबाद** से अर्जुन है। ${dc} चाहे आपको हमारे भव्य **AC बैंक्वेट हॉल (600 मेहमानों तक)** चाहिए हों या **आउटडोर केटरिंग और ट्रे**, मैं तुरंत मेनू और कस्टम कोटेशन साझा कर सकता हूँ!`,
        `नमस्ते और ${tg}! 🙏 मैं अर्जुन हूँ, **संगम होटल्स हैदराबाद** में केटरिंग कंसीयज। ${fc}असली **हैदराबादी केटरिंग** या भव्य **AC बैंक्वेट स्पेस** की तलाश है? आप कौन सी सेवा जानना चाहेंगे?`,
        `नमस्ते! 🙏 ${tg}! यह **संगम होटल्स हैदराबाद** से अर्जुन है। ${dc} मैं आपकी **इंडोर AC बैंक्वेट पैकेज**, **कस्टम ट्रे एस्टिमेट**, या हमारी शाखाओं में **लाइव केटरिंग सेटअप** में मदद कर सकता हूँ। आप क्या प्लान कर रहे हैं?`,
      ],
    },
  }

  const t = TEXT[lang] || TEXT.en
  const tg = t.timeGreeting[timeSlot]
  const dc = t.dayContext[daySlot]
  const fc = t.festiveContext[festiveSlot]
  const variations = t.variations(tg, dc, fc)

  // Pick a variation deterministically (same index across languages, so
  // switching language mid-selection still lands on the "same" greeting).
  const index = (istDate.getDate() + hours) % variations.length
  return variations[index]
}
