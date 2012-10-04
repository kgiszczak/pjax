(function () {
  var cache = {};
  var cacheEntries = [];

  var Pjax = function() {
    if ($.inArray('state', $.event.props) < 0)
      $.event.props.push('state');

    // Initialize state for initial page load
    window.history.replaceState({ pjax: true }, null, document.location.href);

    document.addEventListener('click', installClickHandlers, true);
    $(window).on('popstate', handlePopState);
  }

  function installClickHandlers() {
    $(document).off('click', handleClick);
    $(document).on('click', 'a', handleClick);
  }

  function handleClick(e) {
    var link = e.currentTarget;

    // Ignore if previous handler disabled default action
    if (e.isDefaultPrevented())
      return;

    // Ignore no pjax links
    if ($(link).data('no-pjax'))
      return;

    // Middle click, cmd click, and ctrl click should open
    // links in a new tab as normal.
    if (e.which > 1 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
      return;

    // Ignore cross origin links
    if (location.protocol !== link.protocol || location.host !== link.host)
      return;

    // Ignore anchors on the same page
    if (link.hash && link.href.replace(link.hash, '') ===
        location.href.replace(location.hash, ''))
      return;

    // Ignore empty anchor "foo.html#"
    if (link.href === location.href + '#')
      return;

    window.scrollTo(0, 0);
    cachePush(location.href, $('html').html());
    window.history.pushState({ pjax: true }, null, link.href);
    handleRemote(link.href);

    e.preventDefault();
  }

  function handlePopState(e) {
    if (e.state && e.state.pjax) {
      handleRemote(document.location.href);
    }
  }

  function handleRemote(href) {
    var content = cachePop(href)
    if (content) {
      replaceDocument(content)
    } else {
      $(document).trigger('pjax:beforeSend');
    }

    var xhr = Pjax.xhr;
    if (xhr && xhr.readyState < 4) {
      xhr.onreadystatechange = $.noop;
      xhr.abort();
    }

    Pjax.xhr = $.ajax({
      url: href,
      dataType: 'html',
      type: 'GET',
      success: function(data) {
        replaceDocument(data)
      }
    });
  }

  function replaceDocument(data) {
    var doc = createDocument(data);

    $('body').replaceWith(doc.body);
    document.title = doc.title;
    $(document).trigger('pjax:page:change');
  }

  var createDocument = (function() {
    var createDocUsingParser = function(html) {
      var doc = (new DOMParser).parseFromString(html, 'text/html');
      return doc;
    };

    var createDocUsingWrite = function(html) {
      var doc = document.implementation.createHTMLDocument("");
      doc.open("replace");
      doc.write(html);
      doc.close;
      return doc;
    };

    if (window.DOMParser)
      var testDoc = createDocUsingParser("<html><body><p>test");

    var _ref;
    if ((testDoc != null ? (_ref = testDoc.body) != null ? _ref.childNodes.length : void 0 : void 0) === 1) {
      return createDocUsingParser;
    } else {
      return createDocUsingWrite;
    }
  })();

  function cachePush(id, content) {
    var idx = cacheEntries.indexOf(id);
    if (idx > -1) cacheEntries.splice(idx, 1);

    if (cacheEntries.length >= $.pjax.maxCacheLength) {
      var last = cacheEntries.shift();
      delete cache[last];
    }

    cacheEntries.push(id);
    cache[id] = content;
  }

  function cachePop(id) {
    var idx = cacheEntries.indexOf(id);
    if (idx > -1) cacheEntries.splice(idx, 1);

    var content = cache[id];
    if (content) delete cache[id];

    return content;
  }

  $.pjax = { maxCacheLength: 30 };

  if (window.history && window.history.pushState && window.history.replaceState)
    new Pjax;
})(window.jQuery);
