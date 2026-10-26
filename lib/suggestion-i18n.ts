// Chip *labels* (what the user sees) are translated per the selected
// language; chip *text* (the message actually re-sent to the AI when
// tapped) deliberately stays in English — the detection regexes in
// generateDynamicSuggestions() and app/api/chat/route.ts (hasPax,
// hasOccasion, hasDate, hasTime, etc.) match English keywords, so
// translating `text` would silently break that detection.
// Shared by the server (kept here only for type-reuse) and, more
// importantly, by the client widgets (app/page.tsx, app/embed/chat/page.tsx)
// so a language switch can re-translate whatever chips are already on
// screen immediately, without waiting for the next AI turn.
export const SUGGESTION_LABEL_TR: Record<string, { te: string; hi: string }> = {
  '🏛️ Indoor Catering': { te: '🏛️ ఇండోర్ కేటరింగ్', hi: '🏛️ इंडोर केटरिंग' },
  '🚚 Outdoor Catering': { te: '🚚 అవుట్‌డోర్ కేటరింగ్', hi: '🚚 आउटडोर केटरिंग' },
  '✏️ Edit Starters': { te: '✏️ స్టార్టర్స్ మార్చండి', hi: '✏️ स्टार्टर्स बदलें' },
  '✏️ Edit Curries': { te: '✏️ కర్రీలు మార్చండి', hi: '✏️ करी बदलें' },
  '✏️ Edit Biryani & Desserts': { te: '✏️ బిర్యానీ & డెజర్ట్స్ మార్చండి', hi: '✏️ बिरयानी और डेसर्ट बदलें' },
  '🍲 Add Live Dosa Counter': { te: '🍲 లైవ్ దోశ కౌంటర్ జోడించండి', hi: '🍲 लाइव डोसा काउंटर जोड़ें' },
  '📱 Save Quote on WhatsApp': { te: '📱 కోటేషన్‌ను వాట్సాప్‌లో సేవ్ చేయండి', hi: '📱 कोटेशन को व्हाट्सएप पर सेव करें' },
  '👥 Recalculate for 100 Pax': { te: '👥 100 మంది కోసం రీకాలిక్యులేట్ చేయండి', hi: '👥 100 लोगों के लिए फिर से गणना करें' },
  '👥 Recalculate for 150 Pax': { te: '👥 150 మంది కోసం రీకాలిక్యులేట్ చేయండి', hi: '👥 150 लोगों के लिए फिर से गणना करें' },
  '🎉 Birthday Party': { te: '🎉 బర్త్‌డే పార్టీ', hi: '🎉 जन्मदिन पार्टी' },
  '🏡 Housewarming': { te: '🏡 గృహప్రవేశం', hi: '🏡 गृहप्रवेश' },
  '💍 Wedding / Reception': { te: '💍 వివాహం / రిసెప్షన్', hi: '💍 शादी / रिसेप्शन' },
  '💼 Corporate Event': { te: '💼 కార్పొరేట్ ఈవెంట్', hi: '💼 कॉर्पोरेट इवेंट' },
  '🌴 Farmhouse / Gathering': { te: '🌴 ఫామ్‌హౌస్ / గెట్‌టుగెదర్', hi: '🌴 फार्महाउस / गेट-टुगेदर' },
  '☀️ Lunch (12 PM - 3 PM)': { te: '☀️ లంచ్ (12 PM - 3 PM)', hi: '☀️ लंच (12 PM - 3 PM)' },
  '🌙 Dinner (7:30 PM - 10:30 PM)': { te: '🌙 డిన్నర్ (7:30 PM - 10:30 PM)', hi: '🌙 डिनर (7:30 PM - 10:30 PM)' },
  '🌅 Morning Breakfast (8 AM - 11 AM)': { te: '🌅 మార్నింగ్ బ్రేక్‌ఫాస్ట్ (8 AM - 11 AM)', hi: '🌅 मॉर्निंग ब्रेकफास्ट (8 AM - 11 AM)' },
  '👥 30 Guests': { te: '👥 30 మంది అతిథులు', hi: '👥 30 मेहमान' },
  '👥 50 Guests': { te: '👥 50 మంది అతిథులు', hi: '👥 50 मेहमान' },
  '👥 100 Guests': { te: '👥 100 మంది అతిథులు', hi: '👥 100 मेहमान' },
  '👥 150 Guests': { te: '👥 150 మంది అతిథులు', hi: '👥 150 मेहमान' },
  '👥 200+ Guests': { te: '👥 200+ మంది అతిథులు', hi: '👥 200+ मेहमान' },
  '👥 200 Guests': { te: '👥 200 మంది అతిథులు', hi: '👥 200 मेहमान' },
  '👥 300+ Guests': { te: '👥 300+ మంది అతిథులు', hi: '👥 300+ मेहमान' },
  '🌿 Popular Veg Spread (₹499)': { te: '🌿 పాపులర్ వెజ్ స్ప్రెడ్ (₹499)', hi: '🌿 पॉपुलर वेज स्प्रेड (₹499)' },
  '🍗 Hyderabadi Non-Veg (₹649)': { te: '🍗 హైదరాబాదీ నాన్-వెజ్ (₹649)', hi: '🍗 हैदराबादी नॉन-वेज (₹649)' },
  '🍛 Custom Dishes & Counters': { te: '🍛 కస్టమ్ డిషెస్ & కౌంటర్లు', hi: '🍛 कस्टम व्यंजन और काउंटर' },
  '🌿 Pure Veg Spread (₹499)': { te: '🌿 ప్యూర్ వెజ్ స్ప్రెడ్ (₹499)', hi: '🌿 प्योर वेज स्प्रेड (₹499)' },
  '🍗 Non-Veg Spread (₹649)': { te: '🍗 నాన్-వెజ్ స్ప్రెడ్ (₹649)', hi: '🍗 नॉन-वेज स्प्रेड (₹649)' },
  '📍 Peerzadiguda Flagship': { te: '📍 పీర్జాదిగూడ ఫ్లాగ్‌షిప్', hi: '📍 पीरज़ादिगुड़ा फ्लैगशिप' },
  '📍 Hayathnagar HQ': { te: '📍 హయత్‌నగర్ HQ', hi: '📍 हयातनगर HQ' },
  '☀️ Lunch (11 AM - 3 PM)': { te: '☀️ లంచ్ (11 AM - 3 PM)', hi: '☀️ लंच (11 AM - 3 PM)' },
  '🌙 Dinner (7 PM - 11 PM)': { te: '🌙 డిన్నర్ (7 PM - 11 PM)', hi: '🌙 डिनर (7 PM - 11 PM)' },
  '🌅 Full Day (6 AM - 10 PM)': { te: '🌅 ఫుల్ డే (6 AM - 10 PM)', hi: '🌅 फुल डे (6 AM - 10 PM)' },
  '🌿 Pure Veg': { te: '🌿 ప్యూర్ వెజ్', hi: '🌿 प्योर वेज' },
  '🥗 Veg & Non-Veg': { te: '🥗 వెజ్ & నాన్-వెజ్', hi: '🥗 वेज और नॉन-वेज' },
  '🍗 Non-Veg': { te: '🍗 నాన్-వెజ్', hi: '🍗 नॉन-वेज' },
  '🌱 Standard Veg Menu (₹600)': { te: '🌱 స్టాండర్డ్ వెజ్ మెనూ (₹600)', hi: '🌱 स्टैंडर्ड वेज मेनू (₹600)' },
  '👑 Grand Veg Menu (₹700)': { te: '👑 గ్రాండ్ వెజ్ మెనూ (₹700)', hi: '👑 ग्रैंड वेज मेनू (₹700)' },
  '🍗 Standard Non-Veg Menu (₹800)': { te: '🍗 స్టాండర్డ్ నాన్-వెజ్ మెనూ (₹800)', hi: '🍗 स्टैंडर्ड नॉन-वेज मेनू (₹800)' },
  '🌟 Grand Non-Veg Menu (₹900)': { te: '🌟 గ్రాండ్ నాన్-వెజ్ మెనూ (₹900)', hi: '🌟 ग्रैंड नॉन-वेज मेनू (₹900)' },
  '💎 Platinum Non-Veg (₹1,000)': { te: '💎 ప్లాటినం నాన్-వెజ్ (₹1,000)', hi: '💎 प्लैटिनम नॉन-वेज (₹1,000)' },
  '🌿 Switch to Pure Veg': { te: '🌿 ప్యూర్ వెజ్‌కు మార్చండి', hi: '🌿 प्योर वेज में बदलें' },
  '🍗 Switch to Veg & Non-Veg': { te: '🍗 వెజ్ & నాన్-వెజ్‌కు మార్చండి', hi: '🍗 वेज और नॉन-वेज में बदलें' },
  '🏛️ Book Hall Viewing': { te: '🏛️ హాల్ వీక్షణ బుక్ చేయండి', hi: '🏛️ हॉल विज़िट बुक करें' },
  '🥢 Add Paneer Tikka': { te: '🥢 పనీర్ టిక్కా జోడించండి', hi: '🥢 पनीर टिक्का जोड़ें' },
  '🥢 Add Chilli Chicken': { te: '🥢 చిల్లీ చికెన్ జోడించండి', hi: '🥢 चिल्ली चिकन जोड़ें' },
  '🥢 Add Veg Spring Rolls': { te: '🥢 వెజ్ స్ప్రింగ్ రోల్స్ జోడించండి', hi: '🥢 वेज स्प्रिंग रोल्स जोड़ें' },
  '🥢 Add Chicken Majestic': { te: '🥢 చికెన్ మెజెస్టిక్ జోడించండి', hi: '🥢 चिकन मेजेस्टिक जोड़ें' },
  '✅ Done Editing Starters': { te: '✅ స్టార్టర్స్ పూర్తయింది', hi: '✅ स्टार्टर्स पूरा हुआ' },
  '🥘 Add Kadai Paneer': { te: '🥘 కడాయి పనీర్ జోడించండి', hi: '🥘 कढ़ाई पनीर जोड़ें' },
  '🥘 Add Methi Chaman': { te: '🥘 మేతీ చమన్ జోడించండి', hi: '🥘 मेथी चमन जोड़ें' },
  '🍗 Add Mughlai Chicken': { te: '🍗 మొఘలై చికెన్ జోడించండి', hi: '🍗 मुगलई चिकन जोड़ें' },
  '🍗 Add Mutton Rogan Josh': { te: '🍗 మటన్ రోగన్ జోష్ జోడించండి', hi: '🍗 मटन रोगन जोश जोड़ें' },
  '✅ Done Editing Curries': { te: '✅ కర్రీలు పూర్తయింది', hi: '✅ करी पूरी हुई' },
  '🍚 Add Mutton Dum Biryani': { te: '🍚 మటన్ దమ్ బిర్యానీ జోడించండి', hi: '🍚 मटन दम बिरयानी जोड़ें' },
  '🍨 Add Qubani Ka Meetha': { te: '🍨 ఖుబానీ కా మీఠా జోడించండి', hi: '🍨 क़ुबानी का मीठा जोड़ें' },
  '🍨 Add Gulab Jamun & Ice Cream': { te: '🍨 గులాబ్ జామున్ & ఐస్‌క్రీమ్ జోడించండి', hi: '🍨 गुलाब जामुन और आइसक्रीम जोड़ें' },
  '✅ Done Editing Desserts': { te: '✅ డెజర్ట్స్ పూర్తయింది', hi: '✅ डेसर्ट पूरा हुआ' },
  // Menu-first flow, dish changes and the rest of the labels the chat can emit (2026-10-26).
  '🏛️ Indoor Banquet Hall': { te: '🏛️ ఇండోర్ బ్యాంక్వెట్ హాల్', hi: '🏛️ इंडोर बैंक्वेट हॉल' },
  '👍 Happy with this menu': { te: '👍 ఈ మెనూ నచ్చింది', hi: '👍 यह मेनू पसंद आया' },
  '✏️ Change some dishes': { te: '✏️ కొన్ని వంటకాలు మార్చండి', hi: '✏️ कुछ व्यंजन बदलें' },
  '🔄 Other packages': { te: '🔄 ఇతర ప్యాకేజీలు', hi: '🔄 अन्य पैकेज' },
  '🔁 Change another dish': { te: '🔁 మరో వంటకం మార్చండి', hi: '🔁 एक और व्यंजन बदलें' },
  '✅ Confirm this estimation': { te: '✅ ఈ అంచనాను నిర్ధారించండి', hi: '✅ इस अनुमान की पुष्टि करें' },
  '💡 Suggest a Spread for Me': { te: '💡 నాకు ఒక మెనూ సూచించండి', hi: '💡 मेरे लिए मेनू सुझाएँ' },
  '🍛 Custom Dishes & Live Counters': { te: '🍛 కస్టమ్ వంటకాలు & లైవ్ కౌంటర్లు', hi: '🍛 कस्टम व्यंजन और लाइव काउंटर' },
  '💡 Suggest More Dishes': { te: '💡 మరిన్ని వంటకాలు సూచించండి', hi: '💡 और व्यंजन सुझाएँ' },
  '🍛 Change the Dishes': { te: '🍛 వంటకాలు మార్చండి', hi: '🍛 व्यंजन बदलें' },
  '📅 Pick from Calendar': { te: '📅 క్యాలెండర్ నుండి ఎంచుకోండి', hi: '📅 कैलेंडर से चुनें' },
  '🆕 Plan Another Event': { te: '🆕 మరో ఈవెంట్ ప్లాన్ చేయండి', hi: '🆕 एक और इवेंट प्लान करें' },
  '📞 Call Catering Manager': { te: '📞 కేటరింగ్ మేనేజర్‌కు కాల్ చేయండి', hi: '📞 केटरिंग मैनेजर को कॉल करें' },
  '🚚 Switch to Outdoor Catering': { te: '🚚 అవుట్‌డోర్ కేటరింగ్‌కు మారండి', hi: '🚚 आउटडोर केटरिंग पर जाएँ' },
}

