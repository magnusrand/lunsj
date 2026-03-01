// Minimap on canteen detail page
(function () {
  var el = document.getElementById("minimap");
  if (!el) return;

  var lat = parseFloat(el.dataset.lat);
  var lon = parseFloat(el.dataset.lon);
  if (isNaN(lat) || isNaN(lon)) return;

  var map = new maplibregl.Map({
    container: "minimap",
    style: "https://tiles.openfreemap.org/styles/bright",
    center: [lon, lat],
    zoom: 15,
    interactive: false,
    attributionControl: false,
  });

  new maplibregl.Marker({ color: "#5B7553" })
    .setLngLat([lon, lat])
    .addTo(map);
})();

// Full map on /kart page
(function () {
  var el = document.getElementById("fullmap");
  if (!el) return;

  var canteens = el.dataset.canteens ? JSON.parse(decodeURIComponent(el.dataset.canteens)) : [];
  var focus = el.dataset.focus ? JSON.parse(decodeURIComponent(el.dataset.focus)) : null;

  var center = focus ? [focus.lon, focus.lat] : [10.4, 63.4];
  var zoom = focus ? 15 : 5;

  var map = new maplibregl.Map({
    container: "fullmap",
    style: "https://tiles.openfreemap.org/styles/bright",
    center: center,
    zoom: zoom,
    attributionControl: true,
  });

  map.addControl(new maplibregl.NavigationControl(), "top-right");

  var bounds = new maplibregl.LngLatBounds();
  var focusMarker = null;

  canteens.forEach(function (c) {
    var stars = c.averageRating ? c.averageRating.toFixed(1) : "—";
    var name = c.canteenName || c.street;
    var address = c.street + ", " + c.postalCode + " " + c.city;

    var html =
      '<div class="map-popup">' +
        '<strong class="map-popup-name">' + escapeHtml(name) + "</strong>" +
        '<span class="map-popup-address">' + escapeHtml(address) + "</span>" +
        '<span class="map-popup-rating">' + stars + " / 5 &middot; " + c.totalReviews + " anmeldelse" + (c.totalReviews !== 1 ? "r" : "") + "</span>" +
        '<a class="map-popup-link" href="/kantine/' + encodeURIComponent(c.addressKey) + '">Se kantinen &rarr;</a>' +
      "</div>";

    var popup = new maplibregl.Popup({ offset: 25 }).setHTML(html);

    var marker = new maplibregl.Marker({ color: "#5B7553" })
      .setLngLat([c.lon, c.lat])
      .setPopup(popup)
      .addTo(map);

    bounds.extend([c.lon, c.lat]);

    if (focus && c.addressKey === focus.addressKey) {
      focusMarker = marker;
    }
  });

  if (focusMarker) {
    focusMarker.togglePopup();
  } else if (canteens.length > 1) {
    map.fitBounds(bounds, { padding: 50, maxZoom: 13 });
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
})();
