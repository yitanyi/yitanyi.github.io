/**
 * 顶部导航滚动指示（ScrollSpy）
 * - 仅对同页面的 hash 链接生效（例如 /#news）
 * - 滚动到对应标题时，自动高亮导航项（添加 .is-active）
 */
(function () {
  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function normalizePathname(pathname) {
    // 统一成以 / 结尾，尽量消除 / 与 /index.html 等差异导致匹配失败
    if (!pathname) return "/";
    // 去掉结尾的 index.html / index.htm
    pathname = pathname.replace(/index\.html?$/i, "");
    return pathname.endsWith("/") ? pathname : pathname + "/";
  }

  function getSamePageHashId(anchorEl) {
    if (!anchorEl || !anchorEl.href) return null;
    var u;
    try {
      u = new URL(anchorEl.href, window.location.href);
    } catch (e) {
      return null;
    }
    if (!u.hash) return null;
    if (u.origin !== window.location.origin) return null;

    // 只处理“同一页面”的 hash（例如当前页就是 /，链接也是 /#news）
    var currentPath = normalizePathname(window.location.pathname);
    var linkPath = normalizePathname(u.pathname);
    if (currentPath !== linkPath) return null;

    var id = u.hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch (e) {
      // ignore
    }
    return id || null;
  }

  onReady(function () {
    var nav = document.getElementById("site-nav");
    if (!nav) return;

    // 注入最小样式：避免你没重新编译 SCSS 时看不到高亮效果
    (function injectStyle() {
      if (document.getElementById("scrollspy-style")) return;
      var style = document.createElement("style");
      style.id = "scrollspy-style";
      style.textContent =
        "#site-nav .visible-links a.is-active:before{-webkit-transform:scaleX(1);-ms-transform:scaleX(1);transform:scaleX(1)}" +
        "#site-nav .hidden-links a.is-active{font-weight:700}";
      document.head.appendChild(style);
    })();

    var allLinks = Array.prototype.slice.call(nav.querySelectorAll('a[href*="#"]'));
    if (!allLinks.length) return;

    // id => links[]
    var idToLinks = new Map();
    allLinks.forEach(function (a) {
      var id = getSamePageHashId(a);
      if (!id) return;
      var target = document.getElementById(id);
      if (!target) return;
      if (!idToLinks.has(id)) idToLinks.set(id, []);
      idToLinks.get(id).push(a);
    });

    if (idToLinks.size === 0) return;

    var ids = Array.from(idToLinks.keys());
    var targets = ids
      .map(function (id) {
        return document.getElementById(id);
      })
      .filter(Boolean);

    function clearActive() {
      idToLinks.forEach(function (links) {
        links.forEach(function (a) {
          a.classList.remove("is-active");
          if (a.parentElement) a.parentElement.classList.remove("is-active");
        });
      });
    }

    function setActive(id) {
      if (!idToLinks.has(id)) return;
      clearActive();
      idToLinks.get(id).forEach(function (a) {
        a.classList.add("is-active");
        if (a.parentElement) a.parentElement.classList.add("is-active");
      });
    }

    function getTopOffset() {
      var masthead = document.querySelector(".masthead");
      return masthead ? masthead.offsetHeight : 0;
    }

    function setInitialActive() {
      if (window.location.hash) {
        var id = window.location.hash.slice(1);
        try {
          id = decodeURIComponent(id);
        } catch (e) {}
        if (idToLinks.has(id)) {
          setActive(id);
          return;
        }
      }
      // 默认激活第一个
      setActive(ids[0]);
    }

    setInitialActive();

    // 监听 hash 变化（点击导航后会触发）
    window.addEventListener("hashchange", function () {
      var id = window.location.hash.slice(1);
      try {
        id = decodeURIComponent(id);
      } catch (e) {}
      if (idToLinks.has(id)) setActive(id);
    });

    // IntersectionObserver：滚动到哪个标题附近，就激活哪个
    if ("IntersectionObserver" in window) {
      var observer = null;
      var visibleTops = new Map(); // id -> boundingClientRect.top（仅保存当前 isIntersecting 的）

      function pickAndSetActive() {
        var bestId = null;
        var bestTop = Infinity;
        visibleTops.forEach(function (top, id) {
          if (top < bestTop) {
            bestTop = top;
            bestId = id;
          }
        });
        if (bestId) setActive(bestId);
      }

      function setupObserver() {
        if (observer) observer.disconnect();
        visibleTops.clear();

        var offset = getTopOffset();
        observer = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (e) {
              if (!e.target || !e.target.id) return;
              if (e.isIntersecting) {
                visibleTops.set(e.target.id, e.boundingClientRect.top);
              } else {
                visibleTops.delete(e.target.id);
              }
            });
            pickAndSetActive();
          },
          {
            // 让“判定区域”从顶部往下偏移（避开固定导航栏遮挡）
            root: null,
            threshold: [0],
            rootMargin: "-" + (offset + 8) + "px 0px -70% 0px",
          }
        );

        targets.forEach(function (el) {
          observer.observe(el);
        });
      }

      // 简单 debounce，避免 resize 频繁重建 observer
      function debounce(fn, wait) {
        var t = 0;
        return function () {
          window.clearTimeout(t);
          t = window.setTimeout(fn, wait);
        };
      }

      setupObserver();
      window.addEventListener("resize", debounce(setupObserver, 150));
      // 某些情况下（字体/图片加载导致 masthead 高度变化），load 后再校准一次
      window.addEventListener("load", function () {
        setupObserver();
      });
    }
  });
})();