// Labels that carry a date or a number, so they can't be listed one by one.
const PATTERN_TR: Array<{ re: RegExp; te: (m: RegExpMatchArray) => string; hi: (m: RegExpMatchArray) => string }> = [
  { re: /^⚡ Tomorrow \((.+)\)$/, te: m => `⚡ రేపు (${m[1]})`, hi: m => `⚡ कल (${m[1]})` },
  { re: /^🎉 This Sat \((.+)\)$/, te: m => `🎉 ఈ శనివారం (${m[1]})`, hi: m => `🎉 इस शनिवार (${m[1]})` },
  { re: /^🌟 This Sun \((.+)\)$/, te: m => `🌟 ఈ ఆదివారం (${m[1]})`, hi: m => `🌟 इस रविवार (${m[1]})` },
  { re: /^📅 Next Sat \((.+)\)$/, te: m => `📅 వచ్చే శనివారం (${m[1]})`, hi: m => `📅 अगले शनिवार (${m[1]})` },
  { re: /^✅ Proceed with (\d+) guests$/, te: m => `✅ ${m[1]} మంది అతిథులతో కొనసాగండి`, hi: m => `✅ ${m[1]} मेहमानों के साथ आगे बढ़ें` },
  { re: /^👥 Keep all (\d+) guests$/, te: m => `👥 మొత్తం ${m[1]} మంది అతిథులను ఉంచండి`, hi: m => `👥 सभी ${m[1]} मेहमान रखें` },
]

export function translateSuggestionLabel(label: string, lang: string): string {
  if (lang !== 'te' && lang !== 'hi') return label
  const tr = SUGGESTION_LABEL_TR[label]
  if (tr) return lang === 'te' ? tr.te : tr.hi
  for (const p of PATTERN_TR) {
    const m = label.match(p.re)
    if (m) return lang === 'te' ? p.te(m) : p.hi(m)
  }
  return label
}
