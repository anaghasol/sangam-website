"use client";

import { useState, useRef } from "react";

type Screen = "home" | "menu" | "branches" | "catering" | "rooms" | "about" | "contact";

// ── Real images from sangamhotelshyderabad.com ──────────────────────────────
const BASE = "https://www.sangamhotelshyderabad.com/wp-content/uploads";
const IMGS = {
  logo:         `${BASE}/2024/02/sangam-hotel-Hyderabad-Logo.png`,
  heroFallback: `${BASE}/2025/06/Magudam-6-1078x595.jpeg`,

  // ── Halls (full-size scaled) ───────────────────────────────────
  arangam:      `${BASE}/2025/06/Arangam-7-scaled.jpeg`,
  magudam:      `${BASE}/2025/06/Magudam-7-scaled.jpeg`,
  magudamWide:  `${BASE}/2025/06/Magudam-6-1078x595.jpeg`,

  // ── Peerzadiguda (full-size) ──────────────────────────────────
  peerzHall:    `${BASE}/2025/06/WhatsApp-Image-2025-06-20-at-3.35.18-PM-scaled.jpeg`,
  peer1:        `${BASE}/2025/06/WhatsApp-Image-2025-06-20-at-4.19.24-PM-1-scaled.jpeg`,
  peer2:        `${BASE}/2025/06/WhatsApp-Image-2025-06-20-at-4.19.24-PM-scaled.jpeg`,
  peer3:        `${BASE}/2025/06/WhatsApp-Image-2025-06-20-at-4.18.51-PM-2-scaled.jpeg`,

  // ── Hayathnagar / Malkapur (full-size) ────────────────────────
  hayt1:        `${BASE}/2025/06/WhatsApp-Image-2025-06-19-at-5.22.51-PM.jpeg`,
  hayt2:        `${BASE}/2025/06/WhatsApp-Image-2025-06-19-at-5.22.50-PM.jpeg`,
  malkapur1:    `${BASE}/2025/06/WhatsApp-Image-2025-06-19-at-5.19.59-PM-1.jpeg`,
  malkapur2:    `${BASE}/2025/06/WhatsApp-Image-2025-06-19-at-5.19.59-PM.jpeg`,
  malkapur3:    `${BASE}/2025/06/WhatsApp-Image-2025-06-19-at-5.19.58-PM.jpeg`,
  malkapur4:    `${BASE}/2025/06/WhatsApp-Image-2025-06-19-at-5.19.57-PM.jpeg`,

  // ── Room photos (all 4 available) ─────────────────────────────
  room1:        `${BASE}/2025/06/WhatsApp-Image-2025-06-05-at-11.28.55_aba4a869-1078x595.jpg`,
  room2:        `${BASE}/2024/02/WhatsApp-Image-2025-06-05-at-11.29.08_16d06d48-768x578.jpg`,
  room3:        `${BASE}/2024/02/WhatsApp-Image-2025-06-05-at-11.29.07_ad49de3c-768x576.jpg`,
  room4:        `${BASE}/2024/02/WhatsApp-Image-2025-06-05-at-11.29.06_b9e73879-768x576.jpg`,
  room5:        `${BASE}/2024/02/WhatsApp-Image-2025-06-05-at-11.29.05_37293c98-1078x595.jpg`,
  room6:        `${BASE}/2024/02/WhatsApp-Image-2025-06-05-at-11.29.04_a635c195-scaled.jpg`,

  // ── Category strip photos (exact images from current site) ────
  tiffins:      `${BASE}/2025/06/tiffins.png`,
  restaurant:   `${BASE}/2025/06/restaurants.png`,
  bakery:       `${BASE}/2025/06/Bakery-Items-1.png`,

  // ── Food / biryani ────────────────────────────────────────────
  biryani:      `${BASE}/2024/02/Biryani-Mughlai.jpg`,
  biryaniReal:  `${BASE}/2025/11/Discover-the-Best-Mutton-Biryani-in-Hyderabad-at-Sangam-Hotel-Hyderabad.jpg`,

  // ── Menu card scans ───────────────────────────────────────────
  menuPage1:    `${BASE}/2025/06/SANGAM-MANSOORABAD-MENU-1_page-0001-scaled.jpg`,
  menuPage2:    `${BASE}/2025/06/SANGAM-MANSOORABAD-MENU-1_page-0002-scaled.jpg`,

  // ── Editorial / blog ──────────────────────────────────────────
  hotelHero:    `${BASE}/2025/08/Sangam-Hotel-Hyderabad-–-Redefining-Hospitality-Taste-and-Celebrations-1078x595.jpg`,
  newBranch:    `${BASE}/2025/07/WhatsApp-Image-2025-07-07-at-15.12.37_d297b49e.jpg`,
};

const BRANCHES = [
  {
    id: "peerzadiguda",
    name: "Sangam Hotels · Peerzadiguda",
    shortName: "Peerzadiguda",
    badge: "HQ",
    badgeColor: "#1a5a8a",
    badgeBg: "#e3f0f7",
    badgeBorder: "#bfd5e8",
    type: ["Restaurant", "Tiffins", "Rooms", "Banquet"],
    tagline: "Hotel · Restaurant · Bakery · Banquet Halls",
    address: "Parvathapur Rd, Gullam Ali Guda village, Peerzadiguda, Hyderabad – 500098",
    phone: "+91 90638 44021",
    phone2: "+91 90638 44022",
    hours: "24 Hours",
    rating: "4.5",
    img: IMGS.room1,
    mapsLink: "https://maps.google.com/?q=Sangam+Hotels+Peerzadiguda+Hyderabad",
  },
  {
    id: "hayathnagar",
    name: "Sangam Hotels · Hayathnagar",
    shortName: "Hayathnagar",
    badge: "FLAGSHIP",
    badgeColor: "#1a6a3a",
    badgeBg: "#e3f2e7",
    badgeBorder: "#bfe2c8",
    type: ["Restaurant", "Tiffins", "Banquet"],
    tagline: "Restaurant · Tiffins · Banquet Hall (300 cap.)",
    address: "Laxma Reddy Palem, NH65, Krupa Colony, Hayathnagar Khalsa, Hyderabad – 501505",
    phone: "+91 73838 38166",
    hours: "6 AM – 11 PM",
    rating: "4.6",
    img: IMGS.hayt1,
    mapsLink: "https://maps.google.com/?q=Sangam+Hotels+Hayathnagar+Hyderabad",
  },
  {
    id: "malkapur",
    name: "Sangam Hotels · Malkapur",
    shortName: "Malkapur",
    badge: "RESTAURANT",
    badgeColor: "#1a6a3a",
    badgeBg: "#e3f2e7",
    badgeBorder: "#bfe2c8",
    type: ["Restaurant", "Tiffins"],
    tagline: "Restaurant · Tiffins · Bakery",
    address: "JIO BP Plaza, Sy No 69–70, Malkapur, Choutuppal, Telangana – 508252",
    phone: "+91 7337332609",
    hours: "6 AM – 11 PM",
    rating: "4.3",
    img: IMGS.restaurant,
    mapsLink: "https://maps.google.com/?q=Sangam+Hotels+Malkapur+Choutuppal",
  },
  {
    id: "bakes-hayathnagar",
    name: "Sangam Bakes & Cakes · Hayathnagar",
    shortName: "Bakes · Hayathnagar",
    badge: "BAKES",
    badgeColor: "#8a6a16",
    badgeBg: "#f7eecf",
    badgeBorder: "#e8d6a4",
    type: ["Bakes"],
    tagline: "Cakes · Pastries · Savouries",
    address: "Opposite Hayathnagar main branch, Hayathnagar, Hyderabad",
    phone: "+91 90638 44021",
    hours: "7 AM – 10:30 PM",
    rating: "4.5",
    img: IMGS.bakery,
    mapsLink: "https://share.google/hZbW0oHkG2KJbKdcU",
  },
  {
    id: "bakes-mansoorabad",
    name: "Sangam Bakes & Cakes · Mansoorabad",
    shortName: "Bakes · Mansoorabad",
    badge: "BAKES",
    badgeColor: "#8a6a16",
    badgeBg: "#f7eecf",
    badgeBorder: "#e8d6a4",
    type: ["Bakes"],
    tagline: "Cakes · Celebration Cakes · Pastries",
    address: "Mansoorabad, Hyderabad",
    phone: "+91 90638 44021",
    hours: "7 AM – 10:30 PM",
    rating: "4.5",
    img: IMGS.bakery,
    mapsLink: "https://share.google/LvqnUASmK13LmXwYM",
  },
  {
    id: "tiffins-mansoorabad",
    name: "Sangam Hotel · Mansoorabad",
    shortName: "Tiffins · Mansoorabad",
    badge: "TIFFINS",
    badgeColor: "#8a2f6a",
    badgeBg: "#f7e3f0",
    badgeBorder: "#e9c2dd",
    type: ["Tiffins"],
    tagline: "South Indian Tiffins & Lunch",
    address: "Mansoorabad, Hyderabad",
    phone: "+91 90638 44021",
    hours: "6 AM – 3 PM",
    rating: "4.4",
    img: IMGS.hayt1,
    mapsLink: "https://share.google/Cm4dgz1StJ9kDDozJ",
  },
  {
    id: "tiffins-koyyalagudem",
    name: "Sangam Hotel · Koyyalagudem",
    shortName: "Tiffins · Koyyalagudem",
    badge: "TIFFINS",
    badgeColor: "#8a2f6a",
    badgeBg: "#f7e3f0",
    badgeBorder: "#e9c2dd",
    type: ["Tiffins"],
    tagline: "South Indian Tiffins & Lunch",
    address: "Koyyalagudem, Choutuppal, Telangana",
    phone: "+91 90638 44021",
    hours: "6 AM – 3 PM",
    rating: "4.4",
    img: IMGS.hayt2,
    mapsLink: "https://share.google/CvuJkWSxmb7AWI7U9",
  },
];

