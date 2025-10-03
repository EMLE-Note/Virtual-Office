const KPI_ENDPOINT = "https://erp.emlenotes.com/api/method/my_app.api.kpi.employee_kpis";

export function mountTopBar() {
  // اعمل الشريط
  const bar = document.createElement("div");
  bar.id = "wa-kpi-topbar";
  Object.assign(bar.style, {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    height: "40px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "0 12px",
    background: "rgba(0,0,0,0.65)",
    color: "#fff",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
    fontSize: "13px",
    zIndex: "99999",
    pointerEvents: "none",
  } as CSSStyleDeclaration);

  const container = document.createElement("div");
  Object.assign(container.style, {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    pointerEvents: "auto",
  } as CSSStyleDeclaration);

  // عناصر KPI بقيم افتراضية
  const status = document.createElement("span");
  status.textContent = "Offline";
  status.style.opacity = "0.8";

  function badge(label: string, value: string) {
    const wrap = document.createElement("span");
    wrap.textContent = `${label}: ${value}`;
    Object.assign(wrap.style, {
      padding: "4px 8px",
      borderRadius: "12px",
      background: "rgba(255,255,255,0.12)",
    } as CSSStyleDeclaration);
    return wrap;
  }

  const bOpen = badge("Open", "—");
  const bOver = badge("Overdue", "—");
  const bHours = badge("Hours Today", "—");
  const bAtt = badge("Attendance", "—");

  container.append(status, bOpen, bOver, bHours, bAtt);
  bar.appendChild(container);
  document.body.appendChild(bar);

  // نزّح الكانڤاس تحت الشريط
  const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
  if (canvas) {
    canvas.style.marginTop = "40px";
  }

  // حاول تجيب البيانات (لو فشلت هيفضل الشريط موجود)
  async function loadKPIs() {
    try {
      status.textContent = "Syncing…";
      const res = await fetch(KPI_ENDPOINT, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const payload = (data as any).message || data;

      bOpen.textContent = `Open: ${payload.open_tasks ?? 0}`;
      bOver.textContent = `Overdue: ${payload.overdue_tasks ?? 0}`;
      bHours.textContent = `Hours Today: ${Number(payload.hours_today ?? 0).toFixed(1)}`;
      bAtt.textContent = `Attendance: ${payload.attendance ?? "-"}`;

      status.textContent = "Synced";
      status.style.opacity = "0.6";
    } catch (e) {
      status.textContent = "Offline";
      status.style.opacity = "0.6";
      console.warn("KPI fetch failed:", e);
    }
  }

  loadKPIs();
  setInterval(loadKPIs, 60000);
}
