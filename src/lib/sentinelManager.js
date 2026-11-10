/**
 * Section Sentinel State Store
 * Tracks the latest detected state of class attendance per academic section/group.
 * Serves as the canary beacon so clients know when a lecturer updated records upstream
 * without each client hammering the ERP with redundant queries.
 */

class SectionSentinelManager {
  constructor() {
    // Map of sectionKey -> { version, totalClasses, lastUpdated, lastProbe }
    this.sections = new Map();
  }

  _getKey(section, semester, branch) {
    if (section && section.trim()) {
      return section.trim().toUpperCase();
    }
    const b = (branch || 'GEN').trim().toUpperCase();
    const s = (semester || '0').trim();
    return `${b}_SEM${s}`;
  }

  getSectionStatus(section, semester, branch, clientVersion = 0) {
    const key = this._getKey(section, semester, branch);
    const now = Date.now();
    const state = this.sections.get(key) || {
      version: 1,
      totalClasses: 0,
      lastUpdated: now,
      lastProbe: 0
    };

    const hasUpdate = state.version > Number(clientVersion || 0);
    // Allow a background probe if idle for > 20 mins to detect unannounced lecturer updates
    const isProbeNeeded = (now - state.lastProbe) > (20 * 60 * 1000);

    if (isProbeNeeded) {
      state.lastProbe = now;
      this.sections.set(key, state);
    }

    return {
      sectionKey: key,
      hasUpdate,
      isProbeNeeded,
      serverVersion: state.version,
      lastUpdated: state.lastUpdated
    };
  }

  reportAttendanceState(section, semester, branch, totalClasses) {
    const key = this._getKey(section, semester, branch);
    const now = Date.now();
    const current = this.sections.get(key) || {
      version: 1,
      totalClasses: 0,
      lastUpdated: now,
      lastProbe: now
    };

    const numericTotal = Number(totalClasses) || 0;

    // If a higher class count is reported, bump the version to wake all other classmates
    if (numericTotal > current.totalClasses) {
      const nextVersion = current.version + 1;
      this.sections.set(key, {
        version: nextVersion,
        totalClasses: numericTotal,
        lastUpdated: now,
        lastProbe: now
      });
      return {
        bumped: true,
        version: nextVersion,
        totalClasses: numericTotal
      };
    }

    return {
      bumped: false,
      version: current.version,
      totalClasses: current.totalClasses
    };
  }
}

// Global singleton across serverless / Node invocations in Next.js
const globalForSentinel = globalThis;
export const sectionSentinel = globalForSentinel.sectionSentinel || new SectionSentinelManager();
if (process.env.NODE_ENV !== 'production') globalForSentinel.sectionSentinel = sectionSentinel;

