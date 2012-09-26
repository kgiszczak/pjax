(function () {
  var cache = {};
  var cacheEntries = [];

  var Pjax = function(element) {
    this.$element = $(element);

    if ($.inArray('state', $.event.props) < 0)
      $.event.props.push('state');

    // Initialize state for initial page load
    window.history.replaceState({ pjax: true }, null, document.location.href);

    var target = 'a:not([data-remote]):not([data-no-pjax])';
    $(document).on('click', target, $.proxy(handleClick, this));
    $(window).on('popstate', $.proxy(handlePopState, this));
  }

  function handleClick(e) {
    var link = e.currentTarget;

    // Middle click, cmd click, and ctrl click should open
    // links in a new tab as normal.
    if (e.which > 1 || e.metaKey || e.ctrlKey)
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

    cachePush(location.href, this.$element.html());
    window.history.pushState({ pjax: true }, null, link.href);
    handleRemote(link.href, this.$element);

    e.preventDefault();
  }

  function handlePopState(e) {
    if (e.state && e.state.pjax) {
      handleRemote(document.location.href, this.$element);
    }
  }

  function handleRemote(href, container) {
    var content = cachePop(href)
    if (content) {
      container.html(content);
      setTitle(container);
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
      data: { _pjax: true },
      beforeSend: function(xhr) {
        xhr.setRequestHeader('X-PJAX', true);
      },
      success: function(data) {
        container.html(data);
        setTitle(container);
        $(document).trigger('pjax:page:change');
      }
    });
  }

  function setTitle(container) {
    var title = container.find('[data-title]').data('title');
    if (title) document.title = title;
  }

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

  $.pjax = function(container) {
    if (window.history && window.history.pushState && window.history.replaceState)
      window.pjax || (window.pjax = new Pjax(container));
  }

  $.pjax.maxCacheLength = 30;
})(window.jQuery);
