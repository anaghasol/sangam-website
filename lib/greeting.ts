/**
 * Dynamic Contextual Greeting Generator for Arjun (Sangam Catering Manager).
 *
 * Generates personalized, time-of-day, day-of-week, season, and festival-aware
 * greetings while preserving Arjun's core catering & banquet concierge identity.
 */

export function getDynamicArjunGreeting(): string {
  const now = new Date()
  // Adjust to IST (UTC + 5:30)
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const istDate = new Date(utc + 3600000 * 5.5)
  const hours = istDate.getHours()
  const day = istDate.getDay() // 0: Sunday, 6: Saturday
  const month = istDate.getMonth() + 1 // 1-12
  const date = istDate.getDate()

  // 1. Time of Day Segment
  let timeGreeting = 'Good day'
  if (hours >= 5 && hours < 12) {
    timeGreeting = 'Subhodayam & Good morning'
  } else if (hours >= 12 && hours < 17) {
    timeGreeting = 'Good afternoon'
  } else if (hours >= 17 && hours < 22) {
    timeGreeting = 'Good evening'
  } else {
    timeGreeting = 'Namaste & greetings'
  }

  // 2. Day of Week Context
  let dayContext = ''
  if (day === 5 || day === 6) {
    dayContext = 'Planning a special weekend celebration or upcoming family get-together?'
  } else if (day === 0) {
    dayContext = 'Hope you are having a wonderful Sunday! Planning an upcoming auspicious celebration?'
  } else {
    dayContext = 'Planning an upcoming wedding, birthday, or corporate event?'
  }

  // 3. Seasonal / Festive Context (Indian Calendar Awareness)
  let festiveContext = ''
  if (month === 8 || (month === 9 && date <= 15)) {
    festiveContext = 'Happy festive season! '
  } else if (month === 10 || month === 11) {
    festiveContext = 'Wishing you a joyful festive & wedding season! '
  } else if (month === 12 || month === 1) {
    festiveContext = 'Winter wedding & celebration season is here! '
  }

  // 4. Curated Pool of Hospitable Variations
  const variations = [
    `Namaste! 🙏 ${timeGreeting}! I'm Arjun, hospitality & catering manager at **Sangam Hotels Hyderabad**. ${festiveContext}${dayContext} How may I assist you with an **Indoor AC Banquet Hall** or **Outdoor Catering** quote today?`,
    `Namaste! 🙏 ${timeGreeting}! This is Arjun from **Sangam Hotels Hyderabad**. ${dayContext} Whether you need our grand **AC Banquet Halls (up to 600 guests)** or **Outdoor Catering & Trays**, I can share instant menus and customized quotes!`,
    `Namaste & ${timeGreeting}! 🙏 I'm Arjun, catering concierge at **Sangam Hotels Hyderabad**. ${festiveContext}Looking for authentic **Hyderabadi Catering** or grand **AC Banquet Spaces**? Which service would you like to explore?`,
    `Namaste! 🙏 ${timeGreeting}! Arjun here from **Sangam Hotels Hyderabad**. ${dayContext} I can help you with **Indoor AC Banquet Packages**, **Custom Tray Estimates**, or **Live Catering Setups** across our branches. What are you planning?`
  ]

  // Pick a variation deterministically or semi-randomly
  const index = (istDate.getDate() + hours) % variations.length
  return variations[index]
}
