import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// ── Color Palette (Premium B2B Dark Slate) ──────────────────────────
const C = {
  bgStart: "#0f172a",
  bgEnd: "#020617",
  accent: "#f97316",
  textPrimary: "#f8fafc",
  textSecondary: "#94a3b8",
  textTertiary: "#64748b",
  glassBg: "rgba(30,41,59,0.55)",
  glassBorder: "rgba(51,65,85,0.8)",
  green: "#4ade80",
  red: "#f87171",
  sky: "#38bdf8",
  purple: "#c084fc",
  yellow: "#facc15",
};

const CATEGORY_COLORS: Record<string, string> = {
  technology: C.sky,
  tecnologia: C.sky,
  business: "#60a5fa",
  negocios: "#60a5fa",
  alert: C.red,
  alerta: C.red,
  opportunity: C.green,
  oportunidade: C.green,
  trend: C.purple,
  tendencia: C.purple,
  market: C.yellow,
  mercado: C.yellow,
};

function getCatColor(cat: string): string {
  return CATEGORY_COLORS[cat?.toLowerCase()] || C.accent;
}

// ── Shared Components ───────────────────────────────────────────────

function GuildsBrand({ size = 28 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span
        style={{
          fontSize: size,
          fontWeight: 900,
          color: C.accent,
          letterSpacing: "0.05em",
        }}
      >
        GUILDS
      </span>
      <span
        style={{
          fontSize: size * 0.75,
          fontWeight: 300,
          color: C.textSecondary,
        }}
      >
        Intelligence
      </span>
    </div>
  );
}

function Pill({
  label,
  bgColor = "rgba(255,255,255,0.1)",
  textColor = C.textPrimary,
  fontSize = 18,
}: {
  label: string;
  bgColor?: string;
  textColor?: string;
  fontSize?: number;
}) {
  return (
    <span
      style={{
        display: "flex",
        backgroundColor: bgColor,
        color: textColor,
        padding: "6px 20px",
        borderRadius: 999,
        fontSize,
        fontWeight: 700,
        letterSpacing: "0.04em",
      }}
    >
      {label}
    </span>
  );
}

function GridOverlay() {
  return (
    <div
      style={{
        display: "flex",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
        backgroundSize: "120px 120px",
      }}
    />
  );
}

function GlassPanel({
  children,
  borderColor,
  style,
}: {
  children: React.ReactNode;
  borderColor?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: C.glassBg,
        border: `2px solid ${borderColor || C.glassBorder}`,
        borderRadius: 28,
        padding: "48px 52px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Templates ───────────────────────────────────────────────────────

function CoverCard({
  title,
  subtitle,
  clientName,
  numInsights,
  date,
}: {
  title: string;
  subtitle: string;
  clientName: string;
  numInsights: string;
  date: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: `linear-gradient(180deg, ${C.bgStart} 0%, ${C.bgEnd} 100%)`,
        padding: "60px 70px",
        position: "relative",
      }}
    >
      <GridOverlay />

      {/* Decorative circles */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 700,
          height: 700,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.04)",
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 500,
          height: 500,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.04)",
        }}
      />

      {/* Brand */}
      <GuildsBrand size={32} />

      {/* Main Glass Panel */}
      <div
        style={{
          display: "flex",
          flex: 1,
          marginTop: 40,
          position: "relative",
        }}
      >
        <GlassPanel
          style={{
            width: "100%",
            height: "100%",
            justifyContent: "center",
            gap: 24,
          }}
        >
          {/* Badge */}
          <Pill
            label="GUILDS INTELLIGENCE"
            bgColor={C.accent}
            textColor="#0f172a"
            fontSize={20}
          />

          {/* Title */}
          <span
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: C.textPrimary,
              lineHeight: 1.1,
              marginTop: 16,
            }}
          >
            {title}
          </span>

          {/* Subtitle */}
          <span
            style={{
              fontSize: 32,
              fontWeight: 300,
              color: C.textSecondary,
              lineHeight: 1.3,
            }}
          >
            {subtitle}
          </span>

          {/* Pills Row */}
          <div style={{ display: "flex", gap: 16, marginTop: 20 }}>
            <Pill label={`${numInsights} INSIGHTS`} fontSize={18} />
            <Pill label={date} textColor={C.textSecondary} fontSize={18} />
          </div>

          {/* Client Name */}
          {clientName && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 32,
                gap: 4,
              }}
            >
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 300,
                  color: C.textTertiary,
                }}
              >
                Relatório estratégico para
              </span>
              <span
                style={{
                  fontSize: 30,
                  fontWeight: 700,
                  color: C.textPrimary,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {clientName}
              </span>
            </div>
          )}
        </GlassPanel>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 24,
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 20, color: C.textTertiary }}>
          guilds.com.br
        </span>
      </div>
    </div>
  );
}

