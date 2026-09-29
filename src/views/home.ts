import { el } from "../utils";
import { navigate } from "../store";
import { buildHeader } from "./header";

export async function renderHome(): Promise<HTMLElement> {
  const wrap = el("div", "page page-home");
  wrap.appendChild(buildHeader()); // no back button on home

  const body = el("div");
  body.innerHTML = `
    <div class="home-hero">
      <div class="hero-badge">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
        All-in-One Learning Hub
      </div>
      <h1>Learn Without Limits</h1>
      <p>Select a platform to stream online batches, explore recorded lectures &amp; unlocked course materials</p>
    </div>
    <div class="platform-list">
      <div class="platform-card available" id="card-eduteria">
        <div class="platform-icon platform-icon-img">
          <img src="https://decicqog4ulhy.cloudfront.net/0/admin_v1/application_management/clientlogo/5049068166_Eduteria-logo.png" alt="Eduteria" loading="lazy"/>
        </div>
        <div class="platform-info">
          <div class="platform-name">Eduteria <span class="platform-tag">450+ Batches</span></div>
          <div class="platform-desc">BPSC, UPSC &amp; State PCS Online Batches</div>
        </div>
        <div class="platform-arrow">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </div>
      </div>
      <div class="platform-card available" id="card-nexttoppers">
        <div class="platform-icon platform-icon-img">
          <img src="https://decicqog4ulhy.cloudfront.net/0/admin_v2/uploads/courses/thumbnail/2345517_1_nexttoppers_header_logo.jpg" alt="Next Toppers" loading="lazy"/>
        </div>
        <div class="platform-info">
          <div class="platform-name">Next Toppers <span class="platform-tag">Olympiads</span></div>
          <div class="platform-desc">IOQM, Olympiads, CBSE &amp; Crash Courses</div>
        </div>
        <div class="platform-arrow">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </div>
      </div>
    </div>
  `;

  wrap.appendChild(body);
  wrap.querySelector("#card-eduteria")!.addEventListener("click", () =>
    navigate({ view: "courses", platform: "eduteria" })
  );
  wrap.querySelector("#card-nexttoppers")!.addEventListener("click", () =>
    navigate({ view: "courses", platform: "next-toppers" })
  );

  return wrap;
}
