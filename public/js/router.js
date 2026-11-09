/* Small History API router; no dependencies and no application data in history. */
(function (root) {
  "use strict";
  function createRouter(paths, apply, resolve = route => route, browser = root) {
    const fallback = { name: Object.keys(paths)[0], params: {} };
    const validId = id => typeof id === "string" && id.length > 0 && id !== "." && id !== ".." && !/[\u0000-\u001f\u007f/\\]/u.test(id);
    function buildRoute(route) {
      if (!Object.hasOwn(paths, route.name)) throw new Error("Rota inválida");
      return paths[route.name].replace(/:([a-zA-Z]+)/g, (_, key) => {
        const id = route.params?.[key];
        if (!validId(id)) throw new Error("Identificador inválido");
        return encodeURIComponent(id);
      });
    }
    function parseRoute(input) {
      try {
        const url = new URL(input, "http://router.local");
        if (/^\/(api|auth|oauth|invite|reset-password)(\/|$)/.test(url.pathname)) return { name: "external", params: {} };
        const path = url.pathname.replace(/\/+$/, "") || "/";
        for (const [name, pattern] of Object.entries(paths)) {
          const wanted = pattern.split("/");
          const parts = path.split("/");
          if (wanted.length !== parts.length) continue;
          const params = {};
          const matches = wanted.every((part, index) => {
            if (!part.startsWith(":")) return part === parts[index];
            const id = decodeURIComponent(parts[index]);
            if (!validId(id)) return false;
            params[part.slice(1)] = id;
            return true;
          });
          if (matches) return { name, params };
        }
      } catch { /* Malformed URI must never break boot. */ }
      return null;
    }
    const currentPath = () => browser.location.pathname + browser.location.search + browser.location.hash;
    function normalize(route) {
      try { buildRoute(route); return resolve(route) || fallback; } catch { return fallback; }
    }
    function write(route, replace) {
      const path = buildRoute(route);
      if (currentPath() === path) return;
      if (replace) browser.history.replaceState({ pugotiRouter: true }, "", path);
      else browser.history.pushState({ pugotiRouter: true }, "", path);
    }
    let started = false;
    function restore() {
      const parsed = parseRoute(browser.location.href);
      if (parsed?.name === "external") return;
      const route = normalize(parsed || fallback);
      write(route, true);
      apply(route);
    }
    return {
      parseRoute, buildRoute,
      get started() { return started; },
      start() {
        if (!started) { browser.addEventListener("popstate", restore); started = true; }
        restore();
      },
      navigate(route) {
        const safe = normalize(route);
        write(safe, safe !== route);
        apply(safe);
      },
      replaceRoute(route) { const safe = normalize(route); write(safe, true); apply(safe); },
      sync(route, replace = false) {
        const safe = normalize(route);
        if (started) write(safe, replace || safe !== route);
        return safe;
      },
      dispose() { browser.removeEventListener("popstate", restore); started = false; }
    };
  }
  root.PugotiRouter = { createRouter };
})(globalThis);

