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
    // 统一成以 / 结尾，避免 / 与 /index.html 等差异导致匹配失败
    if (!pathname) return "/";
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
      var offset = getTopOffset();
      var observer = new IntersectionObserver(
        function (entries) {
          var visible = entries
            .filter(function (e) {
              return e.isIntersecting;
            })
            .sort(function (a, b) {
              return a.boundingClientRect.top - b.boundingClientRect.top;
            })[0];

          if (visible && visible.target && visible.target.id) {
            setActive(visible.target.id);
          }
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
  });
})();