const TESTIMONIALS = [
  {
    stars: "★★★★★",
    text: "Amazing tiffins every morning — fresh and full of flavor. Lunch and dinner equally satisfying with both North and South Indian options. Courteous staff and clean ambiance. Absolutely loved it!",
    author: "Anil Reddy",
    location: "India",
    branch: "Hayathnagar",
  },
  {
    stars: "★★★★★",
    text: "We hosted our engagement ceremony here and it was truly unforgettable! The banquet hall was beautifully decorated, spacious and well-maintained. Staff was courteous and attentive throughout. Highly recommend!",
    author: "Kavya",
    location: "Hyderabad",
    branch: "Peerzadiguda",
  },
  {
    stars: "★★★★★",
    text: "Well-appointed rooms blending comfort and convenience. Tastefully designed with modern amenities, plush bedding, clean bathrooms. Whether business or leisure, the ambiance and attention to detail make Sangam a trusted name.",
    author: "Arun Kandula",
    location: "United Kingdom",
    branch: "Peerzadiguda",
  },
  {
    stars: "★★★★★",
    text: "Best ghee masala dosa I've had in Hyderabad! Crispy, hot and perfectly spiced. The idli sambar was also top notch — very authentic taste. Will definitely be coming back every morning!",
    author: "Priya Sharma",
    location: "Hyderabad",
    branch: "Tiffins · Mansoorabad",
  },
  {
    stars: "★★★★★",
    text: "The cakes from Sangam Bakes are absolutely divine. Got a custom birthday cake and it was gorgeous and delicious. The pastries are fresh every single day. Best bakery in the area by far!",
    author: "Deepa Nair",
    location: "Hyderabad",
    branch: "Sangam Bakes · Mansoorabad",
  },
  {
    stars: "★★★★★",
    text: "Stopped here on the highway and was pleasantly surprised! Quick service, fresh tiffins, great sambar. Perfect highway stop — hot food, clean place, very reasonable prices. The vada was outstanding!",
    author: "Ravi Kumar",
    location: "Warangal",
    branch: "Koyyalagudem",
  },
  {
    stars: "★★★★★",
    text: "The Sangamam Hall at Peerzadiguda is magnificent — hosted our wedding reception for 500 guests and everything was perfect. The catering team was professional and the food was phenomenal. 10/10!",
    author: "Srinivas Rao",
    location: "Hyderabad",
    branch: "Sangamam Hall",
  },
  {
    stars: "★★★★★",
    text: "Malkapur outlet is a gem! Amazing biryani and the tiffins are super fresh. Great stop on the Choutuppal highway. Staff is friendly and the place is always clean. Highly recommended for travelers!",
    author: "Mohammed Farhan",
    location: "Nalgonda",
    branch: "Malkapur",
  },
  {
    stars: "★★★★★",
    text: "The Black Forest cake from Sangam Bakes Hayathnagar is the best I've had! Fresh cream, perfect sponge. Order cakes here for every occasion — they never disappoint. The whole family loves this place.",
    author: "Sunita Reddy",
    location: "Hayathnagar",
    branch: "Sangam Bakes · Hayathnagar",
  },
];

function Img({ src, alt, style }: { src: string; alt: string; style?: React.CSSProperties }) {
  return (
    <img
      src={src}
      alt={alt}
      style={style}
      onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
    />
  );
}

