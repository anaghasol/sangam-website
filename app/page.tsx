"use client";

import { useState, useRef, useEffect } from "react";

type Screen = "home" | "menu" | "branches" | "catering" | "rooms" | "about" | "contact" | "order";

// ── All images served locally from /public/ ──────────────────────────────────
const IMGS = {
  logo:         "/logo.png",
  heroFallback: "/gp-peerzadiguda-0.jpg",   // real Sangam Hotel Peerzadiguda building

  // ── Halls (real Sangam banquet halls) ─────────────────────────
  arangam:      "/gp-peerzadiguda-2.jpg",   // crystal chandelier hall
  magudam:      "/gp-peerzadiguda-4.jpg",   // buffet hall with red drapes
  magudamWide:  "/gp-peerzadiguda-4.jpg",

  // ── Peerzadiguda interiors ────────────────────────────────────
  peerzHall:    "/gp-peerzadiguda-6.jpg",   // restaurant with green sofas & juice bar
  peer1:        "/gp-peerzadiguda-0.jpg",   // building exterior
  peer2:        "/gp-peerzadiguda-5.jpg",   // Ganesha lobby
  peer3:        "/gp-peerzadiguda-8.jpg",   // luxury blue sofa lounge

  // ── Hayathnagar ───────────────────────────────────────────────
  hayt1:        "/gp-hayathnagar-4.jpg",    // Hayathnagar welcome counter
  hayt2:        "/gp-hayathnagar-1.jpg",    // official Sangam Hotel branded image

  // ── Malkapur ──────────────────────────────────────────────────
  malkapur1:    "/gp-malkapur-2.jpg",       // JIO BP Plaza dining hall (wide)
  malkapur2:    "/gp-malkapur-3.jpg",       // JIO BP Plaza dining hall with Sangam signage
  malkapur3:    "/gp-malkapur-4.jpg",
  malkapur4:    "/gp-malkapur-5.jpg",

  // ── Rooms (real Sangam hotel rooms) ───────────────────────────
  room1:        "/gp-peerzadiguda-1.jpg",   // actual Sangam king room
  room2:        "/gp-peerzadiguda-1.jpg",
  room3:        "/gp-peerzadiguda-7.jpg",   // lobby sitting area
  room4:        "/gp-peerzadiguda-9.jpg",   // floor lounge near rooms
  room5:        "/gp-peerzadiguda-8.jpg",   // luxury lounge
  room6:        "/gp-peerzadiguda-1.jpg",

  // ── Category strip ────────────────────────────────────────────
  tiffins:      "/gp-hayathnagar-2.jpg",    // real Sangam puri bhaji plate
  restaurant:   "/gp-peerzadiguda-6.jpg",   // Peerzadiguda restaurant
  bakery:       "/gp-bakes-hayt-0.jpg",     // real Sangam Bakes & Cakes counter

  // ── Food ──────────────────────────────────────────────────────
  biryani:      "/gp-hayathnagar-3.jpg",    // chicken rice on banana leaf
  biryaniReal:  "/gp-hayathnagar-3.jpg",

  // ── Menu pages ────────────────────────────────────────────────
  menuPage1:    "/gp-peerzadiguda-6.jpg",
  menuPage2:    "/gp-hayathnagar-1.jpg",    // Sangam branded food image

  // ── Editorial / branch cards ──────────────────────────────────
  hotelHero:    "/gp-peerzadiguda-0.jpg",   // building exterior
  peerzExt:     "/gp-peerzadiguda-0.jpg",
  peerzBldg:    "/peerzadiguda.webp",
  haythBldg:    "/hayathnagar.webp",
  koyya:        "/koyyalagudem.webp",
  bakesMans:    "/bakes-mansoorabad.webp",
  tiffinsMans:  "/tiffins-mansoorabad.webp",
  bakesHayt:    "/bakes-hayathnagar.webp",
  newBranch:    "/gp-malkapur-2.jpg",       // Malkapur JIO BP Plaza interior
};