function InsightCard({
  number,
  title,
  description,
  action,
  category,
  clientName,
  date,
}: {
  number: string;
  title: string;
  description: string;
  action: string;
  category: string;
  clientName: string;
  date: string;
}) {
  const catColor = getCatColor(category);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: `linear-gradient(180deg, ${C.bgStart} 0%, ${C.bgEnd} 100%)`,
        padding: "60px 70px",
        position: "relative",
      }}
    >
      <GridOverlay />

      {/* Brand */}
      <GuildsBrand size={28} />

      {/* Main Panel */}
      <div style={{ display: "flex", flex: 1, marginTop: 32 }}>
        <GlassPanel style={{ width: "100%", height: "100%", gap: 20 }}>
          {/* Category & Number */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Pill
              label={category.toUpperCase()}
              bgColor={catColor}
              textColor="#0f172a"
              fontSize={18}
            />
          </div>

          <span
            style={{
              fontSize: 56,
              fontWeight: 900,
              color: catColor,
            }}
          >
            #{number}
          </span>

          {/* Title */}
          <span
            style={{
              fontSize: 48,
              fontWeight: 900,
              color: C.textPrimary,
              lineHeight: 1.15,
            }}
          >
            {title.length > 100 ? title.slice(0, 100) + "…" : title}
          </span>

          {/* Description */}
          <span
            style={{
              fontSize: 30,
              fontWeight: 400,
              color: C.textSecondary,
              lineHeight: 1.4,
            }}
          >
            {description.length > 200
              ? description.slice(0, 200) + "…"
              : description}
          </span>

          {/* Action box */}
          {action && (
            <div
              style={{
                display: "flex",
                marginTop: "auto",
                backgroundColor: `${catColor}15`,
                border: `1px solid ${catColor}40`,
                borderRadius: 14,
                padding: "18px 24px",
              }}
            >
              <span style={{ fontSize: 22, fontWeight: 700, color: catColor }}>
                AÇÃO:{" "}
                {action.length > 80 ? action.slice(0, 80) + "…" : action}
              </span>
            </div>
          )}
        </GlassPanel>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 20,
        }}
      >
        <span style={{ fontSize: 18, color: C.textTertiary }}>
          {clientName} • {date}
        </span>
        <span style={{ fontSize: 18, color: C.textTertiary }}>
          guilds.com.br
        </span>
      </div>
    </div>
  );
}