export default function SangamHotels() {
  const [screen, setScreen] = useState<Screen>("home");
  const [chatOpen, setChatOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const [branchFilter, setBranchFilter] = useState("All");
  const videoRef = useRef<HTMLVideoElement>(null);

  const go = (s: Screen) => () => setScreen(s);

  const navBase: React.CSSProperties = {
    font: "600 14px/1 'DM Sans'", color: "#4a3f36",
    textDecoration: "none", padding: "10px 2px",
    cursor: "pointer", borderBottom: "2px solid transparent",
  };
  const navOn: React.CSSProperties = { ...navBase, color: "#8a1f2b", borderBottom: "2px solid #c79a3a" };
  const nav = (k: Screen) => screen === k ? navOn : navBase;

  const branchTypes = ["All", "Restaurant", "Tiffins", "Bakes", "Rooms", "Banquet"];
  const filteredBranches = branchFilter === "All" ? BRANCHES : BRANCHES.filter(b => b.type.includes(branchFilter));

  return (
    <div style={{ minHeight: "100vh", background: "#fbf6ec", fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── UTILITY STRIP ─────────────────────────────────────────── */}
      <div style={{ display:"flex", alignItems:"center", gap:16, padding:"0 40px", height:38, background:"#241510", color:"#e8d8c2", font:"500 12.5px/1 'DM Sans'" }}>
        <span>📍 7 locations across Hyderabad &amp; Telangana</span>
        <span style={{ opacity:.4 }}>•</span>
        <span>🕒 Open 6:00 AM – 11:00 PM</span>
        <div style={{ flex:1 }} />
        <a href="https://wa.me/qr/2AWL7MVBOJPEH1" target="_blank" rel="noopener noreferrer" style={{ color:"#9fd9a0", textDecoration:"none", display:"inline-flex", alignItems:"center", gap:6 }}>💬 WhatsApp</a>
        <span style={{ opacity:.4 }}>•</span>
        <a href="tel:+919063844021" style={{ color:"#e8d8c2", textDecoration:"none" }}>📞 +91 90638 44021</a>
      </div>

      {/* ── HEADER ────────────────────────────────────────────────── */}
      <div style={{ position:"sticky", top:0, zIndex:50, display:"flex", alignItems:"center", gap:26, padding:"14px 40px", background:"rgba(251,246,236,.96)", backdropFilter:"blur(10px)", borderBottom:"1px solid #ece2d2" }}>
        <div onClick={go("home")} style={{ display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}>
          <Img src={IMGS.logo} alt="Sangam Hotels" style={{ height:46, width:"auto", display:"block" }} />
          <div style={{ lineHeight:1 }}>
            <div style={{ font:"700 21px/1 'Playfair Display'", color:"#8a1f2b" }}>Sangam Hotels</div>
            <div style={{ font:"600 8.5px/1.4 'DM Sans'", letterSpacing:".26em", color:"#b88a2e", marginTop:4, textTransform:"uppercase" }}>Hyderabad · Since 2022</div>
          </div>
        </div>
        <div style={{ flex:1 }} />
        <nav style={{ display:"flex", alignItems:"center", gap:22 }}>
          {(["home","menu","branches","catering","rooms","about","contact"] as Screen[]).map(s => (
            <a key={s} onClick={go(s)} style={nav(s)}>{s.charAt(0).toUpperCase()+s.slice(1)}</a>
          ))}
        </nav>
        <button onClick={go("menu")} style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#8a1f2b", color:"#fff", font:"600 14px/1 'DM Sans'", padding:"13px 22px", borderRadius:30, border:"none", cursor:"pointer", boxShadow:"0 8px 20px rgba(138,31,43,.22)" }}>
          Order Online
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          HOME
      ══════════════════════════════════════════════════════════════ */}
      {screen === "home" && (
        <div>
          {/* HERO VIDEO */}
          <div style={{ position:"relative", height:600, background:"linear-gradient(135deg,#caa24a,#7a3018)", overflow:"hidden" }}>
            <video
              ref={videoRef}
              autoPlay loop muted={muted} playsInline
              style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}
              poster={IMGS.heroFallback}
            >
              <source src="/hero.mp4" type="video/mp4" />
            </video>
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(100deg,rgba(20,10,8,.9) 0%,rgba(20,10,8,.6) 46%,rgba(20,10,8,.15) 100%)" }} />
            <div style={{ position:"relative", height:"100%", display:"flex", flexDirection:"column", justifyContent:"center", padding:"0 60px", maxWidth:800 }}>
              <div style={{ font:"600 13px/1 'DM Sans'", letterSpacing:".26em", textTransform:"uppercase", color:"#e7cd8f", marginBottom:18 }}>Seven kitchens · one taste of home</div>
              <h1 style={{ margin:"0 0 20px", font:"800 62px/1.04 'Playfair Display'", color:"#fff", maxWidth:680 }}>
                Authentic South Indian, freshly made across Hyderabad
              </h1>
              <p style={{ margin:"0 0 32px", font:"400 18px/1.65 'DM Sans'", color:"#f0e6d8", maxWidth:540 }}>
                Tiffins, full meals, bakery &amp; banquets — order online, book catering, or stay with us.
              </p>
              <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
                <button onClick={go("menu")} style={{ display:"inline-flex", alignItems:"center", gap:9, background:"#c79a3a", color:"#2a1c06", font:"700 16px/1 'DM Sans'", padding:"18px 32px", borderRadius:36, border:"none", cursor:"pointer", boxShadow:"0 12px 28px rgba(199,154,58,.4)" }}>
                  🛒 Order Online
                </button>
                <button onClick={go("catering")} style={{ display:"inline-flex", alignItems:"center", gap:9, background:"rgba(255,255,255,.12)", color:"#fff", font:"600 16px/1 'DM Sans'", padding:"18px 30px", borderRadius:36, border:"1.5px solid rgba(255,255,255,.5)", cursor:"pointer" }}>
                  Book Catering
                </button>
              </div>
              <div style={{ marginTop:30, display:"flex", alignItems:"center", gap:20, font:"500 14px/1 'DM Sans'", color:"#ede2d2" }}>
                <span style={{ color:"#f0c860" }}>★★★★★ 4.6</span>
                <span style={{ opacity:.5 }}>|</span><span>12,000+ diners served</span>
                <span style={{ opacity:.5 }}>|</span><span>Veg &amp; Non-veg</span>
                <span style={{ opacity:.5 }}>|</span><span>Since 2022</span>
              </div>
            </div>
            {/* Sound toggle */}
            <button onClick={() => { setMuted(m => !m); if(videoRef.current) videoRef.current.muted = !muted; }}
              style={{ position:"absolute", bottom:24, right:28, background:"rgba(36,21,16,.75)", border:"1.5px solid rgba(255,255,255,.3)", color:"#fff", borderRadius:30, padding:"10px 18px", font:"600 13px/1 'DM Sans'", cursor:"pointer", backdropFilter:"blur(6px)", zIndex:10 }}>
              {muted ? "🔇 Sound off" : "🔊 Sound on"}
            </button>
          </div>

          {/* TRUST STRIP */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:28, flexWrap:"wrap", padding:"22px 40px", background:"#241510", color:"#cdbba4", font:"500 14px/1 'DM Sans'" }}>
            <span>Order us on</span>
            <span style={{ padding:"9px 22px", border:"1px solid #4a382c", borderRadius:30, color:"#fff", cursor:"pointer" }}>🛵 Swiggy</span>
            <span style={{ padding:"9px 22px", border:"1px solid #4a382c", borderRadius:30, color:"#fff", cursor:"pointer" }}>🍽️ Zomato</span>
            <span onClick={go("menu")} style={{ padding:"9px 22px", border:"1px solid #4a382c", borderRadius:30, color:"#fff", cursor:"pointer" }}>📦 Direct Delivery</span>
            <span style={{ opacity:.4 }}>•</span>
            <span style={{ color:"#e7cd8f" }}>⭐ Loved across Hyderabad since 2022</span>
          </div>

          {/* WHAT WE SERVE */}
          <div style={{ padding:"80px 40px 60px", background:"#fbf6ec" }}>
            <div style={{ textAlign:"center", marginBottom:48 }}>
              <div style={{ font:"600 12px/1 'DM Sans'", letterSpacing:".28em", textTransform:"uppercase", color:"#8a1f2b" }}>What we serve</div>
              <h2 style={{ margin:"14px 0 0", font:"700 46px/1.06 'Playfair Display'", color:"#2a201b" }}>From morning tiffins to grand banquets</h2>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:24, maxWidth:1180, margin:"0 auto" }}>
              {[
                { img:IMGS.tiffins,    title:"South Indian Tiffins",    desc:"Idli, dosa, vada & upma — fresh from 6 AM every day at all our branches.", link:"Order tiffins →",  target:"menu" as Screen },
                { img:IMGS.restaurant, title:"Restaurant & Meals",       desc:"North & South Indian meals, Hyderabadi biryani & rich curries.",             link:"See the menu →", target:"menu" as Screen },
                { img:IMGS.bakery,     title:"Sangam Bakes",             desc:"Custom cakes, pastries & fresh savouries — baked daily. Two outlets.",       link:"Order cakes →",  target:"branches" as Screen },
                { img:IMGS.arangam,    title:"Banquet & Catering",       desc:"Sangamam (600) · Arangam (300) · Magudam (300) halls. 20+ yrs experience.", link:"Enquire now →",  target:"catering" as Screen },
              ].map(item => (
                <div key={item.title} style={{ background:"#fff", border:"1px solid #ece2d2", borderRadius:20, overflow:"hidden", boxShadow:"0 14px 34px rgba(60,40,20,.07)", transition:"transform .2s ease, box-shadow .2s ease" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform="translateY(-4px)"; (e.currentTarget as HTMLDivElement).style.boxShadow="0 22px 44px rgba(60,40,20,.13)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform=""; (e.currentTarget as HTMLDivElement).style.boxShadow="0 14px 34px rgba(60,40,20,.07)"; }}>
                  <div style={{ position:"relative", height:180, background:"linear-gradient(135deg,#caa24a,#7a3018)", overflow:"hidden" }}>
                    <Img src={item.img} alt={item.title} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
                  </div>
                  <div style={{ padding:26 }}>
                    <div style={{ font:"700 20px/1.15 'Playfair Display'", color:"#2a201b" }}>{item.title}</div>
                    <p style={{ margin:"10px 0 16px", font:"400 14px/1.65 'DM Sans'", color:"#7a6e62" }}>{item.desc}</p>
                    <a onClick={go(item.target)} style={{ font:"600 13px/1 'DM Sans'", color:"#8a1f2b", cursor:"pointer" }}>{item.link}</a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SIGNATURE DISHES */}
          <div style={{ padding:"60px 40px 60px", background:"#fff" }}>
            <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", maxWidth:1180, margin:"0 auto 36px" }}>
              <div>
                <div style={{ font:"600 12px/1 'DM Sans'", letterSpacing:".28em", textTransform:"uppercase", color:"#8a1f2b" }}>Most loved</div>
                <h2 style={{ margin:"12px 0 0", font:"700 42px/1.05 'Playfair Display'", color:"#2a201b" }}>Signature dishes</h2>
              </div>
              <a onClick={go("menu")} style={{ font:"600 14px/1 'DM Sans'", color:"#8a1f2b", cursor:"pointer" }}>Full menu →</a>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:24, maxWidth:1180, margin:"0 auto" }}>
              {[
                { img:IMGS.tiffins,    label:"South Indian Tiffins", desc:"Idli, vada, dosa with fresh sambar & chutneys", veg:true,  price:"₹70",  bestseller:true },
                { img:IMGS.biryaniReal,label:"Hyderabadi Biryani",  desc:"Slow-cooked dum biryani, fragrant whole spices", veg:false, price:"₹240" },
                { img:IMGS.restaurant, label:"Veg Meals",            desc:"Rice, dal, 3 curries, papad & pickle", veg:true,  price:"₹149" },
                { img:IMGS.bakery,     label:"Bakes & Cakes",        desc:"Freshly baked pastries, cakes & brownies daily", veg:true,  price:"₹90" },
              ].map(dish => (
                <div key={dish.label} style={{ background:"#fbf6ec", border:"1px solid #ece2d2", borderRadius:18, overflow:"hidden", boxShadow:"0 10px 28px rgba(60,40,20,.06)" }}>
                  <div style={{ height:180, background:"linear-gradient(135deg,#caa24a,#7a3018)", overflow:"hidden", position:"relative" }}>
                    <Img src={dish.img} alt={dish.label} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
                  </div>
                  <div style={{ padding:18 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <span style={{ width:14, height:14, border:`1.5px solid ${dish.veg?"#1a8a3a":"#b3261e"}`, borderRadius:3, display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
                        <span style={{ width:6, height:6, borderRadius:"50%", background:dish.veg?"#1a8a3a":"#b3261e" }} />
                      </span>
                      <span style={{ font:"600 16px/1.2 'DM Sans'", color:"#2a201b" }}>{dish.label}</span>
                      {"bestseller" in dish && dish.bestseller && <span style={{ font:"600 9px/1 'DM Sans'", color:"#b88a2e", background:"#f7eecf", border:"1px solid #e8d6a4", borderRadius:5, padding:"4px 7px", letterSpacing:".06em" }}>BESTSELLER</span>}
                    </div>
                    <p style={{ margin:"6px 0 12px", font:"400 13px/1.5 'DM Sans'", color:"#9b8c78" }}>{dish.desc}</p>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <span style={{ font:"700 18px/1 'DM Sans'", color:"#2a201b" }}>{dish.price}</span>
                      <button onClick={() => setChatOpen(true)} style={{ background:"#fff", border:"1.5px solid #8a1f2b", color:"#8a1f2b", borderRadius:20, padding:"8px 16px", font:"600 13px/1 'DM Sans'", cursor:"pointer" }}>Add +</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* BRANCH FINDER */}
          <div style={{ padding:"64px 40px" }}>
            <div style={{ maxWidth:1180, margin:"0 auto", background:"#241510", borderRadius:28, overflow:"hidden", display:"grid", gridTemplateColumns:"1.1fr .9fr" }}>
              <div style={{ padding:"56px 56px", color:"#f3ece2" }}>
                <div style={{ font:"600 12px/1 'DM Sans'", letterSpacing:".24em", textTransform:"uppercase", color:"#e7cd8f", marginBottom:16 }}>Find your nearest Sangam</div>
                <h2 style={{ margin:"0 0 20px", font:"700 40px/1.07 'Playfair Display'" }}>Always one near you</h2>
                <div style={{ display:"flex", gap:11, marginBottom:26 }}>
                  <div style={{ flex:1, background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.2)", borderRadius:30, padding:"15px 20px", font:"500 14px/1 'DM Sans'", color:"#cbbfae" }}>📍 Enter your area or pincode…</div>
                  <button onClick={go("branches")} style={{ background:"#c79a3a", color:"#2a1c06", border:"none", borderRadius:30, padding:"0 26px", font:"700 14px/1 'DM Sans'", cursor:"pointer" }}>Find</button>
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:9 }}>
                  {BRANCHES.map(b => (
                    <span key={b.id} onClick={go("branches")} style={{ cursor:"pointer", font:"500 13px/1 'DM Sans'", color:"#efe7dc", background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.18)", borderRadius:24, padding:"9px 16px" }}>
                      {b.shortName}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ position:"relative", background:"linear-gradient(135deg,#3a241c,#231510)", overflow:"hidden" }}>
                <Img src={IMGS.peer1} alt="Sangam branch" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
                <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,rgba(36,21,16,.05),rgba(36,21,16,.55))" }} />
              </div>
            </div>
          </div>

          {/* CATEGORY STRIP — mirrors current site's 5-tile bar */}
          <div style={{ padding:"0 0 0" }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)" }}>
              {[
                { img:IMGS.bakery,     label:"Bakery" },
                { img:IMGS.restaurant, label:"Restaurant" },
                { img:IMGS.tiffins,    label:"Tiffins" },
                { img:IMGS.arangam,    label:"Banquet Hall" },
                { img:IMGS.room1,      label:"Rooms" },
              ].map(tile => (
                <div key={tile.label} onClick={tile.label==="Banquet Hall"?go("catering"):tile.label==="Rooms"?go("rooms"):go("menu")}
                  style={{ position:"relative", height:220, overflow:"hidden", cursor:"pointer", background:"#241510" }}>
                  <Img src={tile.img} alt={tile.label} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", transition:"transform .5s ease", filter:"brightness(.65)" }} />
                  <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,rgba(0,0,0,.1),rgba(0,0,0,.55))", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10 }}>
                    <div style={{ font:"700 18px/1 'Playfair Display'", color:"#fff", letterSpacing:".02em", textTransform:"uppercase" }}>{tile.label}</div>
                    <div style={{ width:36, height:2, background:"#c79a3a", borderRadius:2 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* GALLERY GRID */}
          <div style={{ padding:"72px 40px 64px" }}>
            <div style={{ maxWidth:1180, margin:"0 auto" }}>
              <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:28 }}>
                <div>
                  <div style={{ font:"600 12px/1 'DM Sans'", letterSpacing:".28em", textTransform:"uppercase", color:"#8a1f2b", marginBottom:10 }}>Our spaces</div>
                  <h2 style={{ margin:0, font:"700 40px/1.05 'Playfair Display'", color:"#2a201b" }}>See us inside</h2>
                </div>
                <a onClick={go("branches")} style={{ font:"600 14px/1 'DM Sans'", color:"#8a1f2b", cursor:"pointer" }}>All branches →</a>
              </div>
              {/* Masonry-style 3-column grid */}
              <div style={{ display:"grid", gridTemplateColumns:"1.3fr 1fr 1fr", gridTemplateRows:"220px 220px", gap:14 }}>
                {/* Big left tile spans 2 rows */}
                <div style={{ gridRow:"1 / 3", position:"relative", borderRadius:18, overflow:"hidden", background:"linear-gradient(135deg,#caa24a,#7a3018)" }}>
                  <Img src={IMGS.magudamWide} alt="Magudam Hall" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
                  <div style={{ position:"absolute", bottom:18, left:18, font:"600 14px/1 'DM Sans'", color:"#fff", background:"rgba(0,0,0,.5)", backdropFilter:"blur(4px)", padding:"8px 14px", borderRadius:20 }}>Magudam · Hayathnagar</div>
                </div>
                {[
                  { src:IMGS.peerzHall, label:"Peerzadiguda Hall" },
                  { src:IMGS.room1,     label:"Hotel Rooms" },
                  { src:IMGS.arangam,   label:"Arangam Hall" },
                  { src:IMGS.hayt1,     label:"Hayathnagar" },
                ].map(tile => (
                  <div key={tile.label} style={{ position:"relative", borderRadius:18, overflow:"hidden", background:"linear-gradient(135deg,#caa24a,#7a3018)" }}>
                    <Img src={tile.src} alt={tile.label} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
                    <div style={{ position:"absolute", bottom:14, left:14, font:"600 13px/1 'DM Sans'", color:"#fff", background:"rgba(0,0,0,.45)", backdropFilter:"blur(4px)", padding:"6px 12px", borderRadius:16 }}>{tile.label}</div>
                  </div>
                ))}
              </div>
              {/* Second row of smaller tiles */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:14, marginTop:14 }}>
                {[IMGS.peer1, IMGS.peer2, IMGS.malkapur1, IMGS.malkapur3, IMGS.room3, IMGS.room4].map((src,i) => (
                  <div key={i} style={{ position:"relative", paddingTop:"100%", borderRadius:14, overflow:"hidden", background:"linear-gradient(135deg,#caa24a,#7a3018)" }}>
                    <Img src={src} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CATERING PROMO */}
          <div style={{ padding:"0 40px 64px" }}>
            <div style={{ maxWidth:1180, margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 1fr", border:"1px solid #ece2d2", borderRadius:26, overflow:"hidden", boxShadow:"0 18px 40px rgba(60,40,20,.08)" }}>
              <div style={{ position:"relative", minHeight:340, background:"linear-gradient(135deg,#caa24a,#7a3018)", overflow:"hidden" }}>
                <Img src={IMGS.arangam} alt="Arangam Hall" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
              </div>
              <div style={{ padding:"52px 54px", background:"#fff" }}>
                <div style={{ font:"600 12px/1 'DM Sans'", letterSpacing:".24em", textTransform:"uppercase", color:"#8a1f2b" }}>Catering &amp; events</div>
                <h2 style={{ margin:"16px 0 16px", font:"700 36px/1.1 'Playfair Display'", color:"#2a201b" }}>Weddings, corporate &amp; house parties</h2>
                <p style={{ margin:"0 0 10px", font:"400 15px/1.7 'DM Sans'", color:"#7a6e62" }}>Four fully air-conditioned halls — <strong>Sangamam (600)</strong>, Arangam (300), Magudam (300) &amp; Hayathnagar (300).</p>
                <p style={{ margin:"0 0 28px", font:"400 15px/1.7 'DM Sans'", color:"#7a6e62" }}>Custom menus, transparent per-plate pricing, in-house catering. <strong>20+ years event experience.</strong></p>
                <div style={{ display:"flex", gap:13 }}>
                  <button onClick={go("catering")} style={{ background:"#8a1f2b", color:"#fff", border:"none", borderRadius:30, padding:"15px 26px", font:"600 14px/1 'DM Sans'", cursor:"pointer" }}>Plan an event</button>
                  <button onClick={() => setChatOpen(true)} style={{ background:"#fff", border:"1.5px solid #d9bfa0", color:"#8a1f2b", borderRadius:30, padding:"15px 24px", font:"600 14px/1 'DM Sans'", cursor:"pointer" }}>💬 Ask the concierge</button>
                </div>
              </div>
            </div>
          </div>

          {/* TESTIMONIALS — infinite auto-scroll */}
          <div style={{ padding:"72px 0 80px", background:"#241510" }}>
            <div style={{ textAlign:"center", marginBottom:48, padding:"0 40px" }}>
              <div style={{ font:"600 12px/1 'DM Sans'", letterSpacing:".28em", textTransform:"uppercase", color:"#e7cd8f" }}>Loved by Hyderabad</div>
              <h2 style={{ margin:"14px 0 8px", font:"700 42px/1.05 'Playfair Display'", color:"#fff" }}>What our guests say</h2>
              <p style={{ font:"400 16px/1 'DM Sans'", color:"#9b8c78", margin:0 }}>⭐⭐⭐⭐⭐ from all our branches across Hyderabad</p>
            </div>
            {/* Marquee — rendered twice for seamless loop */}
            <div className="marquee-wrap">
              <div className="marquee-track">
                {[...TESTIMONIALS, ...TESTIMONIALS].map((r, i) => (
                  <div key={i} style={{ flexShrink:0, width:380, background:"#2f1d16", border:"1px solid #4a382c", borderRadius:20, padding:"28px 30px" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                      <div style={{ color:"#e7cd8f", font:"600 18px/1 'DM Sans'" }}>★★★★★</div>
                      <div style={{ font:"600 11px/1 'DM Sans'", color:"#c79a3a", letterSpacing:".06em", textTransform:"uppercase", background:"rgba(199,154,58,.12)", borderRadius:20, padding:"5px 10px" }}>{r.branch}</div>
                    </div>
                    <p style={{ margin:"0 0 20px", font:"400 14.5px/1.75 'DM Sans'", color:"#e7dccd" }}>&ldquo;{r.text}&rdquo;</p>
                    <div style={{ borderTop:"1px solid #3d2a20", paddingTop:14, display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:34, height:34, borderRadius:"50%", background:"linear-gradient(135deg,#c79a3a,#8a1f2b)", display:"flex", alignItems:"center", justifyContent:"center", font:"700 14px/1 'Playfair Display'", color:"#fff", flexShrink:0 }}>
                        {r.author[0]}
                      </div>
                      <div>
                        <div style={{ font:"600 13px/1 'DM Sans'", color:"#c79a3a" }}>{r.author}</div>
                        <div style={{ font:"500 12px/1 'DM Sans'", color:"#9b8c78", marginTop:3 }}>{r.location}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MENU
      ══════════════════════════════════════════════════════════════ */}
      {screen === "menu" && (
        <div>
          <div style={{ padding:"48px 40px 28px", background:"#fff", borderBottom:"1px solid #ece2d2" }}>
            <div style={{ maxWidth:1180, margin:"0 auto" }}>
              <div style={{ font:"600 12px/1 'DM Sans'", letterSpacing:".24em", textTransform:"uppercase", color:"#8a1f2b" }}>Order online</div>
              <h1 style={{ margin:"12px 0 24px", font:"700 44px/1.05 'Playfair Display'", color:"#2a201b" }}>Menu &amp; Ordering</h1>
              <div style={{ display:"flex", flexWrap:"wrap", gap:14, alignItems:"center" }}>
                <div style={{ display:"flex", alignItems:"center", gap:9, background:"#fbf6ec", border:"1px solid #e9dcc8", borderRadius:30, padding:"11px 18px" }}>
                  <span style={{ font:"600 11px/1 'DM Sans'", color:"#9b8c78", letterSpacing:".04em" }}>BRANCH</span>
                  <span style={{ font:"600 14px/1 'DM Sans'", color:"#2a201b" }}>Peerzadiguda ▾</span>
                </div>
                <div style={{ display:"flex", background:"#fbf6ec", border:"1px solid #e9dcc8", borderRadius:30, padding:4 }}>
                  {["Delivery","Takeaway","Dine-in"].map((t,i) => (
                    <span key={t} style={{ background:i===0?"#8a1f2b":"transparent", color:i===0?"#fff":"#6f655b", borderRadius:24, padding:"9px 18px", font:"600 13px/1 'DM Sans'", cursor:"pointer" }}>{t}</span>
                  ))}
                </div>
                <div style={{ background:"#f9f3e9", border:"1px solid #e9dcc8", borderRadius:30, padding:"10px 18px", font:"500 13px/1 'DM Sans'", color:"#9b8c78" }}>🛵 Swiggy &nbsp;|&nbsp; 🍽️ Zomato</div>
              </div>
            </div>
          </div>

          <div style={{ maxWidth:1180, margin:"0 auto", display:"grid", gridTemplateColumns:"200px 1fr 320px", background:"#fbf6ec" }}>
            <div style={{ padding:"24px 14px", borderRight:"1px solid #ece2d2", background:"#fff" }}>
              {["Tiffins","Meals & Curries","Biryani","Bakery","Snacks & Chats","Beverages"].map((cat,i) => (
                <div key={cat} style={{ background:i===0?"#8a1f2b":"transparent", color:i===0?"#fff":"#4a3f36", borderRadius:12, padding:"13px 16px", font:"600 14px/1 'DM Sans'", marginBottom:6, cursor:"pointer" }}>{cat}</div>
              ))}
            </div>

            <div style={{ padding:"28px 30px" }}>
              <h3 style={{ margin:"0 0 6px", font:"700 26px/1 'Playfair Display'", color:"#2a201b" }}>Tiffins</h3>
              <p style={{ margin:"0 0 20px", font:"500 13px/1 'DM Sans'", color:"#9b8c78" }}>Served 6 AM – 11 AM daily at all branches</p>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {[
                  { img:IMGS.tiffins,    name:"Idli Vada Platter",  desc:"2 soft idlis + 2 crispy vadas with sambar & 3 chutneys", price:"₹80",  veg:true, bestseller:true },
                  { img:IMGS.tiffins,    name:"Ghee Masala Dosa",   desc:"Potato masala, roasted crisp in pure ghee, served with sambar", price:"₹110", veg:true },
                  { img:IMGS.tiffins,    name:"Medu Vada (2 pc)",   desc:"Crispy lentil fritters with fresh sambar & coconut chutney", price:"₹60",  veg:true },
                  { img:IMGS.restaurant, name:"Veg Meals",           desc:"Rice, rasam, sambar, 3 curries, pickle & papad",  price:"₹149", veg:true },
                  { img:IMGS.biryaniReal,name:"Mutton Biryani",      desc:"Slow-cooked dum biryani with tender mutton & whole spices", price:"₹280", veg:false },
                  { img:IMGS.tiffins,    name:"Puri Bhaji (3 pc)",   desc:"Fluffy puris with spiced potato bhaji & chutney", price:"₹80",  veg:true },
                ].map(item => (
                  <div key={item.name} style={{ display:"flex", gap:16, alignItems:"center", background:"#fff", border:"1px solid #ece2d2", borderRadius:16, padding:16, boxShadow:"0 6px 18px rgba(60,40,20,.05)" }}>
                    <div style={{ width:90, height:76, borderRadius:12, background:"linear-gradient(135deg,#caa24a,#7a3018)", overflow:"hidden", position:"relative", flexShrink:0 }}>
                      <Img src={item.img} alt={item.name} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                        <span style={{ width:13, height:13, border:`1.5px solid ${item.veg?"#1a8a3a":"#b3261e"}`, borderRadius:3, display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
                          <span style={{ width:5, height:5, borderRadius:"50%", background:item.veg?"#1a8a3a":"#b3261e" }} />
                        </span>
                        <span style={{ font:"600 16px/1.2 'DM Sans'", color:"#2a201b" }}>{item.name}</span>
                        {"bestseller" in item && item.bestseller && <span style={{ font:"600 9px/1 'DM Sans'", color:"#b88a2e", background:"#f7eecf", border:"1px solid #e8d6a4", borderRadius:5, padding:"3px 7px" }}>BESTSELLER</span>}
                      </div>
                      <p style={{ margin:"5px 0 8px", font:"400 13px/1.5 'DM Sans'", color:"#9b8c78" }}>{item.desc}</p>
                      <span style={{ font:"700 16px/1 'DM Sans'", color:"#2a201b" }}>{item.price}</span>
                    </div>
                    <button onClick={() => setChatOpen(true)} style={{ background:"#fff", border:"1.5px solid #8a1f2b", color:"#8a1f2b", borderRadius:22, padding:"10px 18px", font:"600 13px/1 'DM Sans'", cursor:"pointer", flexShrink:0 }}>Add +</button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding:"24px 22px" }}>
              <div style={{ position:"sticky", top:108, background:"#fff", border:"1px solid #ece2d2", borderRadius:18, padding:22, boxShadow:"0 12px 30px rgba(60,40,20,.07)" }}>
                <div style={{ font:"700 19px/1 'Playfair Display'", color:"#2a201b", marginBottom:18 }}>🛒 Your order</div>
                <div style={{ background:"#fbf6ec", borderRadius:12, padding:"18px 16px", textAlign:"center", color:"#9b8c78", font:"500 14px/1.5 'DM Sans'" }}>Add items to get started</div>
                <div style={{ height:1, background:"#ece2d2", margin:"18px 0" }} />
                <button onClick={() => setChatOpen(true)} style={{ width:"100%", background:"#8a1f2b", color:"#fff", border:"none", borderRadius:26, padding:14, font:"600 15px/1 'DM Sans'", cursor:"pointer", marginBottom:12 }}>Checkout →</button>
                <div style={{ textAlign:"center", font:"500 12px/1.5 'DM Sans'", color:"#9b8c78", marginBottom:12 }}>— or order via —</div>
                <div style={{ display:"flex", gap:10 }}>
                  <div style={{ flex:1, textAlign:"center", background:"#fff7f0", border:"1px solid #ffd4b0", borderRadius:12, padding:12, font:"600 13px/1 'DM Sans'", color:"#e07322", cursor:"pointer" }}>🛵 Swiggy</div>
                  <div style={{ flex:1, textAlign:"center", background:"#fff5f0", border:"1px solid #ffb8a0", borderRadius:12, padding:12, font:"600 13px/1 'DM Sans'", color:"#cb202d", cursor:"pointer" }}>🍽️ Zomato</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          BRANCHES
      ══════════════════════════════════════════════════════════════ */}
      {screen === "branches" && (
        <div>
          <div style={{ padding:"50px 40px 32px", background:"#fff", borderBottom:"1px solid #ece2d2" }}>
            <div style={{ maxWidth:1180, margin:"0 auto" }}>
              <div style={{ font:"600 12px/1 'DM Sans'", letterSpacing:".24em", textTransform:"uppercase", color:"#8a1f2b" }}>Our locations</div>
              <h1 style={{ margin:"12px 0 8px", font:"700 44px/1.05 'Playfair Display'", color:"#2a201b" }}>7 branches across Hyderabad &amp; Telangana</h1>
              <p style={{ margin:"0 0 24px", font:"400 15px/1.6 'DM Sans'", color:"#7a6e62" }}>Tiffins · Restaurant · Bakery · Hotel Rooms · Banquet Halls</p>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {branchTypes.map(t => (
                  <span key={t} onClick={() => setBranchFilter(t)} style={{ background:branchFilter===t?"#8a1f2b":"#fbf6ec", color:branchFilter===t?"#fff":"#4a3f36", border:branchFilter===t?"none":"1px solid #e9dcc8", borderRadius:24, padding:"10px 20px", font:"600 13px/1 'DM Sans'", cursor:"pointer" }}>{t}</span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ maxWidth:1180, margin:"0 auto", padding:"36px 40px 64px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:22 }}>
            {filteredBranches.map(b => (
              <div key={b.id} style={{ border:"1px solid #ece2d2", borderRadius:22, overflow:"hidden", background:"#fff", boxShadow:"0 12px 30px rgba(60,40,20,.06)" }}>
                <div style={{ position:"relative", height:180, background:"linear-gradient(135deg,#caa24a,#7a3018)", overflow:"hidden" }}>
                  <Img src={b.img} alt={b.name} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
                  <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,rgba(0,0,0,.0),rgba(0,0,0,.35))" }} />
                  <span style={{ position:"absolute", top:14, right:14, font:`600 9px/1 'DM Sans'`, color:b.badgeColor, background:b.badgeBg, border:`1px solid ${b.badgeBorder}`, borderRadius:6, padding:"5px 9px", letterSpacing:".06em" }}>{b.badge}</span>
                </div>
                <div style={{ padding:"22px 24px" }}>
                  <div style={{ font:"700 20px/1.2 'Playfair Display'", color:"#2a201b", marginBottom:4 }}>{b.name}</div>
                  <div style={{ font:"600 12px/1 'DM Sans'", color:"#8a6a16", marginBottom:10 }}>{b.tagline}</div>
                  <p style={{ margin:"0 0 8px", font:"400 13px/1.6 'DM Sans'", color:"#7a6e62" }}>📍 {b.address}</p>
                  <div style={{ display:"flex", gap:16, font:"500 13px/1.5 'DM Sans'", color:"#6f655b", marginBottom:16 }}>
                    <span>🕒 {b.hours}</span>
                    <span>⭐ {b.rating}</span>
                    <a href={`tel:${b.phone.replace(/\s/g,"")}`} style={{ color:"#8a1f2b", textDecoration:"none", fontWeight:600 }}>📞 {b.phone}</a>
                  </div>
                  <div style={{ display:"flex", gap:9 }}>
                    <button onClick={go("menu")} style={{ background:"#8a1f2b", color:"#fff", border:"none", borderRadius:20, padding:"10px 18px", font:"600 13px/1 'DM Sans'", cursor:"pointer" }}>Order</button>
                    <a href={b.mapsLink} target="_blank" rel="noopener noreferrer" style={{ background:"#fbf6ec", border:"1px solid #e9dcc8", color:"#4a3f36", borderRadius:20, padding:"10px 18px", font:"600 13px/1 'DM Sans'", textDecoration:"none", cursor:"pointer" }}>📍 Directions</a>
                    <a href={`tel:${b.phone.replace(/\s/g,"")}`} style={{ background:"#fbf6ec", border:"1px solid #e9dcc8", color:"#4a3f36", borderRadius:20, padding:"10px 18px", font:"600 13px/1 'DM Sans'", textDecoration:"none" }}>Call</a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          CATERING
      ══════════════════════════════════════════════════════════════ */}
      {screen === "catering" && (
        <div>
          <div style={{ position:"relative", height:360, background:"linear-gradient(135deg,#caa24a,#7a3018)", overflow:"hidden" }}>
            <Img src={IMGS.arangam} alt="Banquet Hall" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(100deg,rgba(20,10,8,.9),rgba(20,10,8,.3))" }} />
            <div style={{ position:"relative", height:"100%", display:"flex", flexDirection:"column", justifyContent:"center", padding:"0 60px", maxWidth:700 }}>
              <div style={{ font:"600 12px/1 'DM Sans'", letterSpacing:".24em", textTransform:"uppercase", color:"#e7cd8f", marginBottom:14 }}>Catering &amp; events</div>
              <h1 style={{ margin:"0 0 14px", font:"800 50px/1.05 'Playfair Display'", color:"#fff" }}>Every occasion, a grand celebration</h1>
              <p style={{ margin:0, font:"400 17px/1.65 'DM Sans'", color:"#f0e6d8" }}>Weddings · receptions · corporate · house parties · pure-veg menus. <strong style={{ color:"#e7cd8f" }}>20+ years experience.</strong></p>
            </div>
          </div>

          {/* HALLS */}
          <div style={{ maxWidth:1180, margin:"0 auto", padding:"60px 40px 20px" }}>
            <div style={{ font:"600 12px/1 'DM Sans'", letterSpacing:".24em", textTransform:"uppercase", color:"#8a1f2b", marginBottom:12 }}>Our halls</div>
            <h2 style={{ margin:"0 0 8px", font:"700 36px/1.05 'Playfair Display'", color:"#2a201b" }}>Four air-conditioned banquet halls</h2>
            <p style={{ margin:"0 0 32px", font:"400 15px/1.6 'DM Sans'", color:"#7a6e62" }}>Peerzadiguda (HQ) features our largest halls. Hayathnagar hall for smaller events.</p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:20 }}>
              {[
                { name:"Sangamam Hall", cap:600, loc:"Peerzadiguda", icon:"🏛️", highlight:true, desc:"Grand wedding & reception hall" },
                { name:"Arangam Hall", cap:300, loc:"Peerzadiguda", icon:"💍", highlight:false, desc:"Elegant banquet & engagement hall" },
                { name:"Magudam Hall", cap:300, loc:"Peerzadiguda", icon:"🎪", highlight:false, desc:"Corporate & social events" },
                { name:"Hayathnagar Hall", cap:300, loc:"Hayathnagar", icon:"🎉", highlight:false, desc:"Intimate celebrations & functions" },
              ].map(h => (
                <div key={h.name} style={{ border:h.highlight?"2px solid #8a1f2b":"1px solid #ece2d2", borderRadius:18, padding:24, background:"#fff", boxShadow:h.highlight?"0 18px 40px rgba(138,31,43,.12)":"0 8px 22px rgba(60,40,20,.05)", position:"relative" }}>
                  {h.highlight && <span style={{ position:"absolute", top:-12, left:20, background:"#8a1f2b", color:"#fff", font:"600 9px/1 'DM Sans'", padding:"5px 11px", borderRadius:6, letterSpacing:".06em" }}>LARGEST</span>}
                  <div style={{ fontSize:36, marginBottom:12 }}>{h.icon}</div>
                  <div style={{ font:"700 18px/1.15 'Playfair Display'", color:"#2a201b", marginBottom:4 }}>{h.name}</div>
                  <div style={{ font:"400 13px/1.5 'DM Sans'", color:"#9b8c78", marginBottom:12 }}>{h.desc}</div>
                  <div style={{ font:"800 32px/1 'DM Sans'", color:"#8a1f2b" }}>{h.cap}</div>
                  <div style={{ font:"500 12px/1 'DM Sans'", color:"#9b8c78", marginBottom:16 }}>capacity · {h.loc}</div>
                  <button onClick={() => setChatOpen(true)} style={{ width:"100%", background:"#fff", border:"1.5px solid #8a1f2b", color:"#8a1f2b", borderRadius:20, padding:10, font:"600 13px/1 'DM Sans'", cursor:"pointer" }}>Enquire</button>
                </div>
              ))}
            </div>
          </div>

          {/* PACKAGES */}
          <div style={{ maxWidth:1180, margin:"0 auto", padding:"52px 40px 20px" }}>
            <h2 style={{ margin:"0 0 6px", font:"700 36px/1.05 'Playfair Display'", color:"#2a201b" }}>Catering packages</h2>
            <p style={{ margin:"0 0 32px", font:"400 15px/1.6 'DM Sans'", color:"#7a6e62" }}>Per-plate pricing, fully customisable menus — veg &amp; non-veg.</p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:24 }}>
              {[
                { name:"Silver", price:"₹399", note:"/plate", desc:"2 starters · 4 mains · 2 sweets · rice &amp; breads · chilled beverages", popular:false, minGuests:"50+" },
                { name:"Gold", price:"₹649", note:"/plate", desc:"4 starters · 6 mains · live counter · 3 sweets · welcome drinks &amp; juice", popular:true, minGuests:"100+" },
                { name:"Platinum", price:"₹999", note:"/plate", desc:"Full wedding spread · multi-cuisine · 2 live counters · dessert bar · mocktails", popular:false, minGuests:"200+" },
              ].map(pkg => (
                <div key={pkg.name} style={{ border:pkg.popular?"2.5px solid #8a1f2b":"1px solid #ece2d2", borderRadius:22, padding:32, background:"#fff", position:"relative", boxShadow:pkg.popular?"0 22px 48px rgba(138,31,43,.16)":"0 12px 30px rgba(60,40,20,.06)" }}>
                  {pkg.popular && <span style={{ position:"absolute", top:-13, left:30, background:"#8a1f2b", color:"#fff", font:"600 9px/1 'DM Sans'", letterSpacing:".1em", padding:"5px 11px", borderRadius:6 }}>MOST POPULAR</span>}
                  <div style={{ font:"700 24px/1.1 'Playfair Display'", color:"#2a201b", marginBottom:10 }}>{pkg.name}</div>
                  <div style={{ display:"flex", alignItems:"baseline", gap:4, marginBottom:6 }}>
                    <span style={{ font:"800 36px/1 'DM Sans'", color:"#8a1f2b" }}>{pkg.price}</span>
                    <span style={{ font:"500 13px/1 'DM Sans'", color:"#9b8c78" }}>{pkg.note}</span>
                  </div>
                  <div style={{ font:"500 12px/1 'DM Sans'", color:"#c79a3a", marginBottom:16 }}>Min. {pkg.minGuests} guests</div>
                  <p style={{ margin:"0 0 22px", font:"400 14px/1.8 'DM Sans'", color:"#6f655b" }} dangerouslySetInnerHTML={{ __html: pkg.desc }} />
                  <button onClick={() => setChatOpen(true)} style={{ width:"100%", background:pkg.popular?"#8a1f2b":"#fff", border:pkg.popular?"none":"1.5px solid #8a1f2b", color:pkg.popular?"#fff":"#8a1f2b", borderRadius:26, padding:14, font:"600 14px/1 'DM Sans'", cursor:"pointer" }}>Enquire</button>
                </div>
              ))}
            </div>
          </div>

          {/* QUOTE FORM + HALL PHOTO */}
          <div style={{ maxWidth:1180, margin:"0 auto", padding:"48px 40px 64px", display:"grid", gridTemplateColumns:"1.15fr .85fr", gap:28 }}>
            <div style={{ border:"1px solid #ece2d2", borderRadius:22, padding:34, background:"#fff", boxShadow:"0 12px 30px rgba(60,40,20,.06)" }}>
              <h3 style={{ margin:"0 0 6px", font:"700 26px/1.1 'Playfair Display'", color:"#2a201b" }}>Get a catering quote</h3>
              <p style={{ margin:"0 0 24px", font:"400 13px/1.6 'DM Sans'", color:"#9b8c78" }}>Fill in the basics and we'll call you within 2 hours.</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                {[["Event type","Wedding ▾"],["Guests","250"],["Date","📅 Pick date"],["Hall","Sangamam ▾"]].map(([label, placeholder]) => (
                  <div key={label}>
                    <label style={{ font:"600 11px/1 'DM Sans'", color:"#9b8c78", textTransform:"uppercase", letterSpacing:".06em" }}>{label}</label>
                    <div style={{ marginTop:7, background:"#fbf6ec", border:"1px solid #e9dcc8", borderRadius:12, padding:13, font:"500 14px/1 'DM Sans'", color:"#9b8c78" }}>{placeholder}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:14 }}>
                <label style={{ font:"600 11px/1 'DM Sans'", color:"#9b8c78", textTransform:"uppercase", letterSpacing:".06em" }}>Phone / WhatsApp</label>
                <div style={{ marginTop:7, background:"#fbf6ec", border:"1px solid #e9dcc8", borderRadius:12, padding:13, font:"500 14px/1 'DM Sans'", color:"#9b8c78" }}>+91 …</div>
              </div>
              <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:22 }}>
                <button style={{ background:"#8a1f2b", color:"#fff", border:"none", borderRadius:26, padding:"14px 28px", font:"600 14px/1 'DM Sans'", cursor:"pointer" }}>Request quote</button>
                <button onClick={() => setChatOpen(true)} style={{ background:"#fff", border:"1.5px solid #d9bfa0", color:"#8a1f2b", borderRadius:26, padding:"14px 24px", font:"600 14px/1 'DM Sans'", cursor:"pointer" }}>💬 Plan with concierge</button>
              </div>
            </div>
            <div style={{ border:"1px solid #ece2d2", borderRadius:22, overflow:"hidden", background:"#fff", boxShadow:"0 12px 30px rgba(60,40,20,.06)" }}>
              <div style={{ position:"relative", height:200, background:"linear-gradient(135deg,#caa24a,#7a3018)", overflow:"hidden" }}>
                <Img src={IMGS.arangam} alt="Arangam Hall" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
              </div>
              <div style={{ padding:24 }}>
                <div style={{ font:"700 20px/1.1 'Playfair Display'", color:"#2a201b", marginBottom:12 }}>Sangamam Hall · Peerzadiguda</div>
                <div style={{ font:"500 13px/2.1 'DM Sans'", color:"#6f655b" }}>
                  👥 600 guests · ❄️ Fully air-conditioned<br />
                  💍 Bridal room · 🅿️ Ample parking<br />
                  🍽️ In-house catering · 🎤 Stage &amp; AV<br />
                  📞 +91 90638 44021
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          ROOMS
      ══════════════════════════════════════════════════════════════ */}
      {screen === "rooms" && (
        <div>
          <div style={{ padding:"50px 40px 32px", background:"#fff", borderBottom:"1px solid #ece2d2" }}>
            <div style={{ maxWidth:1180, margin:"0 auto", display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:24, flexWrap:"wrap" }}>
              <div>
                <div style={{ font:"600 12px/1 'DM Sans'", letterSpacing:".24em", textTransform:"uppercase", color:"#8a1f2b" }}>Stay with us · Peerzadiguda</div>
                <h1 style={{ margin:"12px 0 6px", font:"700 44px/1.05 'Playfair Display'", color:"#2a201b" }}>Comfortable, budget-friendly rooms</h1>
                <p style={{ margin:0, font:"400 15px/1.6 'DM Sans'", color:"#7a6e62" }}>Located at our Peerzadiguda HQ — free WiFi, AC, 24/7 room service, attached restaurant.</p>
              </div>
              <a href="tel:+919063844021" style={{ display:"inline-flex", alignItems:"center", gap:10, background:"#8a1f2b", color:"#fff", font:"600 14px/1 'DM Sans'", padding:"14px 24px", borderRadius:30, textDecoration:"none" }}>📞 Call to book</a>
            </div>
          </div>

          <div style={{ maxWidth:1180, margin:"0 auto", padding:"36px 40px 64px" }}>
            <div style={{ background:"linear-gradient(135deg,#fff8e8,#faecd2)", border:"1px solid #e8d6a4", borderRadius:16, padding:"18px 24px", marginBottom:32, display:"flex", alignItems:"center", gap:16 }}>
              <span style={{ fontSize:28 }}>📞</span>
              <div>
                <div style={{ font:"600 15px/1.2 'DM Sans'", color:"#6a4a10" }}>Rooms available exclusively at Peerzadiguda</div>
                <div style={{ font:"400 13px/1.5 'DM Sans'", color:"#8a6a30", marginTop:4 }}>Pricing on request — call <strong>+91 90638 44021</strong> or <strong>+91 90638 44022</strong> to check availability &amp; rates.</div>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
              {[
                { title:"Single Room", desc:"Ideal for solo travellers & business guests", img:IMGS.room1, amenities:["📶 Free WiFi","❄️ AC","🛎️ Room service","🧺 Laundry","🍛 Restaurant access"] },
                { title:"Double Room", desc:"Spacious room for couples & families", img:IMGS.room2, amenities:["📶 Free WiFi","❄️ AC","🛏️ Double bed","🧺 Laundry","🍛 Restaurant access"] },
                { title:"Deluxe Room", desc:"Premium comfort with enhanced amenities", img:IMGS.room3, amenities:["📶 Free WiFi","❄️ AC","🛏️ King bed","🍳 Breakfast included","🛎️ Priority service"] },
              ].map(room => (
                <div key={room.title} style={{ border:"1px solid #ece2d2", borderRadius:22, overflow:"hidden", background:"#fff", boxShadow:"0 12px 30px rgba(60,40,20,.06)" }}>
                  <div style={{ position:"relative", height:220, background:"linear-gradient(135deg,#caa24a,#7a3018)", overflow:"hidden" }}>
                    <Img src={room.img} alt={room.title} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
                  </div>
                  <div style={{ padding:26 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                      <span style={{ font:"700 22px/1.1 'Playfair Display'", color:"#2a201b" }}>{room.title}</span>
                      <span style={{ font:"700 15px/1 'DM Sans'", color:"#8a1f2b", background:"#fdf0f2", border:"1px solid #f0c8cc", borderRadius:8, padding:"6px 12px" }}>Price on request</span>
                    </div>
                    <p style={{ margin:"0 0 14px", font:"400 14px/1.5 'DM Sans'", color:"#7a6e62" }}>{room.desc}</p>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:18 }}>
                      {room.amenities.map(a => <span key={a} style={{ font:"500 12px/1 'DM Sans'", color:"#4a3f36", background:"#fbf6ec", border:"1px solid #e9dcc8", borderRadius:8, padding:"6px 10px" }}>{a}</span>)}
                    </div>
                    <a href="tel:+919063844021" style={{ display:"block", width:"100%", background:"#8a1f2b", color:"#fff", border:"none", borderRadius:26, padding:13, font:"600 14px/1 'DM Sans'", cursor:"pointer", textAlign:"center", textDecoration:"none", boxSizing:"border-box" }}>📞 Enquire &amp; Book</a>
                  </div>
                </div>
              ))}

              {/* Map/nearby card */}
              <div style={{ border:"1px solid #ece2d2", borderRadius:22, padding:28, background:"linear-gradient(135deg,#241510,#3a1a0e)", color:"#f3ece2" }}>
                <div style={{ font:"700 20px/1.1 'Playfair Display'", marginBottom:8 }}>📍 Location &amp; nearby</div>
                <div style={{ font:"400 14px/1.7 'DM Sans'", color:"#cdbba4", marginBottom:16 }}>
                  Parvathapur Rd, Peerzadiguda, Hyderabad – 500098<br />
                  Conveniently located near major landmarks.
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:22 }}>
                  {["🏛️ Mini Shilparamam Park","🛍️ DSL Mall","🌊 Peerzadiguda Lakefront Park","🦕 Dinosaur Park","🎬 Ramoji Film City (25 km)"].map(l => (
                    <div key={l} style={{ font:"500 13px/1 'DM Sans'", color:"#e7dccd" }}>{l}</div>
                  ))}
                </div>
                <a href="https://maps.google.com/?q=Sangam+Hotels+Peerzadiguda+Hyderabad" target="_blank" rel="noopener noreferrer" style={{ display:"inline-block", background:"#c79a3a", color:"#2a1c06", font:"600 13px/1 'DM Sans'", padding:"11px 20px", borderRadius:20, textDecoration:"none" }}>Get directions →</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          ABOUT
      ══════════════════════════════════════════════════════════════ */}
      {screen === "about" && (
        <div>
          <div style={{ maxWidth:1180, margin:"0 auto", padding:"70px 40px 60px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:52, alignItems:"center" }}>
            <div>
              <div style={{ font:"600 12px/1 'DM Sans'", letterSpacing:".24em", textTransform:"uppercase", color:"#8a1f2b", marginBottom:14 }}>Our story</div>
              <h1 style={{ margin:"0 0 20px", font:"800 46px/1.06 'Playfair Display'", color:"#2a201b" }}>Hospitality from the heart, since 2022</h1>
              <p style={{ margin:"0 0 14px", font:"400 15px/1.75 'DM Sans'", color:"#6f655b" }}>
                Sangam Hotels was founded by <strong>V. Chandrashekar Reddy</strong> (Managing Director) and <strong>V. Akhil Reddy</strong>. Their hospitality journey began in 2008, inspired by a mentor who rose from humble beginnings to become a world-traveling chef.
              </p>
              <p style={{ margin:"0 0 14px", font:"400 15px/1.75 'DM Sans'", color:"#6f655b" }}>
                After gaining experience with top organizations and operating their first hotel in the United States, V. Chandrashekar Reddy returned to India in 2022 and opened the first Sangam Hotel in Laxmareddy Palem, Hyderabad.
              </p>
              <p style={{ margin:"0 0 24px", font:"400 15px/1.75 'DM Sans'", color:"#6f655b" }}>
                Today, Sangam Hotels spans <strong>7 locations</strong> across Hyderabad and Telangana — serving fresh South Indian tiffins, hearty meals, celebration cakes, grand banquets and comfortable stays.
              </p>
              <div style={{ display:"flex", gap:40, marginTop:8 }}>
                {[["2022","Founded"],["7","Branches"],["12k+","Diners"],["20+","Yrs event exp."]].map(([num, label]) => (
                  <div key={label}>
                    <div style={{ font:"800 32px/1 'Playfair Display'", color:"#8a1f2b" }}>{num}</div>
                    <div style={{ font:"600 10px/1.4 'DM Sans'", color:"#9b8c78", textTransform:"uppercase", letterSpacing:".06em", marginTop:4 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ position:"relative", height:380, borderRadius:24, background:"linear-gradient(135deg,#caa24a,#7a3018)", overflow:"hidden" }}>
              <Img src={IMGS.heroFallback} alt="Sangam Hotels" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
            </div>
          </div>

          <div style={{ background:"#241510", padding:"64px 40px" }}>
            <div style={{ maxWidth:1180, margin:"0 auto" }}>
              <h2 style={{ margin:"0 0 36px", font:"700 34px/1.05 'Playfair Display'", color:"#fff", textAlign:"center" }}>What we stand for</h2>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:24 }}>
                {[
                  { icon:"🌿", title:"Fresh, daily", desc:"Every dish is prepared fresh every morning. We never compromise on quality or freshness." },
                  { icon:"🤝", title:"Warm hospitality", desc:"Family-first service across every branch. Attentive, courteous, and professional staff." },
                  { icon:"💰", title:"Honest value", desc:"Great food, comfortable rooms and event venues at fair, transparent prices." },
                ].map(v => (
                  <div key={v.title} style={{ background:"#2f1d16", border:"1px solid #4a382c", borderRadius:20, padding:32 }}>
                    <div style={{ fontSize:30, marginBottom:14 }}>{v.icon}</div>
                    <div style={{ margin:"0 0 10px", font:"700 20px/1.1 'Playfair Display'", color:"#fff" }}>{v.title}</div>
                    <p style={{ margin:0, font:"400 14px/1.7 'DM Sans'", color:"#cbbfae" }}>{v.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Testimonials on About page — same marquee */}
          <div style={{ padding:"60px 0 70px", background:"#fbf6ec" }}>
            <h2 style={{ margin:"0 0 36px", font:"700 36px/1.05 'Playfair Display'", color:"#2a201b", textAlign:"center" }}>What our guests say</h2>
            <div className="marquee-wrap" style={{ "--before-bg":"linear-gradient(to right,#fbf6ec,transparent)", "--after-bg":"linear-gradient(to left,#fbf6ec,transparent)" } as React.CSSProperties}>
              <style>{`.marquee-wrap::before{background:linear-gradient(to right,#fbf6ec,transparent)}.marquee-wrap::after{background:linear-gradient(to left,#fbf6ec,transparent)}`}</style>
              <div className="marquee-track">
                {[...TESTIMONIALS, ...TESTIMONIALS].map((r,i) => (
                  <div key={i} style={{ flexShrink:0, width:360, border:"1px solid #ece2d2", borderRadius:18, padding:"26px 28px", background:"#fff", boxShadow:"0 8px 24px rgba(60,40,20,.06)" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                      <div style={{ color:"#e7a010", font:"600 16px/1 'DM Sans'" }}>★★★★★</div>
                      <div style={{ font:"600 11px/1 'DM Sans'", color:"#8a1f2b", letterSpacing:".04em", textTransform:"uppercase", background:"rgba(138,31,43,.07)", borderRadius:16, padding:"5px 10px" }}>{r.branch}</div>
                    </div>
                    <p style={{ margin:"0 0 16px", font:"400 14px/1.75 'DM Sans'", color:"#4a3f36" }}>&ldquo;{r.text}&rdquo;</p>
                    <div style={{ display:"flex", alignItems:"center", gap:9, borderTop:"1px solid #f0e8d8", paddingTop:14 }}>
                      <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,#c79a3a,#8a1f2b)", display:"flex", alignItems:"center", justifyContent:"center", font:"700 13px/1 'Playfair Display'", color:"#fff", flexShrink:0 }}>{r.author[0]}</div>
                      <div>
                        <div style={{ font:"600 13px/1 'DM Sans'", color:"#8a1f2b" }}>{r.author}</div>
                        <div style={{ font:"500 12px/1 'DM Sans'", color:"#9b8c78", marginTop:3 }}>{r.location}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          CONTACT
      ══════════════════════════════════════════════════════════════ */}
      {screen === "contact" && (
        <div>
          <div style={{ padding:"50px 40px 32px", background:"#fff", borderBottom:"1px solid #ece2d2" }}>
            <div style={{ maxWidth:1180, margin:"0 auto" }}>
              <div style={{ font:"600 12px/1 'DM Sans'", letterSpacing:".24em", textTransform:"uppercase", color:"#8a1f2b" }}>Get in touch</div>
              <h1 style={{ margin:"12px 0 0", font:"700 44px/1.05 'Playfair Display'", color:"#2a201b" }}>Contact &amp; reservations</h1>
            </div>
          </div>

          <div style={{ maxWidth:1180, margin:"0 auto", padding:"36px 40px 64px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:30 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {/* All 7 branches pulled from BRANCHES array */}
              {BRANCHES.map(b => {
                const typeIcon = b.type.includes("Bakes") ? "🎂"
                  : b.type.includes("Rooms") ? "🏨"
                  : b.type.includes("Banquet") ? "🎉"
                  : b.type.includes("Restaurant") ? "🍛"
                  : "☕";
                return (
                  <div key={b.id} style={{ border:"1px solid #ece2d2", borderRadius:16, padding:"18px 20px", background:"#fff", boxShadow:"0 4px 14px rgba(60,40,20,.04)" }}>
                    <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                      <span style={{ fontSize:20, flexShrink:0, marginTop:2 }}>{typeIcon}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                          <span style={{ font:"600 15px/1.2 'DM Sans'", color:"#2a201b" }}>{b.name}</span>
                          <span style={{ font:"600 9px/1 'DM Sans'", color:b.badgeColor, background:b.badgeBg, border:`1px solid ${b.badgeBorder}`, borderRadius:5, padding:"3px 7px", letterSpacing:".04em" }}>{b.badge}</span>
                        </div>
                        <div style={{ font:"500 11px/1 'DM Sans'", color:"#8a6a16", marginTop:3 }}>{b.tagline}</div>
                        <div style={{ marginTop:7, font:"600 13px/1.8 'DM Sans'", color:"#4a3f36" }}>
                          {b.phone}{"phone2" in b && b.phone2 ? `  |  ${b.phone2}` : ""}
                        </div>
                        <div style={{ font:"400 12px/1.5 'DM Sans'", color:"#9b8c78" }}>{b.address}</div>
                        <div style={{ marginTop:8, display:"flex", gap:8 }}>
                          <a href={`tel:${b.phone.replace(/\s/g,"")}`} style={{ font:"600 11px/1 'DM Sans'", color:"#8a1f2b", border:"1px solid #e0c5c8", borderRadius:10, padding:"6px 11px", textDecoration:"none", background:"#fdf5f5" }}>Call</a>
                          <a href={b.mapsLink} target="_blank" rel="noopener noreferrer" style={{ font:"600 11px/1 'DM Sans'", color:"#1a6a3a", border:"1px solid #bfe2c8", borderRadius:10, padding:"6px 11px", textDecoration:"none", background:"#f2fbf4" }}>Directions →</a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Social links */}
              <div style={{ border:"1px solid #ece2d2", borderRadius:16, padding:"20px 22px", background:"#fff" }}>
                <div style={{ font:"600 13px/1 'DM Sans'", color:"#2a201b", marginBottom:14 }}>Follow us</div>
                <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                  {[
                    { label:"Facebook", url:"https://www.facebook.com/profile.php?id=61576888675789" },
                    { label:"Instagram", url:"https://www.instagram.com/sangamhotelpeerzadiguda/" },
                    { label:"YouTube", url:"https://www.youtube.com/@sangamhotelshyderabad" },
                    { label:"WhatsApp", url:"https://wa.me/qr/2AWL7MVBOJPEH1" },
                    { label:"Twitter / X", url:"https://x.com/sangamhotelshyd" },
                  ].map(s => (
                    <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" style={{ background:"#fbf6ec", border:"1px solid #e9dcc8", color:"#4a3f36", borderRadius:12, padding:"10px 14px", font:"600 12px/1 'DM Sans'", textDecoration:"none" }}>{s.label}</a>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ border:"1px solid #ece2d2", borderRadius:22, padding:32, background:"#fff", boxShadow:"0 12px 30px rgba(60,40,20,.06)" }}>
              <h3 style={{ margin:"0 0 6px", font:"700 24px/1.1 'Playfair Display'", color:"#2a201b" }}>Send a message</h3>
              <p style={{ margin:"0 0 22px", font:"400 13px/1.5 'DM Sans'", color:"#9b8c78" }}>We'll respond within a few hours.</p>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {[["Your name","text"],["Phone / WhatsApp","tel"],["Email","email"]].map(([ph, type]) => (
                  <input key={ph} type={type} placeholder={ph} style={{ background:"#fbf6ec", border:"1px solid #e9dcc8", borderRadius:12, padding:"14px 16px", font:"500 14px/1 'DM Sans'", color:"#2a201b", outline:"none" }} />
                ))}
                <select style={{ background:"#fbf6ec", border:"1px solid #e9dcc8", borderRadius:12, padding:"14px 16px", font:"500 14px/1 'DM Sans'", color:"#4a3f36", outline:"none" }}>
                  <option value="">Select a branch…</option>
                  {BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  <option value="catering">Catering / Events</option>
                  <option value="general">General Enquiry</option>
                </select>
                <textarea rows={4} placeholder="Your message…" style={{ background:"#fbf6ec", border:"1px solid #e9dcc8", borderRadius:12, padding:"14px 16px", font:"500 14px/1.5 'DM Sans'", color:"#2a201b", outline:"none", resize:"vertical" }} />
                <button style={{ background:"#8a1f2b", color:"#fff", border:"none", borderRadius:26, padding:15, font:"600 15px/1 'DM Sans'", cursor:"pointer" }}>Send message</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <div style={{ background:"#1c100c", color:"#cdbba4", padding:"56px 40px 28px" }}>
        <div style={{ maxWidth:1180, margin:"0 auto", display:"grid", gridTemplateColumns:"1.5fr 1fr 1.2fr 1fr", gap:36 }}>
          <div>
            <Img src={IMGS.logo} alt="Sangam Hotels" style={{ height:42, width:"auto", opacity:.9, marginBottom:14 }} />
            <div style={{ font:"600 8px/1.4 'DM Sans'", letterSpacing:".26em", color:"#c79a3a", marginBottom:14, textTransform:"uppercase" }}>Hyderabad · Since 2022</div>
            <p style={{ margin:"0 0 18px", font:"400 13.5px/1.7 'DM Sans'", color:"#a99c8c", maxWidth:290 }}>
              Fresh South Indian tiffins, meals, bakery &amp; banquets across 7 locations in Hyderabad &amp; Telangana.
            </p>
            <div style={{ display:"flex", gap:9 }}>
              {[
                { label:"f", url:"https://www.facebook.com/profile.php?id=61576888675789" },
                { label:"◎", url:"https://www.instagram.com/sangamhotelpeerzadiguda/" },
                { label:"▶", url:"https://www.youtube.com/@sangamhotelshyderabad" },
                { label:"💬", url:"https://wa.me/qr/2AWL7MVBOJPEH1" },
              ].map(s => (
                <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" style={{ width:36, height:36, borderRadius:9, background:"rgba(255,255,255,.08)", display:"flex", alignItems:"center", justifyContent:"center", font:"600 14px/1 'DM Sans'", color:"#cdbba4", textDecoration:"none" }}>{s.label}</a>
              ))}
            </div>
          </div>
          <div>
            <div style={{ font:"600 11px/1 'DM Sans'", letterSpacing:".1em", textTransform:"uppercase", color:"#fff", marginBottom:16 }}>Explore</div>
            <div style={{ display:"flex", flexDirection:"column", gap:12, font:"500 13.5px/1 'DM Sans'" }}>
              {(["menu","branches","catering","rooms","about","contact"] as Screen[]).map(s => (
                <a key={s} onClick={go(s)} style={{ color:"#a99c8c", cursor:"pointer" }}>{s.charAt(0).toUpperCase()+s.slice(1)}</a>
              ))}
            </div>
          </div>
          <div>
            <div style={{ font:"600 11px/1 'DM Sans'", letterSpacing:".1em", textTransform:"uppercase", color:"#fff", marginBottom:16 }}>Branches</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10, font:"500 13px/1.4 'DM Sans'", color:"#a99c8c" }}>
              {BRANCHES.map(b => <span key={b.id}>{b.name}</span>)}
            </div>
          </div>
          <div>
            <div style={{ font:"600 11px/1 'DM Sans'", letterSpacing:".1em", textTransform:"uppercase", color:"#fff", marginBottom:16 }}>Contact</div>
            <div style={{ font:"500 13px/2.1 'DM Sans'", color:"#a99c8c" }}>
              <a href="tel:+919063844021" style={{ color:"#a99c8c", textDecoration:"none" }}>+91 90638 44021</a><br />
              <a href="tel:+919063844022" style={{ color:"#a99c8c", textDecoration:"none" }}>+91 90638 44022</a><br />
              <a href="tel:+917383838166" style={{ color:"#a99c8c", textDecoration:"none" }}>+91 73838 38166</a><br />
              <a href="mailto:info@sangamhotelshyderabad.com" style={{ color:"#a99c8c", textDecoration:"none" }}>info@sangamhotels<br />hyderabad.com</a>
            </div>
            <a href="https://wa.me/qr/2AWL7MVBOJPEH1" target="_blank" rel="noopener noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:7, marginTop:16, background:"#1a8a3a", color:"#fff", font:"600 12px/1 'DM Sans'", padding:"10px 16px", borderRadius:20, textDecoration:"none" }}>
              💬 WhatsApp us
            </a>
          </div>
        </div>
        <div style={{ maxWidth:1180, margin:"28px auto 0", paddingTop:18, borderTop:"1px solid #3a281f", font:"500 12px/1.5 'DM Sans'", color:"#8a7a6c", display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
          <span>© {new Date().getFullYear()} Sangam Hotels Hyderabad · All rights reserved</span>
          <span>Privacy · Terms · <span style={{ color:"#8a7a6c" }}>Powered by <a href="https://restros.ai" target="_blank" rel="noopener noreferrer" style={{ color:"#c79a3a", fontWeight:600 }}>restros.ai</a></span></span>
        </div>
      </div>

      {/* ── FLOATING CHATBOT ──────────────────────────────────────── */}
      {chatOpen && (
        <div style={{ position:"fixed", right:28, bottom:100, zIndex:80, width:390, maxWidth:"calc(100vw - 40px)", borderRadius:24, overflow:"hidden", background:"#fff", border:"1px solid #d6c9b6", boxShadow:"0 28px 64px rgba(30,18,10,.36)" }}>
          <div style={{ background:"#241510", padding:"16px 20px", display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:"50%", background:"#c79a3a", display:"flex", alignItems:"center", justifyContent:"center", font:"700 17px/1 'Playfair Display'", color:"#241510" }}>S</div>
            <div style={{ flex:1 }}>
              <div style={{ font:"600 15px/1.1 'DM Sans'", color:"#fff" }}>Sangam Concierge</div>
              <div style={{ font:"500 11px/1.3 'DM Sans'", color:"#9fd9a0" }}>● online · replies instantly</div>
            </div>
            <button onClick={() => setChatOpen(false)} style={{ background:"rgba(255,255,255,.12)", border:"none", color:"#fff", width:30, height:30, borderRadius:9, cursor:"pointer", font:"600 15px/1 'DM Sans'" }}>✕</button>
          </div>
          <div style={{ padding:18, background:"#fbf6ec", display:"flex", flexDirection:"column", gap:11, maxHeight:300, overflowY:"auto" }}>
            <div style={{ alignSelf:"flex-start", maxWidth:"85%", background:"#fff", border:"1px solid #ece2d2", borderRadius:"15px 15px 15px 5px", padding:"11px 14px", font:"400 13.5px/1.55 'DM Sans'", color:"#3a352e" }}>
              Namaste! 🙏 I can help you order food, plan catering, find a branch or book a room. What would you like?
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {[
                { label:"🛒 Order food", s:"menu" as Screen },
                { label:"🎉 Catering", s:"catering" as Screen },
                { label:"📍 Branches", s:"branches" as Screen },
                { label:"🏨 Rooms", s:"rooms" as Screen },
              ].map(q => (
                <span key={q.label} onClick={() => { setScreen(q.s); setChatOpen(false); }} style={{ cursor:"pointer", background:"#fff", border:"1px solid #d9bfa0", color:"#8a1f2b", borderRadius:18, padding:"9px 14px", font:"600 12px/1 'DM Sans'" }}>{q.label}</span>
              ))}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:9, padding:"14px 16px", borderTop:"1px solid #ece2d2", background:"#fff" }}>
            <div style={{ flex:1, background:"#f3eee0", borderRadius:22, padding:"12px 16px", font:"500 13px/1 'DM Sans'", color:"#9b8c78" }}>Ask about menu, catering, rooms…</div>
            <div style={{ width:38, height:38, borderRadius:"50%", background:"#8a1f2b", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", font:"700 15px/1 'DM Sans'", cursor:"pointer" }}>➤</div>
          </div>
        </div>
      )}

      <button onClick={() => setChatOpen(o => !o)} style={{ position:"fixed", right:28, bottom:28, zIndex:80, display:"flex", alignItems:"center", gap:11, background:"#8a1f2b", color:"#fff", border:"none", borderRadius:32, padding:"15px 22px 15px 17px", font:"600 15px/1 'DM Sans'", cursor:"pointer", boxShadow:"0 14px 34px rgba(138,31,43,.44)" }}>
        <span style={{ width:32, height:32, borderRadius:"50%", background:"#c79a3a", color:"#241510", display:"flex", alignItems:"center", justifyContent:"center", font:"700 16px/1 'Playfair Display'" }}>S</span>
        <span>Ask Sangam</span>
        <span style={{ width:9, height:9, borderRadius:"50%", background:"#9fd9a0" }} />
      </button>
    </div>
  );
}
