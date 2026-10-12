import React, { useState, useEffect, createContext, useContext } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowRight,
  Menu,
  X,
  Play,
  Heart,
  BookOpen,
  Calendar,
  MapPin,
  ChevronDown,
  Search,
  Check,
  Sun,
  Church,
  Shield,
  LogOut,
  Plus,
  Upload,
  Copy,
  LayoutDashboard,
  Users,
  Settings,
  Image,
  Video,
  FileText,
  MessageSquare,
  Mail,
  ClipboardList,
  History,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  RefreshCw,
  LockKeyhole,
  Folder,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";
import "./style.css";
import "./bright.css";
import "./admin.css";

const churchName = "✝RICH IN GLORY CHURCH · மகிமையின் ஐசுவரியம் ஜெப ஆலயம்";

const names = {
  home: ["Home", "முகப்பு"],
  about: ["Our church", "எங்கள் சபை"],
  sermons: ["Sermons", "பிரசங்கங்கள்"],
  events: ["Gatherings", "நிகழ்வுகள்"],
  verses: ["Monthly verse", "மாத வசனம்"],
  reading: ["Reading plan", "வாசிப்புத் திட்டம்"],
  studies: ["Bible study", "வேதாகம ஆய்வு"],
  photos: ["Photo gallery", "புகைப்படங்கள்"],
  videos: ["Video gallery", "காணொளிகள்"],
  articles: ["Articles", "கட்டுரைகள்"],
  messages: ["Announcements", "அறிவிப்புகள்"],
  faqs: ["Questions", "கேள்விகள்"],
  prayer: ["Prayer request", "ஜெப வேண்டுதல்"],
  contact: ["Plan your visit", "வருகையைத் திட்டமிடுங்கள்"],
  donate: ["Giving", "காணிக்கை"],
  account: ["My account", "என் கணக்கு"],
  admin: ["Administration", "நிர்வாகம்"],
  leadership: ["Leadership", "தலைமை"],
  services: ["Service times", "ஆராதனை நேரங்கள்"],
  albums: ["Albums", "ஆல்பங்கள்"],
};
const Ctx = createContext();
let csrf = "";
async function api(path, method = "GET", body, signal) {
  const res = await fetch("/api" + path, {
    method,
    signal,
    credentials: "same-origin",
    headers:
      body instanceof FormData
        ? { "X-CSRF-Token": csrf }
        : { "Content-Type": "application/json", "X-CSRF-Token": csrf },
    ...(body
      ? { body: body instanceof FormData ? body : JSON.stringify(body) }
      : {}),
  });
  const result = await res.json();
  if (!res.ok) throw Error(result.error || "Please try again.");
  if (result.csrf) csrf = result.csrf;
  return result;
}
function useData(path) {
  const [data, set] = useState(null),
    [error, E] = useState(""),
    [loading, L] = useState(true),
    [revision, R] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    if (!path) {
      set(null);
      L(false);
      return;
    }
    set(null);
    L(true);
    E("");
    api(path, "GET", undefined, controller.signal)
      .then((x) => active && set(x))
      .catch((e) => active && E(e.message))
      .finally(() => active && L(false));
    return () => {
      active = false;
      controller.abort();
    };
  }, [path, revision]);
  return { data, error, loading, reload: () => R((x) => x + 1) };
}
function Link({ to, children, className = "", ...props }) {
  const { navigate } = useContext(Ctx);
  return (
    <a
      href={"/" + (to === "home" ? "" : to)}
      className={className}
      onClick={(e) => {
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          navigate(to);
        }
      }}
      {...props}
    >
      {children}
    </a>
  );
}
function Notice({ error, loading, empty }) {
  const { t } = useContext(Ctx);
  return error ? (
    <div role="alert" className="notice error">
      {error}
    </div>
  ) : loading ? (
    <div className="notice" role="status">
      {t("Loading…", "ஏற்றுகிறது…")}
    </div>
  ) : empty ? (
    <div className="empty">
      <BookOpen size={28} />
      <p>{t("A new chapter is on its way.", "புதிய பதிவுகள் விரைவில்.")}</p>
      <small>
        {t(
          "Published church content will appear here.",
          "வெளியிடப்பட்ட சபை பதிவுகள் இங்கே தோன்றும்.",
        )}
      </small>
    </div>
  ) : null;
}
function App() {
  const [lang, SL] = useState(localStorage.getItem("rig-lang") || "en"),
    [route, SR] = useState(location.pathname.slice(1) || "home"),
    [user, SU] = useState(null),
    [sessionError, SE] = useState(""),
    [sessionReady, Ready] = useState(false);
  const t = (en, ta) => (lang === "ta" ? ta : en),
    text = (item, key) => item[key + "_" + lang] || item[key + "_en"] || "";
  const navigate = (r) => {
    history.pushState({}, "", r === "home" ? "/" : "/" + r);
    SR(r);
    window.scrollTo(0, 0);
  };
  useEffect(() => {
    const fn = () => {
      SR(location.pathname.slice(1) || "home");
      window.scrollTo(0, 0);
    };
    window.addEventListener("popstate", fn);
    api("/session")
      .then((x) => SU(x.user))
      .catch((e) => SE(e.message))
      .finally(() => Ready(true));
    return () => window.removeEventListener("popstate", fn);
  }, []);
  useEffect(() => {
    localStorage.setItem("rig-lang", lang);
    document.documentElement.lang = lang;
    document.title =
      route === "home"
        ? churchName
        : (names[route]?.[lang === "ta" ? 1 : 0] || "") + " · " + churchName;
  }, [lang, route]);
  const settings = useData("/settings");
  return (
    <Ctx.Provider
      value={{
        lang,
        setLang: SL,
        t,
        text,
        navigate,
        route,
        user,
        sessionReady,
        setUser: SU,
        settings: settings.data || {},
        reloadSettings: settings.reload,
      }}
    >
      <a className="skip" href="#main">
        Skip to content
      </a>
      {route !== "admin" && <Header />}
      {sessionError && <Notice error={sessionError} />}
      <main id="main">
        {route === "home" ? (
          <Home />
        ) : route === "prayer" || route === "contact" ? (
          <Intake kind={route} />
        ) : route === "account" ? (
          <Account />
        ) : route === "admin" ? (
          <Admin />
        ) : route === "donate" ? (
          <Giving />
        ) : names[route] ? (
          <Listing key={route} module={route} />
        ) : (
          <section className="page">
            <h1>404</h1>
            <Link to="home">Return home</Link>
          </section>
        )}
      </main>
      {route !== "admin" && <Footer />}
    </Ctx.Provider>
  );
}
function Brand() {
  return (
    <Link to="home" className="brand" aria-label={churchName}>
      <span className="brand-mark">✝</span>
      <span>
        RICH IN GLORY CHURCH<small>· மகிமையின் ஐசுவரியம் ஜெப ஆலயம்</small>
      </span>
    </Link>
  );
}
function Header() {
  const { lang, setLang, t, route, user, setUser } = useContext(Ctx);
  const [open, O] = useState(false);
  useEffect(() => O(false), [route]);
  return (
    <header>
      <div className="nav-wrap">
        <Brand />
        <nav aria-label="Main navigation" className={open ? "open" : ""}>
          <Link to="home" className={route === "home" ? "active" : ""}>
            {t("Home", "முகப்பு")}
          </Link>
          <Link to="about">{t("Our church", "எங்கள் சபை")}</Link>
          <Link to="sermons">{t("Sermons", "பிரசங்கங்கள்")}</Link>
          <Link to="events">{t("Gatherings", "நிகழ்வுகள்")}</Link>
          <details className="nav-more">
            <summary>
              {t("Explore", "மேலும்")} <ChevronDown size={13} />
            </summary>
            <div>
              {[
                "verses",
                "reading",
                "studies",
                "photos",
                "videos",
                "articles",
                "messages",
                "faqs",
                "prayer",
                "donate",
                "account",
                ...(user && user.role !== "member" ? ["admin"] : []),
              ].map((m) => (
                <Link key={m} to={m}>
                  {names[m][lang === "ta" ? 1 : 0]}
                </Link>
              ))}
            </div>
          </details>
        </nav>
        <div className="nav-actions">
          <button
            className="language"
            onClick={() => setLang(lang === "en" ? "ta" : "en")}
            aria-label="Switch language"
          >
            <span className={lang === "en" ? "selected" : ""}>EN</span>
            <span className={lang === "ta" ? "selected" : ""}>தமிழ்</span>
          </button>
          <Link to="contact" className="button small visit">
            {t("Visit us", "வருகை")}
            <ArrowUpRight size={15} />
          </Link>
          <button
            className="menu-toggle"
            onClick={() => O(!open)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
function Home() {
  const { t, settings, text } = useContext(Ctx);
  const services = useData("/content/services?size=3");
  const verses = useData("/content/verses?size=100");
  const current = verses.data?.items.find(
    (v) =>
      v.data.month ===
      new Date()
        .toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
        .slice(0, 7),
  );
  return (
    <>
      <div className="welcome-ribbon">
        {t(
          "A warm welcome to Rich in Glory Church",
          "மகிமையின் ஐசுவரியம் ஜெப ஆலயத்திற்கு அன்பான வரவேற்பு",
        )}
        <span>IRUGUR · TAMIL NADU</span>
      </div>
      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-content">
          <div className="eyebrow">
            <span />
            {t(
              "FAITH. FAMILY. A PLACE TO BELONG.",
              "விசுவாசம். குடும்பம். ஐக்கியம்.",
            )}
          </div>
          <h1>
            {t("Rooted in Christ.", "கிறிஸ்துவில் வேரூன்றி.")}
            <br />
            <em>{t("Rich in His Glory.", "அவரின் மகிமையில் நிறைந்து.")}</em>
          </h1>
          <p>
            {t(
              "Welcome to Rich in Glory Church in Irugur. Come as you are, find a community to call home, and discover the hope we share in Jesus.",
              "இருகூரில் உள்ள மகிமையின் ஐசுவரியம் ஜெப ஆலயத்திற்கு வரவேற்கிறோம். நீங்கள் இருப்பது போலவே வாருங்கள். இயேசுவில் நம்பிக்கையையும் அன்பான ஐக்கியத்தையும் கண்டறியுங்கள்.",
            )}
          </p>
          <div className="hero-buttons">
            <Link to="contact" className="button">
              {t("Plan your visit", "வருகையைத் திட்டமிடுங்கள்")}
              <ArrowUpRight size={18} />
            </Link>
            <Link to="sermons" className="button outline">
              <Play size={15} />
              {t("Watch sermons", "பிரசங்கங்களைப் பாருங்கள்")}
            </Link>
          </div>
          <div className="hero-note">
            <span>✦</span>
            {t("You are welcome here.", "இங்கே உங்களை அன்புடன் வரவேற்கிறோம்.")}
            <span className="note-tamil">மகிமையின் ஐசுவரியம் ஜெப ஆலயம்</span>
          </div>
        </div>
        <div className="hero-visual">
          <span className="photo-flourish" aria-hidden="true">
            ✦
          </span>
          <figure className="hero-photo">
            <img
              src={settings.hero_image || "/church/church-family.jpg"}
              alt={t(
                "Rich in Glory Church family gathered inside the church",
                "மகிமையின் ஐசுவரியம் சபையில் கூடியிருக்கும் குடும்பத்தினர்",
              )}
              fetchPriority="high"
            />
            <figcaption>
              {t(
                "A little glimpse of our church family",
                "எங்கள் சபை குடும்பத்தின் ஒரு தருணம்",
              )}
              <span>IRUGUR, TAMIL NADU</span>
            </figcaption>
          </figure>
          <figure className="hero-inset">
            <img
              src="/church/worship.jpg"
              alt={t(
                "Worship gathering at Rich in Glory Church",
                "மகிமையின் ஐசுவரியம் சபையின் ஆராதனை கூடுகை",
              )}
            />
            <figcaption>
              {t("Together in His presence.", "அவரது பிரசன்னத்தில் ஒன்றாய்.")}
            </figcaption>
          </figure>
          <div className="photo-credit">
            <a
              href="https://share.google/k6B7S0qJbvH2AITGG"
              target="_blank"
              rel="noreferrer"
            >
              {t(
                "Photos from our Google Maps listing",
                "எங்கள் Google Maps பதிவிலிருந்து படங்கள்",
              )}{" "}
              ↗
            </a>
          </div>
        </div>
        <a href="#belong" className="scroll-hint">
          {t("Discover our church", "எங்கள் சபையை அறியுங்கள்")}{" "}
          <ChevronDown size={15} />
        </a>
      </section>
      <section className="service-strip">
        <div>
          <Sun size={24} />
          <span className="micro">
            {t("LET’S WORSHIP TOGETHER", "ஒன்றாய் ஆராதிப்போம்")}
            <strong>
              {t("There’s a place for you.", "உங்களுக்கென ஓர் இடம்.")}
            </strong>
          </span>
        </div>
        {services.data?.items.length ? (
          services.data.items.map((s) => (
            <div key={s.id}>
              <span className="micro">
                {text(s, "title")}
                <strong>{s.data.time || text(s, "body")}</strong>
              </span>
            </div>
          ))
        ) : (
          <div>
            <span className="micro">
              {t("SERVICE SCHEDULE", "ஆராதனை நேரம்")}
              <strong>
                {t(
                  "Contact us for current timings",
                  "நேரங்களை அறிய தொடர்புகொள்ளுங்கள்",
                )}
              </strong>
            </span>
          </div>
        )}
        <Link to="contact">
          {t("Find your way here", "எங்களைச் சந்திக்க")}
          <ArrowUpRight size={20} />
        </Link>
      </section>
      <section className="section welcome" id="belong">
        <div className="welcome-art">
          <img
            src="/church/fellowship.jpg"
            alt={t(
              "A fellowship group at Rich in Glory Church",
              "மகிமையின் ஐசுவரியம் சபையின் ஐக்கியக் குழு",
            )}
            loading="lazy"
          />
          <span className="art-caption">
            {t(
              "REAL PEOPLE. SHARED FAITH.",
              "உண்மையான மக்கள். பகிரும் விசுவாசம்.",
            )}
          </span>
        </div>
        <div>
          <span className="eyebrow gold">
            {t("A CHURCH IN THE HEART OF IRUGUR", "இருகூரில் ஓர் அன்பான சபை")}
          </span>
          <h2>
            {t("More than a gathering.", "ஒரு கூடுகைக்கும் மேலாக.")}
            <br />
            <em>{t("A family in Christ.", "கிறிஸ்துவில் ஒரு குடும்பம்.")}</em>
          </h2>
          <p>
            {t(
              "Faith grows in community. Whether you are taking your first step or have walked with Jesus for years, there is room for you to worship, learn, and find encouragement.",
              "சமூகத்தில் விசுவாசம் வளர்கிறது. இயேசுவோடு உங்கள் முதல் அடியை எடுத்து வைத்தாலும் பல ஆண்டுகள் நடந்திருந்தாலும், ஆராதிக்கவும் கற்கவும் ஊக்கம் பெறவும் இங்கு இடமுண்டு.",
            )}
          </p>
          <Link to="about" className="text-link">
            {t("Get to know our church", "எங்கள் சபையை அறியுங்கள்")}
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <section
        className="pathways section"
        aria-label={t("Explore church life", "சபை வாழ்வை அறிந்துகொள்ளுங்கள்")}
      >
        {[
          [
            "contact",
            Church,
            t("Come & belong", "வாருங்கள், இணையுங்கள்"),
            t(
              "Find us in Mahakavi Nagar, Irugur. We would love to welcome you.",
              "இருகூர் மகாகவி நகரில் எங்களை சந்தியுங்கள். உங்களை அன்புடன் வரவேற்கிறோம்.",
            ),
          ],
          [
            "reading",
            BookOpen,
            t("Grow in the Word", "வார்த்தையில் வளருங்கள்"),
            t(
              "Make room for Scripture with reading plans and Bible studies.",
              "வாசிப்புத் திட்டங்கள் மற்றும் வேதாகம ஆய்வுகளுடன் வசனத்தில் வளருங்கள்.",
            ),
          ],
          [
            "prayer",
            Heart,
            t("We’re here for you", "உங்களுக்காக இருக்கிறோம்"),
            t(
              "Share a prayer request with our church team in confidence.",
              "உங்கள் ஜெப வேண்டுதலை சபை குழுவோடு ரகசியமாக பகிருங்கள்.",
            ),
          ],
        ].map(([to, Icon, title, copy]) => (
          <Link key={to} to={to} className="pathway">
            <span className="pathway-icon">
              <Icon size={24} />
            </span>
            <h3>{title}</h3>
            <p>{copy}</p>
            <ArrowUpRight size={19} />
          </Link>
        ))}
      </section>
      <section className="verse-feature">
        <span className="eyebrow gold">
          {t("A WORD FOR YOUR MONTH", "இந்த மாதத்திற்கான வார்த்தை")}
        </span>
        <div className="verse-symbol">“</div>
        <h2>
          {current
            ? text(current, "body")
            : t(
                "Let your heart be encouraged.",
                "உங்கள் இருதயம் ஊக்கமடையட்டும்.",
              )}
        </h2>
        <p>
          {current
            ? current.data.reference
            : t(
                "The church’s monthly Scripture will be shared here.",
                "சபையின் மாத வசனம் இங்கே பகிரப்படும்.",
              )}
        </p>
        <Link to="verses" className="text-link">
          {t("Explore monthly verses", "மாத வசனங்களைப் பாருங்கள்")}
          <ArrowRight size={17} />
        </Link>
      </section>
      <HomeFeed
        module="sermons"
        eyebrow={t(
          "THE WORD. FOR EVERYDAY LIFE.",
          "அன்றாட வாழ்விற்கான வார்த்தை.",
        )}
        title={t("Messages to grow by.", "வளர உதவும் செய்திகள்.")}
      />
      <HomeFeed
        module="events"
        eyebrow={t("LIFE IS BETTER TOGETHER", "ஒன்றாய் வாழ்வோம்")}
        title={t("Make room for community.", "ஐக்கியத்திற்கு இடமளிப்போம்.")}
      />
      <section className="prayer-banner section">
        <div>
          <span className="eyebrow gold">
            {t(
              "YOU DON’T HAVE TO WALK ALONE",
              "நீங்கள் தனியாக நடக்க வேண்டியதில்லை",
            )}
          </span>
          <h2>{t("Let us pray with you.", "உங்களோடு ஜெபிக்கிறோம்.")}</h2>
          <p>
            {t(
              "In every season, we believe in the power of prayer. Share what’s on your heart with our prayer team.",
              "ஒவ்வொரு காலத்திலும் ஜெபத்தின் வல்லமையை நம்புகிறோம். உங்கள் இருதயத்தின் பாரத்தை எங்கள் ஜெபக் குழுவோடு பகிருங்கள்.",
            )}
          </p>
        </div>
        <Link to="prayer" className="button">
          <Heart size={18} />
          {t("Request prayer", "ஜெபம் வேண்டுங்கள்")}
        </Link>
      </section>
      <HomeFeed
        module="articles"
        eyebrow={t("FAITH BEYOND SUNDAY", "அன்றாட விசுவாச வாழ்வு")}
        title={t(
          "Pause. Reflect. Be renewed.",
          "சிந்தியுங்கள். புதுப்பிக்கப்படுங்கள்.",
        )}
      />
      <HomeFeed
        module="photos"
        title={t("Moments of fellowship.", "ஐக்கியத்தின் தருணங்கள்.")}
        eyebrow={t("OUR CHURCH FAMILY", "எங்கள் சபை குடும்பம்")}
      />
      <HomeFeed
        module="videos"
        title={t("Worship and testimonies.", "ஆராதனையும் சாட்சிகளும்.")}
        eyebrow={t("WATCH & BE ENCOURAGED", "பார்த்து ஊக்கம் பெறுங்கள்")}
      />
      <HomeFeed
        module="messages"
        title={t("From our church.", "எங்கள் சபையிலிருந்து.")}
        eyebrow={t("STAY CONNECTED", "இணைந்திருங்கள்")}
      />
    </>
  );
}
function HomeFeed({ module, title, eyebrow }) {
  const { t } = useContext(Ctx),
    s = useData("/content/" + module + "?size=3");
  if (s.data?.items.length === 0) return null;
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <span className="eyebrow gold">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        <Link to={module} className="text-link">
          {t("View all", "அனைத்தையும் பார்க்க")}
          <ArrowUpRight size={18} />
        </Link>
      </div>
      <Notice
        error={s.error}
        loading={s.loading}
        empty={s.data?.items.length === 0}
      />
      <div className="cards">
        {s.data?.items.map((r) => (
          <Card key={r.id} item={r} />
        ))}
      </div>
    </section>
  );
}
function Card({ item, onOpen }) {
  const { text, t, navigate } = useContext(Ctx);
  const [detail, D] = useState(false);
  return (
    <>
      <button
        className="card"
        onClick={() => (onOpen ? onOpen(item) : D(true))}
      >
        {item.data.image ? (
          <img src={item.data.image} alt={text(item, "title")} loading="lazy" />
        ) : (
          <div className={"card-art " + item.module}>
            {item.module === "events" ? (
              <Calendar size={35} />
            ) : item.module === "sermons" || item.module === "videos" ? (
              <Play size={35} />
            ) : (
              <BookOpen size={35} />
            )}
          </div>
        )}
        <div className="card-body">
          <span className="eyebrow gold">
            {(item.data.featured || item.data.important
              ? t("FEATURED · ", "சிறப்பு · ")
              : "") +
              (item.category ||
                item.data.reference ||
                t("RICH IN GLORY", "மகிமையின் ஐசுவரியம்"))}
          </span>
          <h3>{text(item, "title")}</h3>
          <p>{text(item, "body").slice(0, 150)}</p>
          <div className="card-bottom">
            <span>{item.data.date || item.data.preacher || ""}</span>
            <ArrowUpRight size={19} />
          </div>
        </div>
      </button>
      {detail && <Detail item={item} close={() => D(false)} />}
    </>
  );
}
function Prose({ value }) {
  return (
    <div className="prose">
      {value.split(/\n\s*\n/).map((block, n) =>
        block.startsWith("## ") ? (
          <h3 key={n}>{block.slice(3)}</h3>
        ) : block.split("\n").every((line) => line.startsWith("- ")) ? (
          <ul key={n}>
            {block.split("\n").map((line, i) => (
              <li key={i}>{line.slice(2)}</li>
            ))}
          </ul>
        ) : (
          <p key={n}>{block}</p>
        ),
      )}
    </div>
  );
}
function Modal({ children, close, label, className = "" }) {
  const closeRef = React.useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const fn = (e) => {
      if (e.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", fn);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", fn);
      document.body.style.overflow = old;
    };
  }, []);
  const ref = React.useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.focus();
    return () => prev?.focus();
  }, []);
  return (
    <div
      className="modal-shade"
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div
        className={"modal " + className}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        ref={ref}
        onKeyDown={(e) => {
          if (e.key === "Tab") {
            const all = ref.current.querySelectorAll(
              'button,a,input,textarea,select,[tabindex="0"]',
            );
            const first = all[0],
              last = all[all.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <button className="modal-close" onClick={close} aria-label="Close">
          <X />
        </button>
        {children}
      </div>
    </div>
  );
}
function youtube(url) {
  try {
    const u = new URL(url);
    let id =
      u.hostname === "youtu.be"
        ? u.pathname.slice(1)
        : u.searchParams.get("v") || u.pathname.split("/").at(-1);
    return /^[A-Za-z0-9_-]{11}$/.test(id)
      ? "https://www.youtube-nocookie.com/embed/" + id
      : null;
  } catch {
    return null;
  }
}
function Detail({ item, close }) {
  const { text, t } = useContext(Ctx);
  let vid = youtube(item.data.video);
  return (
    <Modal close={close} label={text(item, "title")}>
      <span className="eyebrow gold">{item.category}</span>
      <h2>{text(item, "title")}</h2>
      {item.module === "photos" && item.data.image && (
        <img
          className="lightbox"
          src={item.data.image}
          alt={text(item, "title")}
        />
      )}
      <p>
        {item.data.date} {item.data.time} {item.data.venue}
      </p>
      {vid && (
        <iframe
          className="video-frame"
          src={vid}
          title={text(item, "title")}
          allowFullScreen
        />
      )}
      <Prose value={text(item, "body")} />
      {item.data.credit && (
        <p className="source-credit">
          Photo: {item.data.credit} · {item.data.captured_month} ·{" "}
          <a href={item.data.source_url} target="_blank" rel="noreferrer">
            Google Maps
          </a>
        </p>
      )}
      {[
        "preacher",
        "reference",
        "translation",
        "questions",
        "notes",
        "book",
        "chapter",
      ]
        .filter((k) => item.data[k])
        .map((k) => (
          <p key={k}>
            <strong>
              {t(
                k,
                {
                  preacher: "பிரசங்கி",
                  reference: "வசனக் குறிப்பு",
                  translation: "மொழிபெயர்ப்பு",
                  questions: "கேள்விகள்",
                  notes: "குறிப்புகள்",
                  book: "புத்தகம்",
                  chapter: "அதிகாரம்",
                }[k],
              )}
              :{" "}
            </strong>
            {item.data[k]}
          </p>
        ))}
      {item.data.attachment && (
        <a href={item.data.attachment} target="_blank" rel="noreferrer">
          {t("Open attachment", "இணைப்பைத் திறக்க")}
        </a>
      )}
      {item.module === "verses" && <Share item={item} />}{" "}
      {item.module === "events" &&
        item.data.registration &&
        item.data.date >= new Date().toISOString().slice(0, 10) && (
          <Form
            endpoint={"/events/" + item.id + "/register"}
            kind="registration"
          />
        )}
    </Modal>
  );
}
function Share({ item }) {
  const { t, text } = useContext(Ctx);
  const [notice, N] = useState("");
  const verse = text(item, "body") + " — " + item.data.reference;
  return (
    <div className="share">
      <button
        className="button outline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(verse);
            N(t("Copied", "நகலெடுக்கப்பட்டது"));
          } catch {
            N(
              t(
                "Unable to copy. Select the text above.",
                "மேலுள்ள உரையைத் தேர்ந்தெடுத்து நகலெடுக்கவும்.",
              ),
            );
          }
        }}
      >
        <Copy size={16} />
        {t("Copy verse", "வசனத்தை நகலெடு")}
      </button>
      <a
        className="button"
        target="_blank"
        rel="noreferrer"
        href={"https://wa.me/?text=" + encodeURIComponent(verse)}
      >
        {t("Share on WhatsApp", "WhatsApp இல் பகிர்")}
      </a>
      <span role="status">{notice}</span>
    </div>
  );
}
function Listing({ module }) {
  const { lang, t, text, user, navigate } = useContext(Ctx);
  const [query, Q] = useState(""),
    [category, C] = useState(""),
    [page, P] = useState(1),
    [period, S] = useState("upcoming"),
    [album, A] = useState("");
  const s = useData(
    "/content/" +
      module +
      "?q=" +
      encodeURIComponent(query) +
      "&category=" +
      encodeURIComponent(category) +
      "&page=" +
      page +
      "&size=9&" +
      (module === "events"
        ? "period=" + period
        : module === "photos"
          ? "album=" + album
          : ""),
  );
  const prog = useData(user && module === "reading" ? "/progress" : "/session");
  const albums = useData("/content/albums?size=100");
  const [actionError, E] = useState("");
  let items = s.data?.items || [];
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  if (module === "events")
    items = items.filter((i) =>
      period === "past" ? i.data.date < today : i.data.date >= today,
    );
  if (module === "photos" && album)
    items = items.filter((i) => i.parent_id === Number(album));
  if (module === "verses")
    items = [...items]
      .filter((i) => i.data.month <= today.slice(0, 7))
      .sort((a, b) => b.data.month.localeCompare(a.data.month));
  if (module === "reading")
    items = [...items].sort((a, b) =>
      (a.data.date || "").localeCompare(b.data.date || ""),
    );
  const done = new Set(prog.data?.items?.map((p) => p.reading_id) || []);
  return (
    <section className="page section">
      <span className="eyebrow gold">RICH IN GLORY CHURCH</span>
      <h1>{names[module][lang === "ta" ? 1 : 0]}</h1>
      <div className="filters">
        <label className="search">
          <Search size={18} />
          <input
            aria-label={t("Search", "தேடல்")}
            placeholder={t("Search this collection…", "தேடுங்கள்…")}
            value={query}
            onChange={(e) => {
              Q(e.target.value);
              P(1);
            }}
          />
        </label>
        <select
          aria-label={t("Category", "வகை")}
          value={category}
          onChange={(e) => {
            C(e.target.value);
            P(1);
          }}
        >
          <option value="">{t("All categories", "அனைத்து வகைகளும்")}</option>
          {s.data?.categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        {module === "events" && (
          <select
            aria-label="Event period"
            value={period}
            onChange={(e) => {
              S(e.target.value);
              P(1);
            }}
          >
            <option value="upcoming">{t("Upcoming", "வரவிருக்கும்")}</option>
            <option value="past">{t("Past events", "கடந்த நிகழ்வுகள்")}</option>
          </select>
        )}
        {module === "photos" && (
          <select
            value={album}
            onChange={(e) => {
              A(e.target.value);
              P(1);
            }}
            aria-label="Album"
          >
            <option value="">{t("All albums", "அனைத்து ஆல்பங்கள்")}</option>
            {albums.data?.items.map((a) => (
              <option key={a.id} value={a.id}>
                {text(a, "title")}
              </option>
            ))}
          </select>
        )}
      </div>
      <Notice
        error={s.error || actionError}
        loading={s.loading}
        empty={!s.loading && !items.length}
      />
      {module === "reading" && (
        <div className="reading-summary">
          <BookOpen />
          <div>
            <strong>
              {done.size} {t("readings completed", "வாசிப்புகள் முடிந்தன")}
            </strong>
            <p>
              {t("This week", "இந்த வாரம்")}: {prog.data?.weekly || 0} ·{" "}
              {t("This month", "இந்த மாதம்")}: {prog.data?.monthly || 0}
            </p>
            {!user && (
              <button className="text-link" onClick={() => navigate("account")}>
                {t(
                  "Sign in to save your progress",
                  "முன்னேற்றத்தை சேமிக்க உள்நுழையுங்கள்",
                )}
              </button>
            )}
          </div>
        </div>
      )}
      {module === "faqs" ? (
        <div className="faqs">
          {items.map((i) => (
            <details key={i.id}>
              <summary>
                {text(i, "title")}
                <ChevronDown size={18} />
              </summary>
              <p>{text(i, "body")}</p>
            </details>
          ))}
        </div>
      ) : module === "verses" ? (
        <div className="verse-list">
          {items.map((i) => (
            <article key={i.id}>
              <span className="eyebrow gold">
                {i.data.month} · {i.data.reference}
              </span>
              <h2>{text(i, "body")}</h2>
              <p>{i.data.translation}</p>
              <Share item={i} />
            </article>
          ))}
        </div>
      ) : module === "reading" ? (
        <div className="reading-list">
          {items.map((i) => (
            <label key={i.id}>
              <input
                type="checkbox"
                checked={done.has(i.id)}
                onChange={async (e) => {
                  if (!user) {
                    navigate("account");
                    return;
                  }
                  try {
                    await api("/progress/" + i.id, "PUT", {
                      completed: e.target.checked,
                    });
                    prog.reload();
                  } catch (x) {
                    E(x.message);
                  }
                }}
              />
              <span>
                {i.data.date}
                <strong>
                  {i.data.reference} · {text(i, "title")}
                </strong>
              </span>
            </label>
          ))}
        </div>
      ) : (
        <div className="cards">
          {items.map((i) => (
            <Card key={i.id} item={i} />
          ))}
        </div>
      )}
      {module === "about" && (
        <>
          <h2>{t("Our leadership", "எங்கள் தலைமை")}</h2>
          <Embedded module="leadership" />
          <h2>{t("Gather with us", "எங்களோடு கூடுங்கள்")}</h2>
          <Embedded module="services" />
        </>
      )}
      {s.data?.total > 9 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => P(page - 1)}>
            {t("Previous", "முந்தைய")}
          </button>
          <span>
            {page} / {Math.ceil(s.data.total / 9)}
          </span>
          <button
            disabled={page * 9 >= s.data.total}
            onClick={() => P(page + 1)}
          >
            {t("Next", "அடுத்த")}
          </button>
        </div>
      )}
    </section>
  );
}
function Embedded({ module }) {
  const s = useData("/content/" + module);
  return (
    <>
      <Notice error={s.error} loading={s.loading} empty={s.data?.total === 0} />
      <div className="cards">
        {s.data?.items.map((i) => (
          <Card key={i.id} item={i} />
        ))}
      </div>
    </>
  );
}
function Form({ endpoint, kind }) {
  const { t } = useContext(Ctx);
  const [error, E] = useState(""),
    [sent, S] = useState(false),
    [busy, B] = useState(false);
  if (sent)
    return (
      <div role="status" className="success">
        <Check />
        <h3>
          {t(
            "Thank you. We’ve received your request.",
            "நன்றி. உங்கள் வேண்டுதல் பெறப்பட்டது.",
          )}
        </h3>
        <p>
          {t(
            "Your details are kept private.",
            "உங்கள் விவரங்கள் தனிப்பட்ட முறையில் பாதுகாக்கப்படும்.",
          )}
        </p>
        <button onClick={() => S(false)}>
          {t("Send another", "மற்றொரு வேண்டுதல்")}
        </button>
      </div>
    );
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const p = Object.fromEntries(new FormData(e.currentTarget));
        p.consent = p.consent === "on";
        B(true);
        E("");
        try {
          await api(endpoint, "POST", p);
          S(true);
        } catch (x) {
          E(x.message);
        } finally {
          B(false);
        }
      }}
    >
      <label>
        {t("Your name", "உங்கள் பெயர்")}{" "}
        {kind === "prayer" && t("(optional)", "(விருப்பத்தேர்வு)")}
        <input
          name="name"
          maxLength={100}
          required={kind !== "prayer"}
          autoComplete="name"
        />
      </label>
      <label>
        {t("Email or phone", "மின்னஞ்சல் அல்லது தொலைபேசி")}{" "}
        {kind === "prayer" && t("(optional)", "(விருப்பத்தேர்வு)")}
        <input name="contact" maxLength={254} required={kind !== "prayer"} />
      </label>
      {kind === "prayer" && (
        <label>
          {t("Prayer category", "ஜெப வகை")}
          <select name="category">
            {[
              ["General", "பொது"],
              ["Family", "குடும்பம்"],
              ["Healing", "சுகம்"],
              ["Guidance", "வழிகாட்டுதல்"],
              ["Thanksgiving", "நன்றி"],
            ].map(([en, ta]) => (
              <option value={en} key={en}>
                {t(en, ta)}
              </option>
            ))}
          </select>
        </label>
      )}
      {kind !== "registration" && (
        <label>
          {t("What’s on your heart?", "உங்கள் இருதயத்தில் என்ன உள்ளது?")}
          <textarea name="message" rows={5} maxLength={5000} required />
        </label>
      )}
      <label className="check-label">
        <input type="checkbox" name="consent" required />
        <span>
          {t(
            "I consent to the church team using these details to respond to my request. They will remain private and completed requests are retained for up to 90 days under the church’s policy.",
            "என் வேண்டுதலுக்கு பதிலளிக்க சபை குழு இவ்விவரங்களை பயன்படுத்த ஒப்புக்கொள்கிறேன். விவரங்கள் தனிப்பட்டவை; முடிக்கப்பட்ட வேண்டுதல்கள் சபையின் கொள்கைப்படி 90 நாட்கள் வரை பாதுகாக்கப்படும்.",
          )}
        </span>
      </label>
      <Notice error={error} />
      <button disabled={busy} className="button" type="submit">
        {busy
          ? t("Sending…", "அனுப்புகிறது…")
          : kind === "registration"
            ? t("Register", "பதிவு செய்")
            : t("Send request", "வேண்டுதலை அனுப்பு")}
        <ArrowUpRight size={17} />
      </button>
    </form>
  );
}
function Intake({ kind }) {
  const { t, settings } = useContext(Ctx);
  return (
    <section className="page section intake">
      <div>
        <span className="eyebrow gold">
          {t("YOU ARE WELCOME HERE", "உங்களை அன்புடன் வரவேற்கிறோம்")}
        </span>
        <h1>
          {kind === "prayer"
            ? t("We’re here to pray\nwith you.", "உங்களோடு\nஜெபிக்கிறோம்.")
            : t(
                "Your first visit.\nA warm welcome.",
                "உங்கள் முதல் வருகை.\nஅன்பான வரவேற்பு.",
              )}
        </h1>
        <p>
          {kind === "prayer"
            ? t(
                "Whatever you’re carrying, you don’t need to carry it alone. Our prayer team will receive your request in confidence.",
                "உங்கள் பாரத்தை தனியாக சுமக்க வேண்டியதில்லை. எங்கள் ஜெபக் குழு உங்கள் வேண்டுதலை ரகசியமாக பெறும்.",
              )
            : t(
                "Let us help you plan your visit. Send us a message for current service times and directions.",
                "உங்கள் வருகையை திட்டமிட உதவுகிறோம். ஆராதனை நேரங்களுக்கும் வழிகாட்டுதலுக்கும் செய்தி அனுப்புங்கள்.",
              )}
        </p>
        {kind === "contact" && (
          <div className="contact-info">
            <p>
              <MapPin size={19} />
              {settings.address ||
                t(
                  "Church address awaiting confirmation",
                  "சபை முகவரி உறுதிப்படுத்தப்பட வேண்டும்",
                )}
            </p>
            {settings.phone && (
              <a href={"tel:" + settings.phone}>{settings.phone}</a>
            )}
            {settings.email && (
              <a href={"mailto:" + settings.email}>{settings.email}</a>
            )}
            {settings.whatsapp && (
              <a
                href={"https://wa.me/" + settings.whatsapp.replace(/\D/g, "")}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
                <ArrowUpRight size={15} />
              </a>
            )}
            {settings.maps && (
              <a href={settings.maps} target="_blank" rel="noreferrer">
                {t("Open Google Maps", "Google Maps திறக்க")}
                <ArrowUpRight size={15} />
              </a>
            )}
            <Embedded module="services" />
          </div>
        )}
        <span className="privacy-note">
          <Shield size={15} />
          {t(
            "Shared with authorized church staff only.",
            "அங்கீகரிக்கப்பட்ட சபை ஊழியர்களுடன் மட்டும் பகிரப்படும்.",
          )}
        </span>
      </div>
      <div className="form-panel">
        <Form key={kind} endpoint={"/" + kind} kind={kind} />
      </div>
    </section>
  );
}
function Account() {
  const { user, setUser, t, navigate } = useContext(Ctx);
  const [mode, M] = useState("login"),
    [error, E] = useState(""),
    [busy, B] = useState(false),
    [notice, N] = useState(""),
    [showPassword, ShowPassword] = useState(false);
  return (
    <section
      className={"page section account " + (!user ? "account-login" : "")}
    >
      {!user && (
        <div className="login-story">
          <Brand />
          <span className="eyebrow gold">CHURCH OFFICE · RICH IN GLORY</span>
          <h2>
            A thoughtful space.
            <br />
            <em>For meaningful ministry.</em>
          </h2>
          <p>
            Serve your church family with care. Manage content, connect with
            your community, and keep every detail in one place.
          </p>
          <div className="login-story-note">
            <Shield size={20} />
            <span>
              Secure access for our church team
              <br />
              <small>மகிமையின் ஐசுவரியம் ஜெப ஆலயம்</small>
            </span>
          </div>
        </div>
      )}
      <span className="eyebrow gold">
        {t("YOUR WALK OF FAITH", "உங்கள் விசுவாச நடை")}
      </span>
      <h1>
        {user
          ? t("Welcome back.", "மீண்டும் வரவேற்கிறோம்.")
          : t("Grow, one day at a time.", "நாள்தோறும் வளருங்கள்.")}
      </h1>
      {user ? (
        <>
          <p>{user.email}</p>
          <Link to="reading" className="button">
            {t("My reading plan", "என் வாசிப்புத் திட்டம்")}
            <BookOpen size={17} />
          </Link>
          {user.role !== "member" && (
            <Link to="admin" className="button outline">
              {t("Open dashboard", "நிர்வாகப் பலகை")}
            </Link>
          )}
          <button
            className="text-link"
            onClick={async () => {
              try {
                await api("/logout", "POST", {});
                setUser(null);
                await api("/session");
              } catch (e) {
                E(e.message);
              }
            }}
          >
            <LogOut size={16} />
            {t("Sign out", "வெளியேறு")}
          </button>
        </>
      ) : (
        <div className="form-panel">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              E("");
              N("");
              B(true);
              try {
                const p = Object.fromEntries(new FormData(e.currentTarget));
                let x = await api("/" + mode, "POST", p);
                if (mode === "login") {
                  setUser(x.user);
                  navigate(x.user.role === "member" ? "reading" : "admin");
                } else {
                  M("login");
                  N(
                    t(
                      "Account created. Please sign in.",
                      "கணக்கு உருவாக்கப்பட்டது. உள்நுழையுங்கள்.",
                    ),
                  );
                }
              } catch (x) {
                E(x.message);
              } finally {
                B(false);
              }
            }}
          >
            <span className="eyebrow gold">
              <LockKeyhole size={15} /> YOUR CHURCH WORKSPACE
            </span>
            <h3>
              {mode === "login"
                ? t("Sign in", "உள்நுழை")
                : t("Create a member account", "உறுப்பினர் கணக்கு உருவாக்கு")}
            </h3>
            <label>
              {t("Email", "மின்னஞ்சல்")}
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>
            <label>
              {t("Password", "கடவுச்சொல்")}
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={mode === "register" ? 12 : 1}
                maxLength={256}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
              />
            </label>
            <button
              type="button"
              className="password-toggle"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => ShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}{" "}
              {showPassword ? "Hide password" : "Show password"}
            </button>
            <Notice error={error} />
            <p role="status">{notice}</p>
            <button className="button" disabled={busy}>
              {busy
                ? t("Please wait…", "காத்திருங்கள்…")
                : mode === "login"
                  ? t("Sign in", "உள்நுழை")
                  : t("Create account", "கணக்கு உருவாக்கு")}
            </button>
            <button
              type="button"
              className="text-link"
              onClick={() => {
                M(mode === "login" ? "register" : "login");
                E("");
              }}
            >
              {mode === "login"
                ? t(
                    "New here? Create a member account",
                    "புதியவரா? உறுப்பினர் கணக்கு உருவாக்குங்கள்",
                  )
                : t(
                    "Already registered? Sign in",
                    "ஏற்கனவே பதிவு செய்தவரா? உள்நுழையுங்கள்",
                  )}
            </button>
          </form>
        </div>
      )}
      <Notice error={user ? error : ""} />
    </section>
  );
}
function Giving() {
  const { t, settings } = useContext(Ctx);
  return (
    <section className="section page">
      <span className="eyebrow gold">
        {t("A GENEROUS HEART", "தாராளமான இருதயம்")}
      </span>
      <h1>{t("Giving", "காணிக்கை")}</h1>
      {settings.donation_verified && settings.donation_url ? (
        <a
          className="button"
          href={settings.donation_url}
          target="_blank"
          rel="noreferrer"
        >
          {t(
            "Continue to church payment provider",
            "சபையின் கட்டண சேவைக்கு செல்லுங்கள்",
          )}
          <ArrowUpRight size={17} />
        </a>
      ) : (
        <p>
          {t(
            "Online giving will be available when the church confirms its donation details.",
            "சபை காணிக்கை விவரங்களை உறுதிப்படுத்தியதும் இணைய காணிக்கை வசதி கிடைக்கும்.",
          )}
        </p>
      )}
    </section>
  );
}
const modules = [
  "about",
  "leadership",
  "services",
  "sermons",
  "events",
  "verses",
  "reading",
  "studies",
  "albums",
  "photos",
  "videos",
  "articles",
  "messages",
  "faqs",
];
const fieldSets = {
  about: ["image"],
  leadership: ["image", "role"],
  services: ["time", "venue"],
  sermons: ["preacher", "date", "reference", "video", "image", "featured"],
  events: ["date", "time", "venue", "image", "registration"],
  verses: ["month", "reference", "translation", "rights_confirmed"],
  reading: ["date", "reference", "plan"],
  studies: ["book", "chapter", "reference", "questions", "notes", "image"],
  albums: ["image"],
  photos: ["image"],
  videos: ["video", "image", "date"],
  articles: ["author", "date", "image"],
  messages: ["date", "important", "attachment"],
  faqs: [],
};
const booleans = ["featured", "registration", "important", "rights_confirmed"];
const fieldLabels = {
  image: ["Image URL", "பட இணைப்பு"],
  role: ["Leadership role", "தலைமை பொறுப்பு"],
  time: ["Time", "நேரம்"],
  venue: ["Venue", "இடம்"],
  preacher: ["Preacher", "பிரசங்கி"],
  date: ["Date", "தேதி"],
  reference: ["Scripture reference", "வசனக் குறிப்பு"],
  video: ["YouTube URL", "YouTube இணைப்பு"],
  featured: ["Featured", "சிறப்பு"],
  registration: ["Enable registration", "பதிவை இயக்கு"],
  month: ["Month", "மாதம்"],
  translation: ["Translation attribution", "மொழிபெயர்ப்பு விவரம்"],
  plan: ["Plan name", "திட்டத்தின் பெயர்"],
  book: ["Bible book", "வேதாகம புத்தகம்"],
  chapter: ["Chapter", "அதிகாரம்"],
  questions: ["Discussion questions", "கலந்துரையாடல் கேள்விகள்"],
  notes: ["Study notes", "ஆய்வு குறிப்புகள்"],
  author: ["Author", "ஆசிரியர்"],
  important: ["Highlight message", "சிறப்பு அறிவிப்பு"],
  attachment: ["Attachment URL", "இணைப்பு URL"],
};
const adminLabels = {
  overview: ["Overview", "மேலோட்டம்"],
  prayer: ["Prayer inbox", "ஜெப வேண்டுதல்கள்"],
  contact: ["Enquiries", "விசாரணைகள்"],
  registrations: ["Registrations", "பதிவுகள்"],
  settings: ["Settings", "அமைப்புகள்"],
  users: ["Users & roles", "பயனர்கள்"],
  audit: ["Audit log", "செயல்பாட்டு பதிவு"],
};
const adminIcons = {
  overview: LayoutDashboard,
  about: Church,
  leadership: Users,
  services: Sun,
  sermons: Play,
  events: Calendar,
  verses: BookOpen,
  reading: BookOpen,
  studies: FileText,
  albums: Folder,
  photos: Image,
  videos: Video,
  articles: FileText,
  messages: MessageSquare,
  faqs: MessageSquare,
  prayer: Heart,
  contact: Mail,
  registrations: ClipboardList,
  settings: Settings,
  users: Users,
  audit: History,
};
const adminGroups = [
  ["Workspace", ["overview"]],
  ["Church & community", ["about", "leadership", "services", "events"]],
  ["Word & teaching", ["sermons", "verses", "reading", "studies"]],
  [
    "Media & publishing",
    ["albums", "photos", "videos", "articles", "messages", "faqs"],
  ],
  ["Care & connections", ["prayer", "contact", "registrations"]],
  ["Administration", ["settings", "users", "audit"]],
];
function Admin() {
  const {
    user,
    sessionReady,
    t,
    lang,
    setLang,
    navigate,
    setUser,
    reloadSettings,
  } = useContext(Ctx);
  const [module, M] = useState("overview"),
    [edit, E] = useState(null),
    [view, V] = useState(null),
    [remove, D] = useState(null),
    [feedback, N] = useState(null),
    [busy, B] = useState(false),
    [collapsed, C] = useState(false),
    [drawer, O] = useState(false),
    [search, Q] = useState(""),
    [query, K] = useState(""),
    [status, S] = useState(""),
    [page, P] = useState(1);
  const [mobile, Mobile] = useState(
    () => matchMedia("(max-width:600px)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(max-width:600px)");
    const changed = () => Mobile(media.matches);
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, []);
  const contentRef = React.useRef(null);
  const allowed =
    user?.role === "admin"
      ? [
          "overview",
          ...modules,
          "prayer",
          "contact",
          "registrations",
          "settings",
          "users",
          "audit",
        ]
      : user?.role === "editor"
        ? ["overview", ...modules]
        : ["overview", "prayer"];
  const label = (m) => t(...(adminLabels[m] || names[m] || [m, m]));
  useEffect(() => {
    const timer = setTimeout(() => {
      K(search);
      P(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    document.body.classList.add("admin-mode");
    return () => document.body.classList.remove("admin-mode");
  }, []);
  const select = (m) => {
    M(m);
    E(null);
    V(null);
    Q("");
    K("");
    S("");
    P(1);
    N(null);
    O(false);
    contentRef.current?.scrollTo(0, 0);
  };
  const isContent = modules.includes(module);
  const path =
    !user || user.role === "member"
      ? null
      : module === "overview"
        ? "/admin/overview"
        : module === "settings"
          ? "/settings"
          : (isContent ? "/admin/content/" : "/admin/private/") +
            module +
            "?q=" +
            encodeURIComponent(query) +
            "&status=" +
            encodeURIComponent(status) +
            "&page=" +
            page;
  const s = useData(path);
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => N(null), 6000);
    return () => clearTimeout(timer);
  }, [feedback]);
  if (!sessionReady)
    return (
      <div className="staff-loading" role="status">
        <LoaderCircle size={24} /> Loading church workspace…
      </div>
    );
  if (!user)
    return (
      <div className="staff-login">
        <Account />
      </div>
    );
  if (user.role === "member")
    return (
      <section className="staff-denied">
        <Shield size={36} />
        <h1>{t("Staff access required", "ஊழியர் அணுகல் தேவை")}</h1>
        <p>
          {t(
            "Your account is a member account. An administrator can assign a staff role.",
            "நிர்வாகி ஊழியர் பொறுப்பை வழங்கலாம்.",
          )}
        </p>
        <Link to="account" className="button">
          My account
        </Link>
      </section>
    );
  const fresh = () =>
    E({
      module,
      title_en: "",
      title_ta: "",
      body_en: "",
      body_ta: "",
      category: "",
      status: "draft",
      publish_at: "",
      sort_order: 0,
      parent_id: null,
      data: {},
    });
  async function action(fn) {
    if (busy) return;
    B(true);
    N(null);
    try {
      await fn();
      N({
        text: t("Changes saved successfully.", "மாற்றங்கள் சேமிக்கப்பட்டன."),
        error: false,
      });
      s.reload();
      return true;
    } catch (e) {
      N({ text: e.message, error: true });
      return false;
    } finally {
      B(false);
    }
  }
  const total = s.data?.total || 0;
  return (
    <section
      className={
        "admin-shell premium-admin " + (collapsed ? "sidebar-compact" : "")
      }
    >
      {drawer && (
        <button
          className="admin-backdrop"
          aria-label="Close navigation"
          onClick={() => O(false)}
        />
      )}
      <aside
        inert={mobile && !drawer ? true : undefined}
        className={drawer ? "drawer-open" : ""}
      >
        <div className="office-brand">
          <span className="brand-mark">✝</span>
          <div>
            <strong>RICH IN GLORY</strong>
            <small>CHURCH WORKSPACE</small>
          </div>
          <button
            className="drawer-close"
            aria-label="Close navigation"
            onClick={() => O(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="sidebar-nav">
          {adminGroups.map(
            ([group, items]) =>
              items.some((m) => allowed.includes(m)) && (
                <details key={group} open className="nav-group">
                  <summary>
                    {group}
                    <ChevronDown size={13} />
                  </summary>
                  {items
                    .filter((m) => allowed.includes(m))
                    .map((m) => {
                      const Icon = adminIcons[m];
                      return (
                        <button
                          title={label(m)}
                          aria-current={m === module ? "page" : undefined}
                          className={m === module ? "selected" : ""}
                          key={m}
                          onClick={() => select(m)}
                        >
                          <Icon size={18} />
                          <span>{label(m)}</span>
                          {m === module && <i />}
                        </button>
                      );
                    })}
                </details>
              ),
          )}
        </div>
        <div className="sidebar-bottom">
          <button
            onClick={() => C(!collapsed)}
            className="sidebar-toggle"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
            <span>Collapse sidebar</span>
          </button>
          <button
            onClick={async () => {
              await action(async () => {
                await api("/logout", "POST", {});
                setUser(null);
                await api("/session");
                navigate("account");
              });
            }}
          >
            <LogOut size={18} />
            <span>{t("Sign out", "வெளியேறு")}</span>
          </button>
        </div>
      </aside>
      <div className="admin-workspace">
        <div className="admin-topbar">
          <div>
            <button
              className="mobile-nav-toggle"
              aria-label="Open navigation"
              onClick={() => O(true)}
            >
              <Menu size={21} />
            </button>
            <span>Church office</span>
            <ChevronLeft size={13} className="breadcrumb-arrow" />
            <strong>{label(module)}</strong>
          </div>
          <div>
            <button
              className="admin-language-switch"
              onClick={() => setLang(lang === "en" ? "ta" : "en")}
            >
              {lang === "en" ? "தமிழ்" : "EN"}
            </button>
            <Link to="home" className="website-link">
              View website <ArrowUpRight size={14} />
            </Link>
            <button
              className="admin-language"
              onClick={() => navigate("account")}
              title={user.email}
            >
              <span className="user-avatar">{user.email[0].toUpperCase()}</span>
              <span>
                {user.role}
                <small>{user.email}</small>
              </span>
            </button>
          </div>
        </div>
        <div className="admin-main" ref={contentRef}>
          <div className="admin-page-heading">
            <div>
              <span className="eyebrow gold">
                RICH IN GLORY · CHURCH OFFICE
              </span>
              <h1>{label(module)}</h1>
              <p>
                {module === "overview"
                  ? t(
                      "A clear view of your church workspace.",
                      "உங்கள் சபை பணிகளின் மேலோட்டம்.",
                    )
                  : isContent
                    ? t(
                        "Create, organize, and publish with confidence.",
                        "பதிவுகளை உருவாக்கி வெளியிடுங்கள்.",
                      )
                    : t(
                        "Manage your church’s information and connections.",
                        "சபையின் தகவல்களை நிர்வகியுங்கள்.",
                      )}
              </p>
            </div>
            <div className="heading-actions">
              <button
                className="icon-button"
                aria-label="Refresh records"
                disabled={s.loading || busy}
                onClick={s.reload}
              >
                <RefreshCw size={17} />
              </button>
              {isContent && (
                <button className="button small" onClick={fresh}>
                  <Plus size={17} />
                  {t("Add content", "பதிவைச் சேர்")}
                </button>
              )}
            </div>
          </div>
          {feedback && (
            <div
              role={feedback.error ? "alert" : "status"}
              className={"admin-feedback " + (feedback.error ? "error" : "")}
            >
              <CheckCircle2 size={17} />
              {feedback.text}
              <button aria-label="Dismiss notification" onClick={() => N(null)}>
                <X size={16} />
              </button>
            </div>
          )}
          <Notice error={s.error} />
          {module === "overview" && (
            <>
              <div className="overview-welcome">
                <div>
                  <span className="eyebrow">YOUR MINISTRY, CONNECTED</span>
                  <h2>Welcome to your church office.</h2>
                  <p>
                    Keep your church family informed, encouraged, and connected.
                  </p>
                </div>
                <Church size={64} />
              </div>
              <div className="stat-grid">
                {Object.entries(s.data?.counts || {}).map(([m, count]) => {
                  const Icon = adminIcons[m] || FileText;
                  return (
                    <button key={m} onClick={() => select(m)}>
                      <span className="stat-icon">
                        <Icon size={20} />
                      </span>
                      <span>{label(m)}</span>
                      <strong>{count}</strong>
                      <small>
                        Manage <ArrowUpRight size={13} />
                      </small>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {s.loading ? (
            <div
              className="admin-skeleton"
              role="status"
              aria-label="Loading records"
            >
              {[0, 1, 2, 3].map((i) => (
                <div key={i} />
              ))}
            </div>
          ) : module === "settings" && s.data ? (
            <SettingsEditor
              key={module}
              data={s.data}
              save={(p) =>
                action(async () => {
                  await api("/admin/settings", "PUT", p);
                  reloadSettings();
                })
              }
            />
          ) : null}
          {module === "users" && (
            <UserCreate
              save={(p) => action(() => api("/admin/users", "POST", p))}
            />
          )}
          {!["overview", "settings"].includes(module) && (
            <div className="records-panel">
              <div className="records-toolbar">
                <div className="admin-search">
                  <Search size={17} />
                  <input
                    aria-label="Search records"
                    placeholder={t("Search records…", "பதிவுகளைத் தேடு…")}
                    value={search}
                    onChange={(e) => Q(e.target.value)}
                  />
                  {search && (
                    <button aria-label="Clear search" onClick={() => Q("")}>
                      <X size={14} />
                    </button>
                  )}
                </div>
                {(isContent || ["prayer", "contact"].includes(module)) && (
                  <select
                    aria-label="Status filter"
                    value={status}
                    onChange={(e) => {
                      S(e.target.value);
                      P(1);
                    }}
                  >
                    <option value="">All statuses</option>
                    {(isContent
                      ? ["draft", "published", "archived"]
                      : ["New", "In Progress", "Completed"]
                    ).map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                )}
                <span>{total} records</span>
              </div>
              {!s.loading && (
                <>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>{isContent ? "Content" : "Record"}</th>
                          <th>
                            {module === "audit" ? "Date" : "Status / role"}
                          </th>
                          <th>Details</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.data?.items?.map((i) => (
                          <tr key={i.id}>
                            <td>
                              <div className="record-title">
                                {isContent && i.data?.image && (
                                  <img
                                    src={i.data.image}
                                    alt=""
                                    loading="lazy"
                                    width="40"
                                    height="40"
                                  />
                                )}
                                <div>
                                  <strong>
                                    {i.title_en ||
                                      i.name ||
                                      i.email ||
                                      i.action ||
                                      "#" + i.id}
                                  </strong>
                                  <small>{i.title_ta || "#" + i.id}</small>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span
                                className={
                                  "status-badge " +
                                  (i.status || i.role || "")
                                    .toLowerCase()
                                    .replaceAll(" ", "-")
                                }
                              >
                                {i.status ||
                                  i.role ||
                                  i.created_at?.slice(0, 10) ||
                                  "—"}
                              </span>
                            </td>
                            <td>
                              <span className="record-detail">
                                {i.category ||
                                  i.contact ||
                                  i.target ||
                                  (i.event_id ? "Event #" + i.event_id : "—")}
                              </span>
                            </td>
                            <td>
                              <div className="record-actions">
                                <button
                                  aria-label={"View record " + i.id}
                                  title="View"
                                  onClick={() => V(i)}
                                >
                                  <Eye size={15} />
                                </button>
                                {isContent ? (
                                  <>
                                    <button
                                      aria-label={"Edit record " + i.id}
                                      title="Edit"
                                      onClick={() => E(i)}
                                    >
                                      <Pencil size={15} />
                                    </button>
                                    <details className="row-menu">
                                      <summary
                                        aria-label={
                                          "More actions for record " + i.id
                                        }
                                      >
                                        •••
                                      </summary>
                                      <div>
                                        <button
                                          disabled={busy}
                                          onClick={() =>
                                            action(() =>
                                              api(
                                                "/admin/content/item/" + i.id,
                                                "PUT",
                                                {
                                                  ...i,
                                                  status:
                                                    i.status === "published"
                                                      ? "draft"
                                                      : "published",
                                                },
                                              ),
                                            )
                                          }
                                        >
                                          {i.status === "published"
                                            ? "Unpublish"
                                            : "Publish"}
                                        </button>
                                        <button
                                          disabled={busy}
                                          onClick={() =>
                                            action(() =>
                                              api(
                                                "/admin/content/item/" + i.id,
                                                "PUT",
                                                { ...i, status: "archived" },
                                              ),
                                            )
                                          }
                                        >
                                          Archive
                                        </button>
                                      </div>
                                    </details>
                                  </>
                                ) : module === "users" ? (
                                  <select
                                    aria-label={"Role for " + i.email}
                                    value={i.role}
                                    disabled={busy}
                                    onChange={(e) =>
                                      action(() =>
                                        api("/admin/users/" + i.id, "PUT", {
                                          role: e.target.value,
                                        }),
                                      )
                                    }
                                  >
                                    {[
                                      "admin",
                                      "editor",
                                      "prayer",
                                      "member",
                                    ].map((r) => (
                                      <option key={r}>{r}</option>
                                    ))}
                                  </select>
                                ) : ["prayer", "contact"].includes(module) ? (
                                  <select
                                    aria-label={"Status for record " + i.id}
                                    value={i.status}
                                    disabled={busy}
                                    onChange={(e) =>
                                      action(() =>
                                        api(
                                          "/admin/private/" +
                                            module +
                                            "/" +
                                            i.id,
                                          "PUT",
                                          { status: e.target.value },
                                        ),
                                      )
                                    }
                                  >
                                    {["New", "In Progress", "Completed"].map(
                                      (r) => (
                                        <option key={r}>{r}</option>
                                      ),
                                    )}
                                  </select>
                                ) : null}
                                {!["users", "audit"].includes(module) && (
                                  <button
                                    className="danger"
                                    aria-label={"Delete record " + i.id}
                                    title="Delete"
                                    disabled={busy}
                                    onClick={() => D(i)}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!s.data?.items?.length && (
                    <div className="admin-empty">
                      <Folder size={34} />
                      <h3>
                        {search || status
                          ? "No matching records"
                          : "Your workspace is ready"}
                      </h3>
                      <p>
                        {isContent
                          ? "Add your first record, or adjust your filters."
                          : "Records will appear here when they are received."}
                      </p>
                      {isContent && (
                        <button className="button small" onClick={fresh}>
                          <Plus size={16} />
                          Add content
                        </button>
                      )}
                    </div>
                  )}
                  <div className="admin-pagination">
                    <span>
                      {total
                        ? `${(page - 1) * 20 + 1}–${Math.min(page * 20, total)} of ${total}`
                        : "0 records"}
                    </span>
                    <div>
                      <button disabled={page === 1} onClick={() => P(page - 1)}>
                        Previous
                      </button>
                      <span>
                        Page {page} of {Math.max(1, Math.ceil(total / 20))}
                      </span>
                      <button
                        disabled={page * 20 >= total}
                        onClick={() => P(page + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {edit && (
        <ContentEditor
          item={edit}
          close={() => E(null)}
          saved={() => {
            E(null);
            s.reload();
            N({ text: "Content saved successfully.", error: false });
          }}
        />
      )}
      {view &&
        (isContent ? (
          <Detail item={view} close={() => V(null)} />
        ) : (
          <Modal label="Record details" close={() => V(null)}>
            <span className="eyebrow gold">{label(module)}</span>
            <h2>Record details</h2>
            <dl className="record-view">
              {Object.entries(view).map(([key, value]) => (
                <React.Fragment key={key}>
                  <dt>{key.replaceAll("_", " ")}</dt>
                  <dd>{String(value ?? "—")}</dd>
                </React.Fragment>
              ))}
            </dl>
          </Modal>
        ))}
      {remove && (
        <Modal label="Confirm deletion" close={() => !busy && D(null)}>
          <div className="delete-dialog">
            <span className="delete-icon">
              <Trash2 size={25} />
            </span>
            <h2>Delete this record?</h2>
            <p>
              “{remove.title_en || remove.name || "#" + remove.id}” will be
              permanently removed. This action cannot be undone.
            </p>
            <div>
              <button
                className="button outline"
                disabled={busy}
                onClick={() => D(null)}
              >
                Keep record
              </button>
              <button
                className="button destructive"
                disabled={busy}
                onClick={async () => {
                  if (
                    await action(() =>
                      api(
                        isContent
                          ? "/admin/content/item/" + remove.id
                          : "/admin/private/" + module + "/" + remove.id,
                        "DELETE",
                        { confirm: true },
                      ),
                    )
                  )
                    D(null);
                }}
              >
                {busy ? "Deleting…" : "Delete record"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

function ContentEditor({ item, close, saved }) {
  const { t } = useContext(Ctx);
  const [p, P] = useState(structuredClone(item)),
    [error, E] = useState(""),
    [busy, B] = useState(false),
    [language, Language] = useState("en");
  const albums = useData(
    item.module === "photos" ? "/admin/content/albums" : null,
  );
  const update = (k, v) => P({ ...p, [k]: v });
  const data = (k, v) => P({ ...p, data: { ...p.data, [k]: v } });
  return (
    <Modal
      close={() => !busy && close()}
      label="Content editor"
      className="content-studio"
    >
      <div className="studio-header">
        <span className="studio-module-icon">
          <FileText size={22} />
        </span>
        <div>
          <span className="eyebrow gold">
            {names[item.module]?.[0]} · {item.id ? "EDIT RECORD" : "NEW RECORD"}
          </span>
          <h2>
            {t(item.id ? "Edit content" : "Create content", "பதிவு திருத்தம்")}
          </h2>
          <p>
            {t(
              "Prepare your message. We’ll take care of the presentation.",
              "உங்கள் செய்தியை உருவாக்குங்கள்.",
            )}
          </p>
        </div>
        <span className={"status-badge " + p.status}>{p.status}</span>
      </div>
      <form
        className="studio-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!p.title_en.trim()) { Language("en"); E(t("Please enter an English title.", "ஆங்கிலத் தலைப்பை உள்ளிடுங்கள்.")); return; }
          B(true);
          E("");
          try {
            await api(
              item.id
                ? "/admin/content/item/" + item.id
                : "/admin/content/" + item.module,
              item.id ? "PUT" : "POST",
              p,
            );
            saved();
          } catch (x) {
            E(x.message);
          } finally {
            B(false);
          }
        }}
      >
        <div className="studio-scroll">
          <div className="studio-layout">
            <section className="studio-writing">
              <div className="studio-section-title">
                <div>
                  <h3>
                    {t("Content & translation", "உள்ளடக்கமும் மொழிபெயர்ப்பும்")}
                  </h3>
                  <p>
                    {t(
                      "Write in English and add a Tamil translation.",
                      "ஆங்கிலத்திலும் தமிழிலும் எழுதுங்கள்.",
                    )}
                  </p>
                </div>
                <span>01</span>
              </div>
              <div
                className="studio-language-tabs"
                role="tablist"
                aria-label="Content language"
              >
                {["en", "ta"].map((l) => (
                  <button
                    key={l}
                    type="button"
                    role="tab"
                    aria-selected={language === l}
                    aria-controls={"studio-panel-" + l}
                    id={"studio-tab-" + l}
                    onClick={() => Language(l)}
                  >
                    {l === "en" ? "English" : "தமிழ்"}
                    <span>{l === "en" ? "Primary" : "Translation"}</span>
                  </button>
                ))}
              </div>
              <div className="studio-language-panels">
                {["en", "ta"].map((l) => (
                  <div
                    key={l}
                    role="tabpanel"
                    id={"studio-panel-" + l}
                    aria-labelledby={"studio-tab-" + l}
                    hidden={language !== l}
                  >
                    <label>
                      {t("Title", "தலைப்பு")}
                      <input
                        aria-label={
                          l === "en" ? "English title" : "Tamil title"
                        }
                        placeholder={
                          l === "en"
                            ? "Give this record a clear title"
                            : "தமிழ் தலைப்பை உள்ளிடுங்கள்"
                        }
                        value={p["title_" + l]}
                        required={l === "en" && language === "en"}
                        onInvalid={() => Language(l)}
                        maxLength={255}
                        onChange={(e) => update("title_" + l, e.target.value)}
                      />
                    </label>
                    <label>
                      {t("Content", "உள்ளடக்கம்")}
                      <textarea
                        aria-label={
                          l === "en" ? "English content" : "Tamil content"
                        }
                        rows={7}
                        placeholder={
                          l === "en"
                            ? "Share the details your church family needs…"
                            : "உள்ளடக்கத்தை இங்கே எழுதுங்கள்…"
                        }
                        maxLength={20000}
                        value={p["body_" + l]}
                        onChange={(e) => update("body_" + l, e.target.value)}
                      />
                    </label>
                  </div>
                ))}
              </div>
              <p className="studio-writing-hint">
                <BookOpen size={14} />{" "}
                {t(
                  "Paragraphs, ## headings and - lists are supported.",
                  "பத்திகள், தலைப்புகள் மற்றும் பட்டியல்கள் ஆதரிக்கப்படுகின்றன.",
                )}
              </p>
            </section>
            <section className="studio-details">
              <div className="studio-section-title">
                <div>
                  <h3>{t("Publishing details", "வெளியீட்டு விவரங்கள்")}</h3>
                  <p>
                    {t(
                      "Organize this record and choose when it appears.",
                      "பதிவையும் வெளியீட்டையும் நிர்வகியுங்கள்.",
                    )}
                  </p>
                </div>
                <span>02</span>
              </div>
              <div className="editor-grid">
                <label>
                  {t("Category", "வகை")}
                  <input
                    value={p.category}
                    onChange={(e) => update("category", e.target.value)}
                  />
                </label>
                <label>
                  {t("Status", "நிலை")}
                  <select
                    aria-label={t("Publication status", "வெளியீட்டு நிலை")}
                    value={p.status}
                    onChange={(e) => update("status", e.target.value)}
                  >
                    {["draft", "published", "archived"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("Schedule publication", "வெளியீட்டு தேதி")}
                  <input
                    aria-label={t("Schedule publication", "வெளியீட்டு தேதி")}
                    type="date"
                    value={p.publish_at}
                    onChange={(e) => update("publish_at", e.target.value)}
                  />
                </label>
                <label>
                  {t("Display order", "வரிசை")}
                  <input
                    type="number"
                    value={p.sort_order}
                    onChange={(e) =>
                      update("sort_order", Number(e.target.value))
                    }
                  />
                </label>
                {fieldSets[p.module].map((k) => (
                  <label
                    key={k}
                    className={booleans.includes(k) ? "check-label" : ""}
                  >
                    {booleans.includes(k) ? (
                      <>
                        <input
                          type="checkbox"
                          checked={p.data[k] === true}
                          onChange={(e) => data(k, e.target.checked)}
                        />
                        {k === "rights_confirmed"
                          ? t(
                              "Church is authorized to publish both translations",
                              "இரு மொழிபெயர்ப்புகளையும் வெளியிட சபைக்கு அனுமதி உள்ளது",
                            )
                          : t(...fieldLabels[k])}
                      </>
                    ) : (
                      <>
                        {t(...fieldLabels[k])}
                        <input
                          aria-label={t(...fieldLabels[k])}
                          type={
                            k === "date"
                              ? "date"
                              : k === "month"
                                ? "month"
                                : "text"
                          }
                          value={p.data[k] || ""}
                          onChange={(e) => data(k, e.target.value)}
                        />
                      </>
                    )}
                  </label>
                ))}
                {p.module === "photos" && (
                  <label>
                    {t("Album", "ஆல்பம்")}
                    <select
                      value={p.parent_id || ""}
                      onChange={(e) =>
                        update(
                          "parent_id",
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                    >
                      <option value="">—</option>
                      {albums.data?.items.map((a) => (
                        <option value={a.id} key={a.id}>
                          {a.title_en}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            </section>
          </div>
          {fieldSets[p.module].includes("image") && (
            <label className="upload studio-upload">
              <Upload size={17} />
              {t(
                "Upload image (JPEG, PNG, WebP; 8 MB maximum)",
                "படம் பதிவேற்று (JPEG, PNG, WebP; அதிகபட்சம் 8 MB)",
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  B(true);
                  try {
                    const f = new FormData();
                    f.append("file", file);
                    const x = await api("/admin/uploads", "POST", f);
                    data("image", x.url);
                  } catch (x) {
                    E(x.message);
                  } finally {
                    B(false);
                  }
                }}
              />
            </label>
          )}
          {p.data.image && (
            <img
              className="studio-image-preview"
              src={p.data.image}
              alt="Selected content image"
            />
          )}
          <Notice error={error} />
        </div>
        <div className="editor-actions studio-footer">
          <span>
            <Shield size={15} />
            {p.status === "draft"
              ? "Saved as a draft until you publish"
              : "Your publication settings will be applied"}
          </span>
          <div>
            <button
              type="button"
              className="button outline"
              disabled={busy}
              onClick={close}
            >
              Cancel
            </button>
            <button className="button" disabled={busy}>
              {busy
                ? t("Saving…", "சேமிக்கிறது…")
                : t("Save content", "பதிவை சேமி")}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
function SettingsEditor({ data, save }) {
  const { t } = useContext(Ctx);
  const [p, P] = useState(data),
    [busy, B] = useState(false);
  const keys = [
    "address",
    "phone",
    "email",
    "whatsapp",
    "maps",
    "instagram",
    "facebook",
    "youtube",
    "hero_image",
    "donation_url",
  ];
  return (
    <form
      className="form-panel"
      onSubmit={async (e) => {
        e.preventDefault();
        B(true);
        await save(p);
        B(false);
      }}
    >
      {keys.map((k) => (
        <label key={k}>
          {{
            address: "Church address",
            phone: "Phone number",
            email: "Contact email",
            whatsapp: "WhatsApp number",
            maps: "Google Maps link",
            instagram: "Instagram link",
            facebook: "Facebook link",
            youtube: "YouTube channel",
            hero_image: "Homepage image URL",
            donation_url: "Donation provider link",
          }[k] || k}
          <input
            value={p[k] || ""}
            onChange={(e) => P({ ...p, [k]: e.target.value })}
          />
        </label>
      ))}
      <label className="check-label">
        <input
          type="checkbox"
          checked={p.donation_verified || false}
          onChange={(e) => P({ ...p, donation_verified: e.target.checked })}
        />
        {t(
          "I have verified the church payment link",
          "சபையின் கட்டண இணைப்பை உறுதிப்படுத்தியுள்ளேன்",
        )}
      </label>
      <button disabled={busy} className="button">
        {t("Save settings", "அமைப்புகளை சேமி")}
      </button>
    </form>
  );
}
function UserCreate({ save }) {
  const { t } = useContext(Ctx);
  const [busy, B] = useState(false);
  return (
    <details className="user-create">
      <summary>
        {t(
          "Create staff or member account",
          "ஊழியர் அல்லது உறுப்பினர் கணக்கு உருவாக்கு",
        )}
      </summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          B(true);
          await save(Object.fromEntries(new FormData(e.currentTarget)));
          B(false);
        }}
      >
        <label>
          {t("Email", "மின்னஞ்சல்")}
          <input name="email" type="email" required />
        </label>
        <label>
          {t(
            "Temporary password (12+ characters)",
            "தற்காலிக கடவுச்சொல் (12+ எழுத்துக்கள்)",
          )}
          <input name="password" type="password" minLength={12} required />
        </label>
        <label>
          {t("Role", "பொறுப்பு")}
          <select name="role">
            {["editor", "prayer", "admin", "member"].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <button className="button" disabled={busy}>
          {t("Create account", "கணக்கு உருவாக்கு")}
        </button>
      </form>
    </details>
  );
}
function Footer() {
  const { t, lang, settings } = useContext(Ctx);
  return (
    <footer>
      <div className="footer-main">
        <div>
          <Brand />
          <p>
            {t(
              "Rooted in Christ. Rich in His Glory.",
              "கிறிஸ்துவில் வேரூன்றி. அவரின் மகிமையில் நிறைந்து.",
            )}
            <span className="muted">
              {t(
                "A place for faith, hope, and belonging.",
                "விசுவாசம், நம்பிக்கை, ஐக்கியத்திற்கான இடம்.",
              )}
            </span>
          </p>
        </div>
        <div>
          <span className="micro">{t("EXPLORE", "அறிந்துகொள்ளுங்கள்")}</span>
          {["about", "sermons", "events", "reading", "studies"].map((m) => (
            <Link key={m} to={m}>
              {names[m][lang === "ta" ? 1 : 0]}
            </Link>
          ))}
        </div>
        <div>
          <span className="micro">{t("CONNECT", "இணைந்திருங்கள்")}</span>
          {["contact", "prayer", "faqs", "account"].map((m) => (
            <Link key={m} to={m}>
              {names[m][lang === "ta" ? 1 : 0]}
            </Link>
          ))}
          {["instagram", "facebook", "youtube"]
            .filter((k) => settings[k])
            .map((k) => (
              <a key={k} href={settings[k]} target="_blank" rel="noreferrer">
                {k}
                <ArrowUpRight size={12} />
              </a>
            ))}
        </div>
      </div>
      <div className="footer-bottom">
        <small>
          © {new Date().getFullYear()} {churchName}
        </small>
        <small>{t("Faith. Hope. Love.", "விசுவாசம். நம்பிக்கை. அன்பு.")}</small>
      </div>
    </footer>
  );
}
createRoot(document.getElementById("root")).render(<App />);