function AlertOpportunityCard({
  type,
  title,
  description,
  clientName,
  date,
}: {
  type: string;
  title: string;
  description: string;
  clientName: string;
  date: string;
}) {
  const isOpp =
    type.toLowerCase().includes("oportunidade") ||
    type.toLowerCase().includes("opportunity");
  const accentColor = isOpp ? C.green : C.red;
  const bgTint = isOpp ? "rgba(0,80,40,0.15)" : "rgba(80,0,0,0.15)";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: `linear-gradient(180deg, ${C.bgStart} 0%, ${C.bgEnd} 100%)`,
        padding: "60px 70px",
        position: "relative",
      }}
    >
      <GridOverlay />

      {/* Tinted overlay */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at 30% 20%, ${bgTint}, transparent 60%)`,
        }}
      />

      <GuildsBrand size={28} />

      <div style={{ display: "flex", flex: 1, marginTop: 32 }}>
        <GlassPanel
          borderColor={`${accentColor}40`}
          style={{ width: "100%", height: "100%", gap: 24 }}
        >
          <Pill
            label={type.toUpperCase()}
            bgColor={accentColor}
            textColor="#0f172a"
            fontSize={20}
          />

          <span
            style={{
              fontSize: 52,
              fontWeight: 900,
              color: C.textPrimary,
              lineHeight: 1.15,
              marginTop: 16,
            }}
          >
            {title.length > 120 ? title.slice(0, 120) + "…" : title}
          </span>

          <span
            style={{
              fontSize: 30,
              fontWeight: 400,
              color: C.textSecondary,
              lineHeight: 1.4,
            }}
          >
            {description.length > 300
              ? description.slice(0, 300) + "…"
              : description}
          </span>
        </GlassPanel>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 20,
        }}
      >
        <span style={{ fontSize: 18, color: C.textTertiary }}>
          {clientName} • {date}
        </span>
        <span style={{ fontSize: 18, color: C.textTertiary }}>
          guilds.com.br
        </span>
      </div>
    </div>
  );
}

function StoryCard({
  items,
  clientName,
  storyTitle,
  date,
}: {
  items: { titulo: string; desc: string; acao?: string }[];
  clientName: string;
  storyTitle: string;
  date: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: `linear-gradient(180deg, ${C.bgStart} 0%, ${C.bgEnd} 100%)`,
        padding: "80px 80px",
        position: "relative",
      }}
    >
      <GridOverlay />

      <GuildsBrand size={36} />

      <span
        style={{
          fontSize: 64,
          fontWeight: 900,
          color: C.textPrimary,
          lineHeight: 1.1,
          marginTop: 40,
        }}
      >
        {storyTitle}
      </span>

      {clientName && (
        <span
          style={{
            fontSize: 28,
            fontWeight: 300,
            color: C.textSecondary,
            marginTop: 16,
          }}
        >
          Para: {clientName}
        </span>
      )}

      {/* Separator */}
      <div
        style={{
          display: "flex",
          width: "100%",
          height: 2,
          backgroundColor: C.glassBorder,
          marginTop: 40,
          marginBottom: 40,
        }}
      />

      {/* Insights */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 48,
          flex: 1,
        }}
      >
        {items.slice(0, 3).map((item, i) => (
          <div
            key={i}
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            <span
              style={{ fontSize: 36, fontWeight: 900, color: C.accent }}
            >
              0{i + 1}
            </span>
            <span
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: C.textPrimary,
                lineHeight: 1.2,
              }}
            >
              {item.titulo?.length > 60
                ? item.titulo.slice(0, 60) + "…"
                : item.titulo}
            </span>
            <span
              style={{
                fontSize: 26,
                fontWeight: 400,
                color: C.textSecondary,
                lineHeight: 1.3,
              }}
            >
              {item.desc?.length > 120
                ? item.desc.slice(0, 120) + "…"
                : item.desc}
            </span>
            {item.acao && (
              <div
                style={{
                  display: "flex",
                  marginTop: 8,
                }}
              >
                <Pill
                  label={`AÇÃO: ${item.acao.length > 40 ? item.acao.slice(0, 40) + "…" : item.acao}`}
                  bgColor={`${C.accent}20`}
                  textColor={C.accent}
                  fontSize={20}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          width: "100%",
          height: 1,
          backgroundColor: "rgba(255,255,255,0.1)",
          marginTop: 40,
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 20,
        }}
      >
        <GuildsBrand size={28} />
        <span style={{ fontSize: 22, color: C.textTertiary }}>{date}</span>
      </div>
    </div>
  );
}

// ── API Handler ─────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const template = searchParams.get("template") || "cover";
  const title = searchParams.get("title") || "Market Intelligence";
  const subtitle =
    searchParams.get("subtitle") || "Panorama preditivo para o seu setor";
  const clientName = searchParams.get("clientName") || "";
  const numInsights = searchParams.get("numInsights") || "5";
  const date =
    searchParams.get("date") ||
    new Date().toLocaleDateString("pt-BR");
  const number = searchParams.get("number") || "1";
  const description = searchParams.get("description") || "";
  const action = searchParams.get("action") || "";
  const category = searchParams.get("category") || "technology";
  const type = searchParams.get("type") || "Oportunidade";

  // Story items come as JSON array
  let storyItems: { titulo: string; desc: string; acao?: string }[] = [];
  const itemsParam = searchParams.get("items");
  if (itemsParam) {
    try {
      storyItems = JSON.parse(decodeURIComponent(itemsParam));
    } catch {
      storyItems = [];
    }
  }

  // Feed = 1080x1080, Story = 1080x1920
  const isStory = template === "story";
  const width = 1080;
  const height = isStory ? 1920 : 1080;

  let element: React.ReactNode;

  switch (template) {
    case "cover":
      element = (
        <CoverCard
          title={title}
          subtitle={subtitle}
          clientName={clientName}
          numInsights={numInsights}
          date={date}
        />
      );
      break;
    case "insight":
      element = (
        <InsightCard
          number={number}
          title={title}
          description={description}
          action={action}
          category={category}
          clientName={clientName}
          date={date}
        />
      );
      break;
    case "alert":
    case "opportunity":
      element = (
        <AlertOpportunityCard
          type={type}
          title={title}
          description={description}
          clientName={clientName}
          date={date}
        />
      );
      break;
    case "story":
      element = (
        <StoryCard
          items={storyItems}
          clientName={clientName}
          storyTitle={title}
          date={date}
        />
      );
      break;
    default:
      element = (
        <CoverCard
          title={title}
          subtitle={subtitle}
          clientName={clientName}
          numInsights={numInsights}
          date={date}
        />
      );
  }

  return new ImageResponse(element, { width, height });
}