const BRANCHES = [
  {
    id: "peerzadiguda",
    name: "Sangam Hotels · Peerzadiguda",
    shortName: "Peerzadiguda",
    badge: "FLAGSHIP",
    badgeColor: "#1a6a3a",
    badgeBg: "#e3f2e7",
    badgeBorder: "#bfe2c8",
    type: ["Restaurant", "Tiffins", "Rooms", "Banquet"],
    tagline: "Hotel · Restaurant · Bakery · Banquet Halls",
    address: "Parvathapur Rd, Gullam Ali Guda village, Peerzadiguda, Hyderabad – 500098",
    phone: "+91 90638 44021",
    phone2: "+91 90638 44022",
    hours: "24 Hours",
    rating: "4.5",
    img: IMGS.peerzBldg,
    mapsLink: "https://maps.google.com/?q=Sangam+Hotels+Peerzadiguda+Hyderabad",
    swiggy: "",
    zomato: "https://www.zomato.com/hyderabad/sangam-hotel-l-b-nagar",
  },
  {
    id: "hayathnagar",
    name: "Sangam Hotels · Hayathnagar",
    shortName: "Hayathnagar",
    badge: "HQ",
    badgeColor: "#1a5a8a",
    badgeBg: "#e3f0f7",
    badgeBorder: "#bfd5e8",
    type: ["Restaurant", "Tiffins", "Banquet"],
    tagline: "Restaurant · Tiffins · Banquet Hall (300 cap.)",
    address: "Laxma Reddy Palem, NH65, Krupa Colony, Hayathnagar Khalsa, Hyderabad – 501505",
    phone: "+91 73838 38166",
    hours: "6 AM – 11 PM",
    rating: "4.6",
    img: IMGS.haythBldg,
    mapsLink: "https://maps.google.com/?q=Sangam+Hotels+Hayathnagar+Hyderabad",
    swiggy: "https://www.swiggy.com/city/hyderabad/sangam-hotel-krupa-colony-vanasthalipuram-rest571085",
    zomato: "https://www.zomato.com/hyderabad/sangam-hotel-vanasthalipuram",
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
    img: IMGS.malkapur3,
    mapsLink: "https://maps.google.com/?q=Sangam+Hotels+Malkapur+Choutuppal",
    swiggy: "",
    zomato: "",
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
    img: IMGS.bakesHayt,
    mapsLink: "https://share.google/hZbW0oHkG2KJbKdcU",
    swiggy: "",
    zomato: "https://www.zomato.com/hyderabad/sangam-bakes-cakes-vanasthalipuram/order",
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
    img: IMGS.bakesMans,
    mapsLink: "https://share.google/LvqnUASmK13LmXwYM",
    swiggy: "",
    zomato: "https://www.zomato.com/hyderabad/sangam-bakes-cakes-l-b-nagar/order",
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
    address: "Plot 134, Chitraseema Colony, Mansoorabad, L B Nagar, Hyderabad",
    phone: "+91 73838 38166",
    hours: "6:30 AM – 3 PM",
    rating: "4.4",
    img: IMGS.tiffinsMans,
    mapsLink: "https://share.google/Cm4dgz1StJ9kDDozJ",
    swiggy: "",
    zomato: "",
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
    tagline: "South Indian Tiffins & Dine-in",
    address: "NH65, Yellagiri X-Roads, Koyyalagudem, Choutuppal, Nalgonda – 508252",
    phone: "+91 90638 44021",
    hours: "6 AM – 3 PM",
    rating: "4.4",
    img: IMGS.koyya,
    mapsLink: "https://share.google/CvuJkWSxmb7AWI7U9",
    swiggy: "",
    zomato: "",
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
  const [menuCat, setMenuCat] = useState("Tiffins");
  const [navOpen, setNavOpen] = useState(false);
  const [orderBranch, setOrderBranch] = useState<string | null>(null);
  const [menuBranchId, setMenuBranchId] = useState("hayathnagar");
  const [liveReviews, setLiveReviews] = useState(TESTIMONIALS);
  const [igPosts, setIgPosts] = useState<Array<{ id: string; media_url: string; thumbnail_url?: string; permalink: string; caption?: string; media_type: string }>>([]);
  type ChatMsg = { role: 'user' | 'assistant'; content: string };
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: 'Namaste! 🙏 I\'m Arjun from Sangam Hotels. I can help you with our menu, branches, catering, rooms or anything else. What can I do for you?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function loadReviews() {
      fetch("/api/reviews")
        .then(r => r.json())
        .then(data => {
          if (data.reviews?.length >= 3) {
            // Shuffle client-side each load for variety
            const arr = [...data.reviews];
            for (let i = arr.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            setLiveReviews(arr.map((r: { author: string; rating: number; text: string; time: string; branch: string }) => ({
              stars: "★".repeat(Math.min(5, Math.max(1, r.rating))),
              text: r.text,
              author: r.author,
              location: r.time || "Hyderabad",
              branch: r.branch,
            })));
          }
        })
        .catch(() => {});
    }
    loadReviews();
    // Re-shuffle every 5 minutes so the marquee feels fresh
    const timer = setInterval(loadReviews, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch("/api/instagram")
      .then(r => r.json())
      .then(data => { if (data.posts?.length) setIgPosts(data.posts); })
      .catch(() => {});
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);

  async function sendChat(text?: string) {
    const msg = (text ?? chatInput).trim();
    if (!msg || chatLoading) return;
    const next: ChatMsg[] = [...chatMessages, { role: 'user', content: msg }];
    setChatMessages(next);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please call +91 90638 44021.' }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }
  }

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
      <div className="util-strip" style={{ background:"#241510", color:"#e8d8c2", font:"500 12.5px/1 'DM Sans'" }}>
        <span>📍 7 locations · Hyderabad</span>
        <span style={{ opacity:.4 }}>•</span>
        <span>🕒 6:00 AM – 11:00 PM</span>
        <div className="util-strip-right">
          <a href="https://wa.me/qr/2AWL7MVBOJPEH1" target="_blank" rel="noopener noreferrer" style={{ color:"#9fd9a0", textDecoration:"none", display:"inline-flex", alignItems:"center", gap:6 }}>💬 WhatsApp</a>
          <span style={{ opacity:.4 }}>•</span>
          <a href="tel:+919063844021" style={{ color:"#e8d8c2", textDecoration:"none" }}>📞 +91 90638 44021</a>
        </div>
      </div>

      {/* ── HEADER ────────────────────────────────────────────────── */}
      <div style={{ position:"sticky", top:0, zIndex:50, background:"rgba(251,246,236,.96)", backdropFilter:"blur(10px)", borderBottom:"1px solid #ece2d2" }}>
        <div className="nav-header">
          <div onClick={() => { go("home")(); setNavOpen(false); }} style={{ display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}>
            <Img src={IMGS.logo} alt="Sangam Hotels" style={{ height:46, width:"auto", display:"block" }} />
            <div style={{ lineHeight:1 }}>
              <div style={{ font:"700 21px/1 'Playfair Display'", color:"#8a1f2b" }}>Sangam Hotels</div>
              <div style={{ font:"600 8.5px/1.4 'DM Sans'", letterSpacing:".26em", color:"#b88a2e", marginTop:4, textTransform:"uppercase" }}>Hyderabad · Since 2022</div>
            </div>
          </div>
          <div style={{ flex:1 }} />
          <nav className="nav-links">
            {(["home","menu","branches","catering","rooms","about","contact"] as Screen[]).map(s => (
              <a key={s} onClick={go(s)} style={nav(s)}>{s.charAt(0).toUpperCase()+s.slice(1)}</a>
            ))}
          </nav>
          <button onClick={go("order")} className="nav-order-btn" style={{ background:"#8a1f2b", color:"#fff", font:"600 14px/1 'DM Sans'", padding:"13px 22px", borderRadius:30, border:"none", cursor:"pointer", boxShadow:"0 8px 20px rgba(138,31,43,.22)" }}>
            Order Online
          </button>
          <button className="hamburger" onClick={() => setNavOpen(o => !o)} aria-label="Menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              {navOpen ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></>}
            </svg>
          </button>
        </div>
        {/* Mobile dropdown */}
        <div className={`mobile-menu${navOpen ? " open" : ""}`}>
          {(["home","menu","branches","catering","rooms","about","contact"] as Screen[]).map(s => (
            <a key={s} onClick={() => { go(s)(); setNavOpen(false); }}>{s.charAt(0).toUpperCase()+s.slice(1)}</a>
          ))}
          <a onClick={() => { go("order")(); setNavOpen(false); }} style={{ background:"#8a1f2b", color:"#fff !important" as "inherit", margin:"8px 16px", borderRadius:10, textAlign:"center", border:"none" }}>🛒 Order Online</a>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          HOME
      ══════════════════════════════════════════════════════════════ */}
      {screen === "home" && (
        <div>
          {/* HERO VIDEO */}
          <div className="hero-wrap">
            <video ref={videoRef} autoPlay loop muted={muted} playsInline
              style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}
>
              <source src="/hero.mp4" type="video/mp4" />
            </video>
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(100deg,rgba(20,10,8,.9) 0%,rgba(20,10,8,.6) 46%,rgba(20,10,8,.15) 100%)" }} />
            <div className="hero-content">
              <div style={{ font:"600 13px/1 'DM Sans'", letterSpacing:".26em", textTransform:"uppercase", color:"#e7cd8f", marginBottom:18 }}>Seven kitchens · one taste of home</div>
              <h1 className="hero-title">Authentic South Indian, freshly made across Hyderabad</h1>
              <p className="hero-subtitle">Tiffins, full meals, bakery &amp; banquets — order online, book catering, or stay with us.</p>
              <div className="hero-ctas">
                <button onClick={go("order")} style={{ display:"inline-flex", alignItems:"center", gap:9, background:"#c79a3a", color:"#2a1c06", font:"700 16px/1 'DM Sans'", padding:"16px 28px", borderRadius:36, border:"none", cursor:"pointer", boxShadow:"0 12px 28px rgba(199,154,58,.4)" }}>
                  🛒 Order Online
                </button>
                <button onClick={go("catering")} style={{ display:"inline-flex", alignItems:"center", gap:9, background:"rgba(255,255,255,.12)", color:"#fff", font:"600 16px/1 'DM Sans'", padding:"16px 26px", borderRadius:36, border:"1.5px solid rgba(255,255,255,.5)", cursor:"pointer" }}>
                  Book Catering
                </button>
              </div>
              <div className="hero-meta">
                <span style={{ color:"#f0c860" }}>★★★★★ 4.6</span>
                <span style={{ opacity:.5 }}>|</span><span>12,000+ diners served</span>
                <span style={{ opacity:.5 }}>|</span><span>Since 2022</span>
              </div>
            </div>
            <button onClick={() => { setMuted(m => !m); if(videoRef.current) videoRef.current.muted = !muted; }}
              style={{ position:"absolute", bottom:20, right:20, background:"rgba(36,21,16,.75)", border:"1.5px solid rgba(255,255,255,.3)", color:"#fff", borderRadius:30, padding:"9px 16px", font:"600 12px/1 'DM Sans'", cursor:"pointer", backdropFilter:"blur(6px)", zIndex:10 }}>
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

          {/* ── MALKAPUR SEPARATOR — highway pride messaging ─────── */}
          <div style={{ background:"#0a0603", padding:"52px 20px", textAlign:"center" }}>
            <div style={{ maxWidth:820, margin:"0 auto" }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:10, background:"rgba(0,154,68,.12)", border:"1px solid rgba(0,154,68,.35)", borderRadius:30, padding:"10px 18px", marginBottom:22, flexWrap:"wrap", justifyContent:"center" }}>
                <img src="/jiobp-logo.svg" alt="Jio-BP" style={{ height:26, width:"auto", display:"block", borderRadius:5, flexShrink:0 }} />
                <span className="malkapur-badge-text" style={{ font:"700 11px/1.3 'DM Sans'", color:"#00c85a", letterSpacing:".08em", textTransform:"uppercase" }}>Reliance-Certified Highway Partner · JIO BP Plaza, NH65</span>
              </div>
              <h2 className="h-xl" style={{ margin:"0 0 16px", color:"#fff" }}>
                Proudly serving India's<br />
                <span style={{ color:"#c79a3a", fontStyle:"italic" }}>highway travellers</span>
              </h2>
              <p style={{ margin:"0 auto 20px", font:"400 17px/1.75 'DM Sans'", color:"#a99c8c", maxWidth:640 }}>
                Sangam Hotels Malkapur is our boldest venture yet — a full-service destination on NH65 with a restaurant, rooms, banquet halls and a marriage hall. And we're just getting started.
              </p>
              <div style={{ font:"500 15px/1.6 'DM Sans'", color:"#c79a3a", fontStyle:"italic" }}>
                "Resort-level expansion in progress — watch this space."
              </div>
              <div className="malkapur-stats" style={{ display:"flex", justifyContent:"center", gap:36, marginTop:32, flexWrap:"wrap" }}>
                {[
                  { num:"NH65", label:"Prime highway location" },
                  { num:"4", label:"Floors of hospitality" },
                  { num:"∞", label:"Growth in progress" },
                ].map(s => (
                  <div key={s.label} style={{ textAlign:"center" }}>
                    <div style={{ font:"800 32px/1 'Playfair Display'", color:"#c79a3a" }}>{s.num}</div>
                    <div style={{ font:"500 12px/1.4 'DM Sans'", color:"#6b5e52", marginTop:6, textTransform:"uppercase", letterSpacing:".08em" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── MALKAPUR BRANCH VIDEO — full-width cinematic ───────── */}
          <div style={{ position:"relative", background:"#000", lineHeight:0 }}>
            <video autoPlay loop muted playsInline
              style={{ width:"100%", display:"block", maxHeight:600, objectFit:"cover" }}
>
              <source src="/malkapur-showcase-web.mp4" type="video/mp4" />
            </video>
            {/* Bottom gradient for smooth transition to next section */}
            <div style={{ position:"absolute", bottom:0, left:0, right:0, height:120, background:"linear-gradient(0deg,#fbf6ec,transparent)" }} />
            {/* Top gradient to seal against separator */}
            <div style={{ position:"absolute", top:0, left:0, right:0, height:60, background:"linear-gradient(180deg,#0a0603,transparent)" }} />
            {/* Floating info badge */}
            <div className="video-badge">
              <span style={{ font:"700 15px/1 'Playfair Display'", color:"#fff" }}>Sangam Hotels · Malkapur</span>
              <span className="video-badge-sep" style={{ width:1, height:18, background:"rgba(199,154,58,.4)", flexShrink:0 }} />
              <span className="video-badge-loc" style={{ font:"500 13px/1 'DM Sans'", color:"#c79a3a" }}>JIO BP Plaza · NH65 · Choutuppal</span>
              <a href="https://maps.google.com/?q=Sangam+Hotels+Malkapur+Choutuppal" target="_blank" rel="noopener noreferrer"
                style={{ background:"#c79a3a", color:"#1a1006", font:"700 12px/1 'DM Sans'", padding:"9px 18px", borderRadius:20, textDecoration:"none", flexShrink:0 }}>
                Get Directions →
              </a>
            </div>
          </div>

          {/* WHAT WE SERVE */}
          <div className="sec-pad" style={{ background:"#fbf6ec" }}>
            <div style={{ textAlign:"center", marginBottom:48 }}>
              <div style={{ font:"600 12px/1 'DM Sans'", letterSpacing:".28em", textTransform:"uppercase", color:"#8a1f2b" }}>What we serve</div>
              <h2 style={{ margin:"14px 0 0", font:"700 46px/1.06 'Playfair Display'", color:"#2a201b" }}>From morning tiffins to grand banquets</h2>
            </div>
            <div className="grid-4">
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
          <div style={{ padding:"60px 20px", background:"#fff" }}>
            <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", maxWidth:1180, margin:"0 auto 36px" }}>
              <div>
                <div style={{ font:"600 12px/1 'DM Sans'", letterSpacing:".28em", textTransform:"uppercase", color:"#8a1f2b" }}>Most loved</div>
                <h2 style={{ margin:"12px 0 0", font:"700 42px/1.05 'Playfair Display'", color:"#2a201b" }}>Signature dishes</h2>
              </div>
              <a onClick={go("menu")} style={{ font:"600 14px/1 'DM Sans'", color:"#8a1f2b", cursor:"pointer" }}>Full menu →</a>
            </div>
            <div className="grid-4">
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
                      <button onClick={go("order")} style={{ background:"#fff", border:"1.5px solid #8a1f2b", color:"#8a1f2b", borderRadius:20, padding:"8px 16px", font:"600 13px/1 'DM Sans'", cursor:"pointer" }}>Add +</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── FROM OUR KITCHEN — cooking video ──────────────────── */}
          <div style={{ background:"#1c100c", padding:"72px 20px" }}>
            <div className="cooking-grid">
              {/* Left: cooking video */}
              <div style={{ position:"relative", borderRadius:22, overflow:"hidden", boxShadow:"0 32px 72px rgba(0,0,0,.6)", background:"#0e0806" }}>
                <video autoPlay loop muted playsInline style={{ width:"100%", display:"block", objectFit:"cover" }}>
                  <source src="/cooking.mp4" type="video/mp4" />
                </video>
                {/* Gold ring border overlay */}
                <div style={{ position:"absolute", inset:0, borderRadius:22, border:"1.5px solid rgba(199,154,58,.25)", pointerEvents:"none" }} />
                <div style={{ position:"absolute", bottom:16, left:16, display:"flex", alignItems:"center", gap:8, background:"rgba(0,0,0,.6)", backdropFilter:"blur(8px)", borderRadius:20, padding:"8px 14px" }}>
                  <span style={{ width:7, height:7, borderRadius:"50%", background:"#e74c3c", display:"inline-block", animation:"wfpulse 1.4s infinite" }} />
                  <span style={{ font:"600 11px/1 'DM Sans'", color:"#fff", letterSpacing:".06em" }}>LIVE FROM OUR KITCHEN</span>
                </div>
              </div>

              {/* Right: copy */}
              <div>
                <div style={{ font:"600 12px/1 'DM Sans'", letterSpacing:".28em", textTransform:"uppercase", color:"#c79a3a", marginBottom:16 }}>Made fresh, every day</div>
                <h2 className="h-lg" style={{ margin:"0 0 20px", color:"#fff" }}>
                  Cooked with tradition,<br />
                  <span style={{ color:"#c79a3a", fontStyle:"italic" }}>served with pride</span>
                </h2>
                <p style={{ margin:"0 0 16px", font:"400 15px/1.75 'DM Sans'", color:"#cdbba4" }}>
                  Every morning at 6 AM, our chefs begin the same ritual — fresh batter ground overnight, sambar simmered with hand-roasted spices, ghee sourced from trusted local dairies.
                </p>
                <p style={{ margin:"0 0 28px", font:"400 15px/1.75 'DM Sans'", color:"#9b8c78" }}>
                  No shortcuts. No preservatives. Just the authentic taste of home, made fresh at every one of our 7 branches across Hyderabad & Telangana.
                </p>
                <div style={{ display:"flex", gap:24, flexWrap:"wrap" }}>
                  {[
                    { num:"7", label:"Branches" },
                    { num:"6 AM", label:"Starts every day" },
                    { num:"0", label:"Preservatives" },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ font:"800 28px/1 'Playfair Display'", color:"#c79a3a" }}>{s.num}</div>
                      <div style={{ font:"500 12px/1.4 'DM Sans'", color:"#9b8c78", marginTop:4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <button onClick={go("menu")} style={{ marginTop:28, display:"inline-flex", alignItems:"center", gap:9, background:"#c79a3a", color:"#1a1006", font:"700 14px/1 'DM Sans'", padding:"14px 28px", borderRadius:30, border:"none", cursor:"pointer" }}>
                  See our menu →
                </button>
              </div>
            </div>
          </div>

          {/* BRANCH FINDER */}
          <div style={{ padding:"64px 20px" }}>
            <div style={{ maxWidth:1180, margin:"0 auto", background:"#241510", borderRadius:28, overflow:"hidden", display:"grid", gridTemplateColumns:"1.1fr .9fr" }} className="grid-2">
              <div style={{ padding:"40px 32px", color:"#f3ece2" }}>
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
          <div>
            <div className="cat-strip">
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
          <div className="sec-pad">
            <div style={{ maxWidth:1180, margin:"0 auto" }}>
              <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:28 }}>
                <div>
                  <div style={{ font:"600 12px/1 'DM Sans'", letterSpacing:".28em", textTransform:"uppercase", color:"#8a1f2b", marginBottom:10 }}>Our spaces</div>
                  <h2 style={{ margin:0, font:"700 40px/1.05 'Playfair Display'", color:"#2a201b" }}>See us inside</h2>
                </div>
                <a onClick={go("branches")} style={{ font:"600 14px/1 'DM Sans'", color:"#8a1f2b", cursor:"pointer" }}>All branches →</a>
              </div>
              {/* Masonry-style 3-column grid */}
              <div className="gallery-main" style={{ gap:14 }}>
                {/* Big left tile spans 2 rows */}
                <div className="gallery-big" style={{ position:"relative", borderRadius:18, overflow:"hidden", background:"linear-gradient(135deg,#caa24a,#7a3018)" }}>
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
              <div className="gallery-row2">
                {[IMGS.peer1, IMGS.malkapur1, IMGS.malkapur3, "/banquet-buffet.jpg", IMGS.room3, IMGS.room4].map((src,i) => (
                  <div key={i} style={{ position:"relative", paddingTop:"100%", borderRadius:14, overflow:"hidden", background:"linear-gradient(135deg,#caa24a,#7a3018)" }}>
                    <Img src={src} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CATERING PROMO */}
          <div style={{ padding:"0 20px 64px" }}>
            <div style={{ maxWidth:1180, margin:"0 auto", border:"1px solid #ece2d2", borderRadius:26, overflow:"hidden", boxShadow:"0 18px 40px rgba(60,40,20,.08)" }} className="grid-2">
              <div style={{ position:"relative", minHeight:340, background:"#1a1006", overflow:"hidden" }}>
                {/* Buffet setup photo with hall photo beneath */}
                <img src="/banquet-buffet.jpg" alt="Sangam Banquet Buffet"
                  style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
                <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.4))" }} />
                <div style={{ position:"absolute", bottom:20, left:20, font:"600 13px/1 'DM Sans'", color:"#fff", background:"rgba(0,0,0,.5)", backdropFilter:"blur(6px)", padding:"9px 16px", borderRadius:20 }}>
                  Grand buffet setup · Sangamam Hall (600 guests)
                </div>
              </div>
              <div className="catering-inner">
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
            {/* Marquee — seamless loop; pad to ≥20 cards so no early repeat */}
            <div className="marquee-wrap">
              <div className="marquee-track">
                {(() => {
                  const only5Stars = liveReviews.filter(r => r.stars === "★★★★★" || (r.stars?.length ?? 0) >= 5);
                  const pool = only5Stars.length >= 6 ? only5Stars : liveReviews;
                  // Duplicate enough times so there are at least 20 unique cards before loop
                  const times = Math.max(2, Math.ceil(20 / pool.length));
                  return Array.from({ length: times }, () => pool).flat().map((r, i) => (
                  <div key={i} style={{ flexShrink:0, width:400, background:"#2f1d16", border:"1px solid #4a382c", borderRadius:20, padding:"28px 30px" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                      <div style={{ color:"#e7cd8f", font:"600 18px/1 'DM Sans'" }}>{r.stars}</div>
                      <div style={{ font:"600 11px/1 'DM Sans'", color:"#c79a3a", letterSpacing:".06em", textTransform:"uppercase", background:"rgba(199,154,58,.12)", borderRadius:20, padding:"5px 10px", maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.branch}</div>
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
                  ))
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MENU
      ══════════════════════════════════════════════════════════════ */}
      {screen === "menu" && (() => {
        const mb = BRANCHES.find(b => b.id === menuBranchId) ?? BRANCHES[1];
        const mSwiggy = mb.swiggy || "";
        const mZomato = mb.zomato || "";
        const mOrder  = mSwiggy || mZomato || "#";
        return (
        <div>
          <div style={{ padding:"48px 40px 28px", background:"#fff", borderBottom:"1px solid #ece2d2" }}>
            <div style={{ maxWidth:1180, margin:"0 auto" }}>
              <div style={{ font:"600 12px/1 'DM Sans'", letterSpacing:".24em", textTransform:"uppercase", color:"#8a1f2b" }}>Order online</div>
              <h1 style={{ margin:"12px 0 24px", font:"700 44px/1.05 'Playfair Display'", color:"#2a201b" }}>Menu &amp; Ordering</h1>
              <div style={{ display:"flex", flexWrap:"wrap", gap:14, alignItems:"center" }}>
                {/* Branch selector */}
                <div style={{ display:"flex", alignItems:"center", gap:9, background:"#fbf6ec", border:"1px solid #e9dcc8", borderRadius:30, padding:"10px 18px" }}>
                  <span style={{ font:"600 11px/1 'DM Sans'", color:"#9b8c78", letterSpacing:".04em" }}>BRANCH</span>
                  <select value={menuBranchId} onChange={e => setMenuBranchId(e.target.value)}
                    style={{ background:"transparent", border:"none", font:"600 14px/1 'DM Sans'", color:"#2a201b", cursor:"pointer", outline:"none" }}>
                    {BRANCHES.filter(b => b.type.includes("Restaurant") || b.type.includes("Tiffins")).map(b => (
                      <option key={b.id} value={b.id}>{b.shortName}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display:"flex", background:"#fbf6ec", border:"1px solid #e9dcc8", borderRadius:30, padding:4 }}>
                  {["Delivery","Takeaway","Dine-in"].map((t,i) => (
                    <span key={t} style={{ background:i===0?"#8a1f2b":"transparent", color:i===0?"#fff":"#6f655b", borderRadius:24, padding:"9px 18px", font:"600 13px/1 'DM Sans'", cursor:"pointer" }}>{t}</span>
                  ))}
                </div>
                {/* Quick order links */}
                <div style={{ display:"flex", gap:8 }}>
                  {mSwiggy ? (
                    <a href={mSwiggy} target="_blank" rel="noopener noreferrer"
                      style={{ background:"#fff7f0", border:"1px solid #ffd4b0", borderRadius:30, padding:"10px 18px", font:"600 13px/1 'DM Sans'", color:"#e07322", textDecoration:"none" }}>🛵 Swiggy</a>
                  ) : null}
                  {mZomato ? (
                    <a href={mZomato} target="_blank" rel="noopener noreferrer"
                      style={{ background:"#fff5f0", border:"1px solid #ffb8a0", borderRadius:30, padding:"10px 18px", font:"600 13px/1 'DM Sans'", color:"#cb202d", textDecoration:"none" }}>🍽️ Zomato</a>
                  ) : (
                    <span style={{ background:"#f9f3e9", border:"1px solid #e9dcc8", borderRadius:30, padding:"10px 18px", font:"500 13px/1 'DM Sans'", color:"#9b8c78" }}>📦 Pickup only</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="menu-layout" style={{ maxWidth:1180, margin:"0 auto" }}>
            <div className="menu-sidebar">
              {["Tiffins","Meals & Curries","Biryani","Bakery","Snacks & Chats","Beverages"].map((cat) => (
                <div key={cat} onClick={() => setMenuCat(cat)}
                  style={{ background:menuCat===cat?"#8a1f2b":"transparent", color:menuCat===cat?"#fff":"#4a3f36", borderRadius:12, padding:"13px 16px", font:"600 14px/1 'DM Sans'", marginBottom:6, cursor:"pointer" }}>{cat}</div>
              ))}
            </div>

            {(() => {
              const MENU_DATA: Record<string,{sub:string; items:{img:string;name:string;desc:string;price:string;veg:boolean;bestseller?:boolean}[]}> = {
                "Tiffins":        { sub:"Served 6 AM – 11 AM daily at all branches", items:[
                  { img:IMGS.tiffins,    name:"Idli Vada Platter",   desc:"2 soft idlis + 2 crispy vadas with sambar & 3 chutneys", price:"₹80",  veg:true, bestseller:true },
                  { img:IMGS.tiffins,    name:"Ghee Masala Dosa",    desc:"Potato masala, roasted crisp in pure ghee, served with sambar", price:"₹110", veg:true },
                  { img:IMGS.tiffins,    name:"Plain Dosa",           desc:"Crispy rice crepe with coconut chutney & sambar", price:"₹70", veg:true },
                  { img:IMGS.tiffins,    name:"Medu Vada (2 pc)",    desc:"Crispy lentil fritters with sambar & coconut chutney", price:"₹60",  veg:true },
                  { img:IMGS.tiffins,    name:"Puri Bhaji (3 pc)",   desc:"Fluffy puris with spiced potato bhaji & chutney", price:"₹80",  veg:true },
                  { img:IMGS.tiffins,    name:"Upma",                 desc:"Semolina upma with vegetables & lemon", price:"₹50",  veg:true },
                ]},
                "Meals & Curries":{ sub:"Available 11 AM – 4 PM · Served with rice or roti", items:[
                  { img:IMGS.restaurant, name:"Veg Meals",            desc:"Rice, rasam, sambar, 3 curries, pickle & papad", price:"₹149", veg:true, bestseller:true },
                  { img:IMGS.restaurant, name:"Non-Veg Meals",        desc:"Rice, curry, mutton/chicken side, papad & pickle", price:"₹199", veg:false },
                  { img:IMGS.restaurant, name:"Dal Fry + Roti (3)",   desc:"Lentil curry with 3 wheat rotis & onion salad", price:"₹120", veg:true },
                  { img:IMGS.restaurant, name:"Paneer Butter Masala", desc:"Cottage cheese in rich tomato-cream gravy", price:"₹180", veg:true },
                  { img:IMGS.restaurant, name:"Chicken Curry",        desc:"Tender chicken in spiced Andhra-style gravy", price:"₹200", veg:false },
                ]},
                "Biryani":        { sub:"Slow-cooked dum biryani · Available from 12 PM", items:[
                  { img:IMGS.biryaniReal,name:"Mutton Biryani",       desc:"Slow-cooked dum biryani with tender mutton & whole spices", price:"₹280", veg:false, bestseller:true },
                  { img:IMGS.biryaniReal,name:"Chicken Biryani",      desc:"Juicy chicken pieces in fragrant basmati rice", price:"₹220", veg:false },
                  { img:IMGS.biryaniReal,name:"Veg Biryani",          desc:"Seasonal vegetables, saffron & whole spices dum style", price:"₹180", veg:true },
                  { img:IMGS.biryaniReal,name:"Egg Biryani",          desc:"Masala eggs layered with aromatic basmati rice", price:"₹170", veg:false },
                ]},
                "Bakery":         { sub:"Baked fresh daily · Available at Bakes outlets", items:[
                  { img:IMGS.bakery,     name:"Black Forest Cake (slice)", desc:"Fresh cream, cherries, dark chocolate sponge", price:"₹90",  veg:true, bestseller:true },
                  { img:IMGS.bakery,     name:"Butter Croissant",      desc:"Flaky, buttery croissant baked fresh every morning", price:"₹60",  veg:true },
                  { img:IMGS.bakery,     name:"Chocolate Brownie",     desc:"Dense, fudgy chocolate brownie with walnuts", price:"₹70",  veg:true },
                  { img:IMGS.bakery,     name:"Custom Celebration Cake", desc:"1 kg custom decorated cake — order 1 day ahead", price:"₹799", veg:true },
                  { img:IMGS.bakery,     name:"Cupcake Box (6 pc)",    desc:"Assorted flavours — vanilla, chocolate, red velvet", price:"₹240", veg:true },
                ]},
                "Snacks & Chats": { sub:"Evening snacks · 4 PM – 9 PM", items:[
                  { img:IMGS.tiffins,    name:"Samosa (2 pc)",         desc:"Crispy potato-filled pastry with tamarind chutney", price:"₹40",  veg:true, bestseller:true },
                  { img:IMGS.tiffins,    name:"Pav Bhaji",             desc:"Spiced vegetable mash with butter pav", price:"₹110", veg:true },
                  { img:IMGS.tiffins,    name:"Mirchi Bajji (4 pc)",   desc:"Green chilli fritters with coconut chutney", price:"₹60",  veg:true },
                  { img:IMGS.tiffins,    name:"Bread Pakora (4 pc)",   desc:"Spiced potato-stuffed bread fritters", price:"₹70",  veg:true },
                ]},
                "Beverages":      { sub:"Fresh juices, chai & cold drinks", items:[
                  { img:IMGS.tiffins,    name:"Masala Chai",           desc:"Ginger-cardamom tea with full-cream milk", price:"₹30",  veg:true, bestseller:true },
                  { img:IMGS.tiffins,    name:"Filter Coffee",         desc:"South Indian decoction with fresh milk & froth", price:"₹35",  veg:true },
                  { img:IMGS.tiffins,    name:"Fresh Lime Soda",       desc:"Sweet, salted or masala — your choice", price:"₹50",  veg:true },
                  { img:IMGS.tiffins,    name:"Mango Lassi",           desc:"Thick Alphonso mango blended with fresh curd", price:"₹80",  veg:true },
                ]},
              };
              const cat = MENU_DATA[menuCat] ?? MENU_DATA["Tiffins"];
              return (
                <div style={{ padding:"28px 30px" }}>
                  <h3 style={{ margin:"0 0 6px", font:"700 26px/1 'Playfair Display'", color:"#2a201b" }}>{menuCat}</h3>
                  <p style={{ margin:"0 0 20px", font:"500 13px/1 'DM Sans'", color:"#9b8c78" }}>{cat.sub}</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                    {cat.items.map(item => (
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
                            {item.bestseller && <span style={{ font:"600 9px/1 'DM Sans'", color:"#b88a2e", background:"#f7eecf", border:"1px solid #e8d6a4", borderRadius:5, padding:"3px 7px" }}>BESTSELLER</span>}
                          </div>
                          <p style={{ margin:"5px 0 8px", font:"400 13px/1.5 'DM Sans'", color:"#9b8c78" }}>{item.desc}</p>
                          <span style={{ font:"700 16px/1 'DM Sans'", color:"#2a201b" }}>{item.price}</span>
                        </div>
                        <button onClick={() => setChatOpen(true)} style={{ background:"#fff", border:"1.5px solid #8a1f2b", color:"#8a1f2b", borderRadius:22, padding:"10px 18px", font:"600 13px/1 'DM Sans'", cursor:"pointer", flexShrink:0 }}>Add +</button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div style={{ padding:"24px 22px" }}>
              <div style={{ position:"sticky", top:108, background:"#fff", border:"1px solid #ece2d2", borderRadius:18, padding:22, boxShadow:"0 12px 30px rgba(60,40,20,.07)" }}>
                <div style={{ font:"700 19px/1 'Playfair Display'", color:"#2a201b", marginBottom:18 }}>🛒 Your order</div>
                <div style={{ background:"#fbf6ec", borderRadius:12, padding:"18px 16px", textAlign:"center", color:"#9b8c78", font:"500 14px/1.5 'DM Sans'" }}>Add items to get started</div>
                <div style={{ height:1, background:"#ece2d2", margin:"18px 0" }} />
                <a href={mZomato || mSwiggy || "#"} target="_blank" rel="noopener noreferrer"
                  style={{ width:"100%", display:"block", textAlign:"center", background:"#8a1f2b", color:"#fff", borderRadius:26, padding:14, font:"600 15px/1 'DM Sans'", cursor:"pointer", marginBottom:12, textDecoration:"none" }}>
                  Checkout →
                </a>
                <div style={{ textAlign:"center", font:"500 12px/1.5 'DM Sans'", color:"#9b8c78", marginBottom:12 }}>— or order via —</div>
                <div style={{ display:"flex", gap:10 }}>
                  {mSwiggy ? (
                    <a href={mSwiggy} target="_blank" rel="noopener noreferrer"
                      style={{ flex:1, textAlign:"center", background:"#fff7f0", border:"1px solid #ffd4b0", borderRadius:12, padding:12, font:"600 13px/1 'DM Sans'", color:"#e07322", textDecoration:"none" }}>🛵 Swiggy</a>
                  ) : (
                    <span style={{ flex:1, textAlign:"center", background:"#f4f0eb", border:"1px solid #ddd5c8", borderRadius:12, padding:12, font:"600 13px/1 'DM Sans'", color:"#b8a898", opacity:.5 }}>🛵 Swiggy</span>
                  )}
                  {mZomato ? (
                    <a href={mZomato} target="_blank" rel="noopener noreferrer"
                      style={{ flex:1, textAlign:"center", background:"#fff5f0", border:"1px solid #ffb8a0", borderRadius:12, padding:12, font:"600 13px/1 'DM Sans'", color:"#cb202d", textDecoration:"none" }}>🍽️ Zomato</a>
                  ) : (
                    <span style={{ flex:1, textAlign:"center", background:"#f4f0eb", border:"1px solid #ddd5c8", borderRadius:12, padding:12, font:"600 13px/1 'DM Sans'", color:"#b8a898", opacity:.5 }}>🍽️ Zomato</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════
          BRANCHES
      ══════════════════════════════════════════════════════════════ */}
      {screen === "branches" && (
        <div>
          <div style={{ padding:"40px 20px 28px", background:"#fff", borderBottom:"1px solid #ece2d2" }}>
            <div style={{ maxWidth:1180, margin:"0 auto" }}>
              <div style={{ font:"600 12px/1 'DM Sans'", letterSpacing:".24em", textTransform:"uppercase", color:"#8a1f2b" }}>Our locations</div>
              <h1 style={{ margin:"12px 0 8px", font:"700 44px/1.05 'Playfair Display'", color:"#2a201b" }}>7 branches across Hyderabad</h1>
              <p style={{ margin:"0 0 20px", font:"400 15px/1.6 'DM Sans'", color:"#7a6e62" }}>Tiffins · Restaurant · Bakery · Hotel Rooms · Banquet Halls</p>
              <div className="branch-filters" style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {branchTypes.map(t => (
                  <span key={t} onClick={() => setBranchFilter(t)} style={{ background:branchFilter===t?"#8a1f2b":"#fbf6ec", color:branchFilter===t?"#fff":"#4a3f36", border:branchFilter===t?"none":"1px solid #e9dcc8", borderRadius:24, padding:"10px 18px", font:"600 13px/1 'DM Sans'", cursor:"pointer", flexShrink:0 }}>{t}</span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ maxWidth:1180, margin:"0 auto", padding:"28px 20px 64px" }} className="grid-branches">
            {filteredBranches.map(b => (
              <div key={b.id} style={{ border:"1px solid #ece2d2", borderRadius:22, overflow:"hidden", background:"#fff", boxShadow:"0 12px 30px rgba(60,40,20,.06)" }}>
                <a href={b.mapsLink} target="_blank" rel="noopener noreferrer" style={{ display:"block", textDecoration:"none" }}>
                  <div style={{ position:"relative", height:220, background:"linear-gradient(135deg,#caa24a,#7a3018)", overflow:"hidden" }}>
                    <Img src={b.img} alt={b.name} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", transition:"transform .4s ease" }} />
                    <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,rgba(0,0,0,.0),rgba(0,0,0,.35))" }} />
                    <span style={{ position:"absolute", top:14, right:14, font:`600 9px/1 'DM Sans'`, color:b.badgeColor, background:b.badgeBg, border:`1px solid ${b.badgeBorder}`, borderRadius:6, padding:"5px 9px", letterSpacing:".06em" }}>{b.badge}</span>
                    <span style={{ position:"absolute", bottom:12, right:14, font:"600 11px/1 'DM Sans'", color:"#fff", background:"rgba(0,0,0,.5)", borderRadius:10, padding:"5px 10px", backdropFilter:"blur(4px)" }}>View on Maps ↗</span>
                  </div>
                </a>
                <div style={{ padding:"22px 24px" }}>
                  <a href={b.mapsLink} target="_blank" rel="noopener noreferrer" style={{ font:"700 20px/1.2 'Playfair Display'", color:"#2a201b", marginBottom:4, textDecoration:"none", display:"block" }}>{b.name}</a>
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
          <div style={{ maxWidth:1180, margin:"0 auto", padding:"48px 20px 20px" }}>
            <div style={{ font:"600 12px/1 'DM Sans'", letterSpacing:".24em", textTransform:"uppercase", color:"#8a1f2b", marginBottom:12 }}>Our halls</div>
            <h2 style={{ margin:"0 0 8px", font:"700 36px/1.05 'Playfair Display'", color:"#2a201b" }}>Four air-conditioned banquet halls</h2>
            <p style={{ margin:"0 0 32px", font:"400 15px/1.6 'DM Sans'", color:"#7a6e62" }}>Peerzadiguda (HQ) features our largest halls. Hayathnagar for smaller events.</p>
            <div className="grid-4" style={{ maxWidth:"100%" }}>
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
            <div className="catering-pkgs">
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
            <div className="rooms-grid">
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
          <div style={{ maxWidth:1180, margin:"0 auto", padding:"48px 20px 48px" }} className="grid-2" data-gap="52">
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

          <div style={{ background:"#241510", padding:"56px 20px" }}>
            <div style={{ maxWidth:1180, margin:"0 auto" }}>
              <h2 style={{ margin:"0 0 36px", font:"700 34px/1.05 'Playfair Display'", color:"#fff", textAlign:"center" }}>What we stand for</h2>
              <div className="grid-3">
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
                {(() => {
                  const pool5 = liveReviews.filter(r => r.stars === "★★★★★" || (r.stars?.length ?? 0) >= 5);
                  const pool = pool5.length >= 6 ? pool5 : liveReviews;
                  const times = Math.max(2, Math.ceil(20 / pool.length));
                  return Array.from({ length: times }, () => pool).flat().map((r, i) => (
                  <div key={i} style={{ flexShrink:0, width:360, border:"1px solid #ece2d2", borderRadius:18, padding:"26px 28px", background:"#fff", boxShadow:"0 8px 24px rgba(60,40,20,.06)" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                      <div style={{ color:"#e7a010", font:"600 16px/1 'DM Sans'" }}>{r.stars}</div>
                      <div style={{ font:"600 11px/1 'DM Sans'", color:"#8a1f2b", letterSpacing:".04em", textTransform:"uppercase", background:"rgba(138,31,43,.07)", borderRadius:16, padding:"5px 10px", maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.branch}</div>
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
                  ))
                })()}
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

          <div className="contact-layout">
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

      {/* ── INSTAGRAM FEED ─────────────────────────────────────────── */}
      {screen !== "order" && igPosts.length > 0 && (
        <div style={{ background:"#fff", padding:"72px 40px 80px" }}>
          <div style={{ maxWidth:1180, margin:"0 auto" }}>
            <div style={{ textAlign:"center", marginBottom:40 }}>
              <div style={{ font:"600 12px/1 'DM Sans'", letterSpacing:".28em", textTransform:"uppercase", color:"#c79a3a", marginBottom:12 }}>Follow our story</div>
              <h2 style={{ margin:"0 0 10px", font:"700 38px/1.05 'Playfair Display'", color:"#2a201b" }}>
                <a href="https://www.instagram.com/sangamhotelpeerzadiguda/" target="_blank" rel="noopener noreferrer" style={{ color:"inherit", textDecoration:"none" }}>@sangamhotelpeerzadiguda</a>
              </h2>
              <p style={{ margin:0, font:"400 15px/1 'DM Sans'", color:"#9b8c78" }}>Our latest from Instagram</p>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:10 }}>
              {igPosts.slice(0, 8).map(post => (
                <a key={post.id} href={post.permalink} target="_blank" rel="noopener noreferrer"
                  style={{ display:"block", position:"relative", aspectRatio:"1/1", overflow:"hidden", borderRadius:12, background:"#f4ede0" }}>
                  <img
                    src={post.media_type === "VIDEO" ? (post.thumbnail_url || post.media_url) : post.media_url}
                    alt={post.caption?.slice(0, 60) || "Sangam Hotel"}
                    style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", transition:"transform .4s ease" }}
                    onMouseOver={e => (e.currentTarget.style.transform = "scale(1.06)")}
                    onMouseOut={e => (e.currentTarget.style.transform = "scale(1)")}
                  />
                  {post.media_type === "VIDEO" && (
                    <div style={{ position:"absolute", top:10, right:10, background:"rgba(0,0,0,.55)", borderRadius:6, padding:"3px 7px", font:"600 11px/1 'DM Sans'", color:"#fff" }}>▶</div>
                  )}
                  <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0)", transition:"background .3s ease", borderRadius:12 }}
                    onMouseOver={e => (e.currentTarget.style.background = "rgba(0,0,0,.28)")}
                    onMouseOut={e => (e.currentTarget.style.background = "rgba(0,0,0,0)")} />
                </a>
              ))}
            </div>
            <div style={{ textAlign:"center", marginTop:28 }}>
              <a href="https://www.instagram.com/sangamhotelpeerzadiguda/" target="_blank" rel="noopener noreferrer"
                style={{ display:"inline-flex", alignItems:"center", gap:8, background:"linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)", color:"#fff", border:"none", borderRadius:28, padding:"13px 28px", font:"600 15px/1 'DM Sans'", textDecoration:"none", cursor:"pointer" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                Follow on Instagram
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      {screen !== "order" && <div style={{ background:"#1c100c", color:"#cdbba4", padding:"56px 40px 28px" }}>
        <div className="footer-grid">
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
            <div style={{ display:"flex", flexDirection:"column", gap:10, font:"500 13px/1.4 'DM Sans'" }}>
              {BRANCHES.map(b => (
                <a key={b.id} href={b.mapsLink} target="_blank" rel="noopener noreferrer"
                  style={{ color:"#a99c8c", textDecoration:"none", display:"flex", alignItems:"center", gap:5 }}
                  onMouseEnter={e => (e.currentTarget.style.color="#c79a3a")}
                  onMouseLeave={e => (e.currentTarget.style.color="#a99c8c")}>
                  <span style={{ fontSize:9, color:"#c79a3a" }}>📍</span>{b.name}
                </a>
              ))}
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
      </div>}

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
          {/* Messages */}
          <div style={{ padding:"14px 14px 10px", background:"#fbf6ec", display:"flex", flexDirection:"column", gap:10, height:300, overflowY:"auto" }}>
            {chatMessages.map((m, i) => (
              <div key={i} style={{ display:"flex", justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth:"82%",
                  background: m.role === 'user' ? "#8a1f2b" : "#fff",
                  color: m.role === 'user' ? "#fff" : "#3a352e",
                  border: m.role === 'user' ? "none" : "1px solid #ece2d2",
                  borderRadius: m.role === 'user' ? "15px 15px 5px 15px" : "15px 15px 15px 5px",
                  padding:"10px 14px",
                  font:"400 13.5px/1.55 'DM Sans'",
                  whiteSpace:"pre-wrap",
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ alignSelf:"flex-start", background:"#fff", border:"1px solid #ece2d2", borderRadius:"15px 15px 15px 5px", padding:"10px 16px", font:"400 13px/1 'DM Sans'", color:"#9b8c78" }}>
                <span style={{ display:"inline-flex", gap:4 }}>
                  <span className="animate-wfpulse" style={{ animationDelay:"0ms" }}>●</span>
                  <span className="animate-wfpulse" style={{ animationDelay:"200ms" }}>●</span>
                  <span className="animate-wfpulse" style={{ animationDelay:"400ms" }}>●</span>
                </span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>
          {/* Quick chips */}
          {chatMessages.length <= 1 && (
            <div style={{ display:"flex", gap:7, flexWrap:"wrap", padding:"8px 14px 4px", background:"#fbf6ec", borderTop:"1px solid #ece2d2" }}>
              {["🛒 Order food","🎉 Catering enquiry","📍 Find a branch","🏨 Book a room","🎂 Custom cake"].map(q => (
                <span key={q} onClick={() => sendChat(q)} style={{ cursor:"pointer", background:"#fff", border:"1px solid #d9bfa0", color:"#8a1f2b", borderRadius:16, padding:"7px 12px", font:"600 11.5px/1 'DM Sans'" }}>{q}</span>
              ))}
            </div>
          )}
          {/* Input */}
          <div style={{ display:"flex", alignItems:"center", gap:9, padding:"12px 14px", borderTop:"1px solid #ece2d2", background:"#fff" }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
              placeholder="Ask about menu, catering, rooms…"
              style={{ flex:1, background:"#f3eee0", border:"none", outline:"none", borderRadius:22, padding:"11px 16px", font:"500 13px/1 'DM Sans'", color:"#2a201b" }}
            />
            <button
              onClick={() => sendChat()}
              disabled={chatLoading || !chatInput.trim()}
              style={{ width:38, height:38, borderRadius:"50%", background: chatLoading ? "#c9a0a8" : "#8a1f2b", border:"none", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", font:"700 15px/1 'DM Sans'", cursor: chatLoading ? "default" : "pointer", flexShrink:0 }}
            >➤</button>
          </div>
        </div>
      )}

      {/* ── ORDER ONLINE SCREEN ─────────────────────────────── */}
      {screen === "order" && (
        <div style={{ minHeight:"100vh", background:"#fbf6ec" }}>
          {/* Header */}
          <div style={{ background:"linear-gradient(135deg,#2a1c06,#4a2810)", padding:"60px 40px 48px", textAlign:"center" }}>
            <p style={{ font:"600 11px/1 'DM Sans'", color:"#c79a3a", letterSpacing:".14em", textTransform:"uppercase", margin:"0 0 14px" }}>SANGAM HOTELS</p>
            <h1 style={{ margin:"0 0 14px", font:"800 46px/1.06 'Playfair Display'", color:"#fff" }}>Order Online</h1>
            <p style={{ margin:"0 auto", font:"400 17px/1.65 'DM Sans'", color:"#c9bfb2", maxWidth:480 }}>
              Fresh food from your nearest branch — delivered hot or ready for pickup.
            </p>
          </div>

          {!orderBranch ? (
            /* Step 1 — Branch selection */
            <div className="sec-pad" style={{ maxWidth:1180, margin:"0 auto" }}>
              <div style={{ textAlign:"center", marginBottom:36 }}>
                <h2 style={{ font:"700 26px/1 'Playfair Display'", color:"#2a1c06", margin:"0 0 10px" }}>Select your branch</h2>
                <p style={{ font:"400 15px/1.5 'DM Sans'", color:"#7a6c5e", margin:0 }}>Choose the location you'd like to order from</p>
              </div>
              <div className="grid-3" style={{ gap:20 }}>
                {BRANCHES.map(b => {
                  const hasDelivery = !!(b.swiggy || b.zomato);
                  return (
                    <div key={b.id}
                      onClick={() => setOrderBranch(b.id)}
                      style={{ background:"#fff", border:"1.5px solid #ece2d2", borderRadius:18, overflow:"hidden", cursor:"pointer", transition:"transform .18s ease, box-shadow .18s ease, border-color .18s ease", boxShadow:"0 4px 16px rgba(60,40,20,.06)" }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform="translateY(-4px)"; el.style.boxShadow="0 16px 40px rgba(60,40,20,.14)"; el.style.borderColor="#c79a3a"; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform="translateY(0)"; el.style.boxShadow="0 4px 16px rgba(60,40,20,.06)"; el.style.borderColor="#ece2d2"; }}
                    >
                      <div className="imgwrap" style={{ height:130, position:"relative" }}>
                        <img src={b.img} alt={b.name} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
                        <div style={{ position:"absolute", top:10, right:10, background:hasDelivery?"#1a8a3a":"#7a5a2a", color:"#fff", font:"700 10px/1 'DM Sans'", padding:"5px 10px", borderRadius:10, letterSpacing:".05em" }}>
                          {hasDelivery ? "🛵 DELIVERY" : "📦 PICKUP ONLY"}
                        </div>
                      </div>
                      <div style={{ padding:"14px 16px 16px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6, flexWrap:"wrap" }}>
                          <span style={{ font:"700 10px/1 'DM Sans'", color:b.badgeColor, background:b.badgeBg, border:`1px solid ${b.badgeBorder}`, borderRadius:6, padding:"3px 8px", letterSpacing:".05em" }}>{b.badge}</span>
                          {b.swiggy && <span style={{ font:"700 9px/1 'DM Sans'", color:"#ff5200", background:"#fff0e6", border:"1px solid #ffd4b3", borderRadius:6, padding:"3px 7px" }}>SWIGGY</span>}
                          {b.zomato && <span style={{ font:"700 9px/1 'DM Sans'", color:"#e23744", background:"#fdeaec", border:"1px solid #f8b8be", borderRadius:6, padding:"3px 7px" }}>ZOMATO</span>}
                        </div>
                        <h3 style={{ margin:"0 0 3px", font:"700 15px/1.3 'DM Sans'", color:"#2a1c06" }}>{b.shortName}</h3>
                        <p style={{ margin:"0 0 12px", font:"400 12px/1.5 'DM Sans'", color:"#7a6c5e" }}>{b.tagline}</p>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                          <span style={{ font:"500 11px/1 'DM Sans'", color:"#7a6c5e" }}>⏰ {b.hours}</span>
                          <span style={{ font:"700 12px/1 'DM Sans'", color:"#8a1f2b" }}>Select →</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (() => {
            /* Step 2 — Platform selection */
            const branch = BRANCHES.find(b => b.id === orderBranch)!;
            return (
              <div style={{ maxWidth:720, margin:"0 auto", padding:"48px 24px 80px" }}>
                <button onClick={() => setOrderBranch(null)} style={{ background:"none", border:"none", color:"#8a1f2b", font:"600 14px/1 'DM Sans'", cursor:"pointer", padding:"0 0 28px", display:"flex", alignItems:"center", gap:6 }}>
                  ← Back to branches
                </button>

                {/* Selected branch bar */}
                <div style={{ background:"#fff", border:"1.5px solid #c79a3a", borderRadius:20, padding:"18px 22px", marginBottom:32, display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
                  <div style={{ width:56, height:56, borderRadius:12, overflow:"hidden", flexShrink:0 }}>
                    <img src={branch.img} alt={branch.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ margin:"0 0 3px", font:"700 15px/1.2 'Playfair Display'", color:"#2a1c06" }}>{branch.name}</p>
                    <p style={{ margin:"0 0 3px", font:"400 12px/1.4 'DM Sans'", color:"#7a6c5e", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{branch.address}</p>
                    <p style={{ margin:0, font:"600 12px/1 'DM Sans'", color:"#1a8a3a" }}>⏰ {branch.hours}</p>
                  </div>
                  <a href={`tel:${branch.phone}`} style={{ background:"#8a1f2b", color:"#fff", font:"600 13px/1 'DM Sans'", padding:"10px 18px", borderRadius:20, textDecoration:"none", flexShrink:0 }}>
                    📞 Call
                  </a>
                </div>

                <h2 style={{ font:"700 22px/1 'Playfair Display'", color:"#2a1c06", margin:"0 0 6px" }}>How would you like to order?</h2>
                <p style={{ font:"400 14px/1.5 'DM Sans'", color:"#7a6c5e", margin:"0 0 24px" }}>Choose a platform or call us to order directly.</p>

                {/* Platform grid */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:24 }}>

                  {/* Swiggy */}
                  {branch.swiggy ? (
                    <a href={branch.swiggy} target="_blank" rel="noopener noreferrer"
                      style={{ background:"#fff7f2", border:"2px solid #ff5200", borderRadius:18, padding:"22px 18px", textDecoration:"none", display:"flex", flexDirection:"column", gap:10, transition:"transform .15s ease, box-shadow .15s ease" }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform="translateY(-3px)"; el.style.boxShadow="0 12px 32px rgba(255,82,0,.2)"; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform="none"; el.style.boxShadow="none"; }}>
                      <div style={{ font:"800 20px/1 'DM Sans'", color:"#ff5200" }}>🛵 Swiggy</div>
                      <div>
                        <p style={{ margin:"0 0 3px", font:"600 14px/1 'DM Sans'", color:"#2a1c06" }}>Order on Swiggy</p>
                        <p style={{ margin:0, font:"400 12px/1.4 'DM Sans'", color:"#7a6c5e" }}>Fast delivery · Real-time tracking</p>
                      </div>
                      <span style={{ font:"700 13px/1 'DM Sans'", color:"#ff5200", marginTop:"auto" }}>Order now →</span>
                    </a>
                  ) : (
                    <div style={{ background:"#f9f5f0", border:"2px dashed #d8c8ad", borderRadius:18, padding:"22px 18px", display:"flex", flexDirection:"column", gap:10, opacity:.55 }}>
                      <div style={{ font:"800 20px/1 'DM Sans'", color:"#b8a898" }}>🛵 Swiggy</div>
                      <p style={{ margin:0, font:"600 13px/1 'DM Sans'", color:"#7a6c5e" }}>Coming soon</p>
                    </div>
                  )}

                  {/* Zomato */}
                  {branch.zomato ? (
                    <a href={branch.zomato} target="_blank" rel="noopener noreferrer"
                      style={{ background:"#fff2f3", border:"2px solid #e23744", borderRadius:18, padding:"22px 18px", textDecoration:"none", display:"flex", flexDirection:"column", gap:10, transition:"transform .15s ease, box-shadow .15s ease" }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform="translateY(-3px)"; el.style.boxShadow="0 12px 32px rgba(226,55,68,.2)"; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform="none"; el.style.boxShadow="none"; }}>
                      <div style={{ font:"800 20px/1 'DM Sans'", color:"#e23744" }}>🍽️ Zomato</div>
                      <div>
                        <p style={{ margin:"0 0 3px", font:"600 14px/1 'DM Sans'", color:"#2a1c06" }}>Order on Zomato</p>
                        <p style={{ margin:0, font:"400 12px/1.4 'DM Sans'", color:"#7a6c5e" }}>Delivery & takeaway · Reviews</p>
                      </div>
                      <span style={{ font:"700 13px/1 'DM Sans'", color:"#e23744", marginTop:"auto" }}>Order now →</span>
                    </a>
                  ) : (
                    <div style={{ background:"#f9f5f0", border:"2px dashed #d8c8ad", borderRadius:18, padding:"22px 18px", display:"flex", flexDirection:"column", gap:10, opacity:.55 }}>
                      <div style={{ font:"800 20px/1 'DM Sans'", color:"#b8a898" }}>🍽️ Zomato</div>
                      <p style={{ margin:0, font:"600 13px/1 'DM Sans'", color:"#7a6c5e" }}>Coming soon</p>
                    </div>
                  )}

                  {/* Self Pickup */}
                  <div style={{ background:"#f2faf5", border:"2px solid #1a8a3a", borderRadius:18, padding:"22px 18px", display:"flex", flexDirection:"column", gap:10 }}>
                    <div style={{ font:"800 20px/1 'DM Sans'", color:"#1a8a3a" }}>📦 Pickup</div>
                    <div>
                      <p style={{ margin:"0 0 3px", font:"600 14px/1 'DM Sans'", color:"#2a1c06" }}>Self Pickup</p>
                      <p style={{ margin:0, font:"400 12px/1.4 'DM Sans'", color:"#7a6c5e" }}>Call ahead, collect at branch</p>
                    </div>
                    <a href={`tel:${branch.phone}`}
                      style={{ font:"700 13px/1 'DM Sans'", color:"#fff", background:"#1a8a3a", padding:"11px 14px", borderRadius:12, textDecoration:"none", textAlign:"center", marginTop:"auto" }}>
                      📞 {branch.phone}
                    </a>
                  </div>

                  {/* PetPooja */}
                  <div style={{ background:"#f5f2fa", border:"2px dashed #c8b8d8", borderRadius:18, padding:"22px 18px", display:"flex", flexDirection:"column", gap:10, opacity:.55 }}>
                    <div style={{ font:"800 20px/1 'DM Sans'", color:"#7a5a9a" }}>🍕 PetPooja</div>
                    <div>
                      <p style={{ margin:"0 0 3px", font:"600 14px/1 'DM Sans'", color:"#7a6c5e" }}>PetPooja Direct</p>
                      <p style={{ margin:0, font:"400 12px/1.4 'DM Sans'", color:"#a99c8c" }}>Online ordering — coming soon</p>
                    </div>
                  </div>
                </div>

                {/* Directions */}
                <div style={{ background:"#fff", border:"1px solid #ece2d2", borderRadius:16, padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
                  <div>
                    <p style={{ margin:"0 0 3px", font:"600 13px/1 'DM Sans'", color:"#2a1c06" }}>📍 {branch.shortName}</p>
                    <p style={{ margin:0, font:"400 12px/1.4 'DM Sans'", color:"#7a6c5e" }}>{branch.address}</p>
                  </div>
                  <a href={branch.mapsLink} target="_blank" rel="noopener noreferrer"
                    style={{ background:"#2a1c06", color:"#c79a3a", font:"700 13px/1 'DM Sans'", padding:"12px 20px", borderRadius:20, textDecoration:"none", flexShrink:0 }}>
                    Get Directions →
                  </a>
                </div>
              </div>
            );
          })()}
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
