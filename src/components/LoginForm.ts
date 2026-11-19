import { html, raw } from "hono/html";

export type ActorSuggestion = {
    handle: string;
    displayName?: string;
    avatar?: string;
};

/**
 * ハンドル候補を前方一致で絞り込む（最大5件、入力と完全一致するものは除く）。
 * ブラウザ側スクリプトにもそのまま埋め込むので、外部の値を参照しないこと。
 */
export function filterHandleSuggestions(
    actors: ActorSuggestion[],
    input: string,
): ActorSuggestion[] {
    const q = input.trim().toLowerCase().replace(/^@/, "");
    if (!q) return [];
    return actors
        .filter((a) => {
            const h = String(a.handle || "").toLowerCase();
            return h.startsWith(q) && h !== q;
        })
        .slice(0, 5);
}

const TYPEAHEAD_ENDPOINT =
    "https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead";

/** 入力欄に候補リストを付けるブラウザ側スクリプト（WAI-ARIA combobox パターン） */
const typeaheadScript = () => `
(function () {
  var filterHandleSuggestions = ${filterHandleSuggestions.toString()};
  var input = document.getElementById("handle");
  var list = document.getElementById("handle-suggestions");
  if (!input || !list) return;
  var items = [];
  var active = -1;
  var timer = null;
  var controller = null;

  function close() {
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    active = -1;
  }

  function highlight(i) {
    active = i;
    var opts = list.querySelectorAll("[role=option]");
    for (var k = 0; k < opts.length; k++) {
      opts[k].setAttribute("aria-selected", k === i ? "true" : "false");
    }
    if (i >= 0) input.setAttribute("aria-activedescendant", "handle-suggestion-" + i);
    else input.removeAttribute("aria-activedescendant");
  }

  function choose(i) {
    if (!items[i]) return;
    input.value = items[i].handle;
    close();
  }

  function render() {
    list.textContent = "";
    if (items.length === 0) { close(); return; }
    items.forEach(function (a, i) {
      var li = document.createElement("li");
      li.setAttribute("role", "presentation");
      var b = document.createElement("button");
      b.type = "button";
      b.id = "handle-suggestion-" + i;
      b.setAttribute("role", "option");
      b.setAttribute("aria-selected", "false");
      b.tabIndex = -1;
      b.className = "rt-suggestion";
      var icon;
      if (a.avatar && /^https:\\/\\//.test(a.avatar)) {
        icon = document.createElement("img");
        icon.src = a.avatar;
        icon.alt = "";
        icon.loading = "lazy";
        icon.referrerPolicy = "no-referrer";
      } else {
        icon = document.createElement("span");
        icon.textContent = a.handle.charAt(0).toUpperCase();
      }
      icon.className = "rt-suggestion-icon";
      icon.setAttribute("aria-hidden", "true");
      var text = document.createElement("span");
      text.className = "rt-suggestion-text";
      if (a.displayName) {
        var dn = document.createElement("b");
        dn.textContent = a.displayName;
        text.appendChild(dn);
      }
      var hd = document.createElement("span");
      hd.textContent = a.handle;
      text.appendChild(hd);
      b.appendChild(icon);
      b.appendChild(text);
      b.addEventListener("mousedown", function (e) { e.preventDefault(); choose(i); });
      li.appendChild(b);
      list.appendChild(li);
    });
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    highlight(-1);
  }

  function search() {
    var q = input.value.trim().replace(/^@/, "");
    if (q.length < 2) { items = []; render(); return; }
    if (controller) controller.abort();
    controller = new AbortController();
    fetch("${TYPEAHEAD_ENDPOINT}?limit=8&q=" + encodeURIComponent(q), { signal: controller.signal })
      .then(function (r) { return r.ok ? r.json() : { actors: [] }; })
      .then(function (data) {
        items = filterHandleSuggestions((data && data.actors) || [], input.value);
        if (document.activeElement === input) render();
      })
      .catch(function () {});
  }

  input.addEventListener("input", function () {
    clearTimeout(timer);
    timer = setTimeout(search, 200);
  });
  input.addEventListener("blur", close);
  input.addEventListener("keydown", function (e) {
    if (list.hidden) return;
    if (e.key === "ArrowDown") { e.preventDefault(); highlight((active + 1) % items.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); highlight((active - 1 + items.length) % items.length); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); choose(active); }
    else if (e.key === "Escape") { close(); }
  });
})();
`;

/** ハンドル入力とログインボタン。トップと /login で共用する */
export const LoginForm = (props: {
    t: (key: string, options?: any) => string;
    next?: string;
}) => {
    const { t } = props;
    return html`
        <form action="/auth/login" method="POST" class="rt-panel rt-login">
            ${props.next ? html`<input type="hidden" name="next" value="${props.next}" />` : ""}
            <label for="handle" class="rt-label">${t("auth.handle_label")}</label>
            <div class="rt-combobox">
                <input id="handle" name="handle" type="text" required
                    role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="handle-suggestions"
                    autocomplete="username" autocapitalize="none" spellcheck="false"
                    placeholder="${t("auth.handle_placeholder")}" class="rt-sunken rt-input" />
                <ul id="handle-suggestions" role="listbox" aria-label="${t("auth.suggestions_label")}" class="rt-listbox" hidden></ul>
            </div>
            <button type="submit" class="rt-bevel rt-go rt-block">${t("auth.login_button")}</button>
        </form>
        <script>${raw(typeaheadScript())}</script>
    `;
};
